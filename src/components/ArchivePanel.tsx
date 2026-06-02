import { useEffect, useState } from 'react'
import {
  PiArchive,
  PiArrowCounterClockwise,
  PiArrowsClockwise,
  PiCircleNotch,
  PiDownloadSimple,
  PiFilePdf,
  PiTrash,
  PiUserCircle,
  PiWarningCircle,
  PiX,
} from 'react-icons/pi'
import {
  deleteArchive,
  downloadArchive,
  listArchive,
  listDeletedArchive,
  purgeArchive,
  restoreArchive,
  type ArchiveEntry,
  type DeletedArchiveEntry,
} from '../services/signApi'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: ArchiveEntry[]; deleted: DeletedArchiveEntry[] }

function formatTs(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('de-DE')
  } catch {
    return iso
  }
}

function shortHash(h: string): string {
  return h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h
}

/**
 * Admin-only archive viewer + management. Lists active server-archived mission
 * reports (download), supports soft-delete with an optional reason (recorded in
 * the signed audit log), and a "Gelöscht" recycle bin where entries can be
 * restored or permanently purged. Deletions never touch the signing registry,
 * so a held PDF still verifies — only the archived copy is affected.
 *
 * The caller gates rendering on `configured && isAuthenticated && isAdmin`.
 */
export default function ArchivePanel() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [downloading, setDownloading] = useState<string | null>(null)
  // Bumped to trigger a (re)load; the effect owns the actual fetch + state.
  const [reloadKey, setReloadKey] = useState(0)

  // Soft-delete confirmation: which entry is awaiting confirmation + its reason.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  // Permanent-purge confirmation: click-twice within 3s (like local purge).
  const [confirmPurge, setConfirmPurge] = useState<string | null>(null)
  // Which entry currently has a mutation in flight (disables its buttons).
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listArchive(), listDeletedArchive()]).then(([entries, deleted]) => {
      if (!active) return
      // A null active list means the request failed (error state); the deleted
      // list is secondary and falls back to empty on its own failure.
      setState(
        entries === null
          ? { status: 'error' }
          : { status: 'ready', entries, deleted: deleted ?? [] },
      )
    })
    return () => {
      active = false
    }
  }, [reloadKey])

  // Auto-dismiss the purge confirmation after 3s of inactivity.
  useEffect(() => {
    if (confirmPurge === null) return
    const timer = setTimeout(() => setConfirmPurge(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmPurge])

  // Clear any armed confirmation on every reload: after the list changes, a
  // lingering confirmDelete/confirmPurge could otherwise fire on a row that has
  // shifted position or no longer exists.
  function reload() {
    setConfirmDelete(null)
    setConfirmPurge(null)
    setReason('')
    setReloadKey((k) => k + 1)
  }

  // Full reload with the loading spinner (manual refresh button).
  function refresh() {
    setState({ status: 'loading' })
    reload()
  }

  async function handleDownload(entry: ArchiveEntry) {
    setDownloading(entry.docHash)
    await downloadArchive(entry.docHash, entry.filename ?? undefined)
    setDownloading(null)
  }

  async function handleSoftDelete(docHash: string) {
    setBusy(docHash)
    const ok = await deleteArchive(docHash, reason)
    setBusy(null)
    setConfirmDelete(null)
    setReason('')
    if (ok) reload()
  }

  async function handleRestore(docHash: string) {
    setBusy(docHash)
    const ok = await restoreArchive(docHash)
    setBusy(null)
    if (ok) reload()
  }

  async function handlePurge(docHash: string) {
    // First click arms confirmation; second click (same entry) purges.
    if (confirmPurge !== docHash) {
      setConfirmPurge(docHash)
      return
    }
    setConfirmPurge(null)
    setBusy(docHash)
    const ok = await purgeArchive(docHash)
    setBusy(null)
    if (ok) reload()
  }

  return (
    <div className="rounded-xl border border-text-muted/15 bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PiArchive className="text-lg text-text-muted" />
          <p className="text-sm font-medium text-text">Archiv</p>
        </div>
        <button
          onClick={refresh}
          disabled={state.status === 'loading'}
          className="flex items-center gap-1.5 rounded-md bg-surface-alt px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-50"
          aria-label="Archiv aktualisieren"
          title="Aktualisieren"
        >
          <PiArrowsClockwise className={state.status === 'loading' ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
      </div>

      <p className="text-xs text-text-muted/80">
        Serverseitig archivierte, signierte Abschlussdokumente. Nur für Administratoren sichtbar.
      </p>

      {state.status === 'loading' && (
        <p className="flex items-center gap-2 py-4 text-sm text-text-muted">
          <PiCircleNotch className="animate-spin shrink-0" />
          Archiv wird geladen…
        </p>
      )}

      {state.status === 'error' && (
        <p className="flex items-center gap-1.5 py-4 text-sm text-warning">
          <PiWarningCircle className="shrink-0" />
          Archiv konnte nicht geladen werden. Backend erreichbar und Administratorrechte vorhanden?
        </p>
      )}

      {state.status === 'ready' && state.entries.length === 0 && state.deleted.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <PiArchive className="text-3xl text-text-muted" />
          <p className="text-sm text-text-muted">Noch keine archivierten Dokumente.</p>
        </div>
      )}

      {state.status === 'ready' && state.entries.length > 0 && (
        <ul className="space-y-2">
          {state.entries.map((entry) => (
            <li key={entry.docHash} className="rounded-lg bg-surface-alt p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-text truncate">
                    <PiFilePdf className="shrink-0 text-text-muted" />
                    <span className="truncate" title={entry.filename ?? entry.docHash}>
                      {entry.filename ?? shortHash(entry.docHash)}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-text-muted">
                    <PiUserCircle className="shrink-0" />
                    {entry.signer ?? 'Unbekannt'}
                    <span className="text-text-muted/70">· signiert {formatTs(entry.signedAt)}</span>
                  </p>
                  <p className="text-xs text-text-muted/70">Archiviert am {formatTs(entry.archivedAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => handleDownload(entry)}
                    disabled={downloading === entry.docHash}
                    className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-sm text-text transition-colors hover:bg-surface-alt disabled:opacity-50"
                    aria-label="PDF herunterladen"
                    title="PDF herunterladen"
                  >
                    {downloading === entry.docHash ? (
                      <PiCircleNotch className="animate-spin" />
                    ) : (
                      <PiDownloadSimple />
                    )}
                    Laden
                  </button>
                  {confirmDelete !== entry.docHash && (
                    <button
                      onClick={() => {
                        setConfirmDelete(entry.docHash)
                        setReason('')
                      }}
                      className="flex items-center justify-center rounded-md bg-surface p-2 text-text-muted transition-colors hover:bg-warning/10 hover:text-warning"
                      aria-label="Einsatz aus Archiv löschen"
                      title="Aus Archiv löschen"
                    >
                      <PiTrash />
                    </button>
                  )}
                </div>
              </div>

              {confirmDelete === entry.docHash && (
                <div className="mt-3 space-y-2 rounded-md border border-warning/30 bg-warning/5 p-2.5">
                  <p className="text-xs text-text-muted">
                    Eintrag in den Papierkorb verschieben? Wiederherstellbar bis zum endgültigen Löschen. Die
                    Signatur im Register bleibt erhalten.
                  </p>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Grund (optional, im Audit-Log gespeichert)"
                    maxLength={500}
                    className="w-full rounded-md border border-text-muted/20 bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted/60 focus:border-warning/50 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        setConfirmDelete(null)
                        setReason('')
                      }}
                      disabled={busy === entry.docHash}
                      className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50"
                    >
                      <PiX />
                      Abbrechen
                    </button>
                    <button
                      onClick={() => handleSoftDelete(entry.docHash)}
                      disabled={busy === entry.docHash}
                      className="flex items-center gap-1.5 rounded-md bg-warning px-2.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {busy === entry.docHash ? <PiCircleNotch className="animate-spin" /> : <PiTrash />}
                      Löschen
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {state.status === 'ready' && state.deleted.length > 0 && (
        <details className="rounded-lg border border-text-muted/15 bg-surface-alt/50">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm text-text-muted">
            Gelöscht ({state.deleted.length})
          </summary>
          <ul className="space-y-2 p-3 pt-1">
            {state.deleted.map((entry) => (
              <li key={entry.docHash} className="flex items-start justify-between gap-3 rounded-lg bg-surface p-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-text truncate">
                    <PiFilePdf className="shrink-0 text-text-muted" />
                    <span className="truncate" title={entry.filename ?? entry.docHash}>
                      {entry.filename ?? shortHash(entry.docHash)}
                    </span>
                  </p>
                  <p className="text-xs text-text-muted/70">Gelöscht am {formatTs(entry.deletedAt)}</p>
                  {entry.reason && (
                    <p className="text-xs text-text-muted">
                      Grund: <span className="text-text">{entry.reason}</span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => handleRestore(entry.docHash)}
                    disabled={busy === entry.docHash}
                    className="flex items-center gap-1.5 rounded-md bg-surface-alt px-2.5 py-1.5 text-sm text-text transition-colors hover:bg-surface disabled:opacity-50"
                    aria-label="Wiederherstellen"
                    title="Wiederherstellen"
                  >
                    {busy === entry.docHash ? (
                      <PiCircleNotch className="animate-spin" />
                    ) : (
                      <PiArrowCounterClockwise />
                    )}
                    Zurück
                  </button>
                  <button
                    onClick={() => handlePurge(entry.docHash)}
                    disabled={busy === entry.docHash}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                      confirmPurge === entry.docHash
                        ? 'bg-warning text-white hover:opacity-90'
                        : 'bg-surface-alt text-text-muted hover:bg-warning/10 hover:text-warning'
                    }`}
                    aria-label="Endgültig löschen"
                    title={confirmPurge === entry.docHash ? 'Zum Bestätigen erneut klicken' : 'Endgültig löschen'}
                  >
                    <PiTrash />
                    {confirmPurge === entry.docHash ? 'Sicher?' : 'Endgültig'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
