import { useEffect, useState } from 'react'
import {
  PiArchive,
  PiArrowsClockwise,
  PiCircleNotch,
  PiDownloadSimple,
  PiFilePdf,
  PiUserCircle,
  PiWarningCircle,
} from 'react-icons/pi'
import { listArchive, downloadArchive, type ArchiveEntry } from '../services/signApi'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: ArchiveEntry[] }

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
 * Admin-only archive viewer: lists the server-archived mission reports (signer,
 * signature date, filename) newest first, each with a download button. The
 * caller gates rendering on `configured && isAuthenticated && isAdmin`.
 *
 * `listArchive()` returns `null` on error and `[]` on an empty archive, which
 * maps to the distinct error vs. empty states below.
 */
export default function ArchivePanel() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [downloading, setDownloading] = useState<string | null>(null)
  // Bumped to trigger a (re)load; the effect owns the actual fetch + state.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    listArchive().then((entries) => {
      if (!active) return
      setState(entries === null ? { status: 'error' } : { status: 'ready', entries })
    })
    return () => {
      active = false
    }
  }, [reloadKey])

  // Re-run the fetch. The loading spinner is shown for the manual refresh by
  // resetting state in this event handler (allowed) rather than in the effect.
  function load() {
    setState({ status: 'loading' })
    setReloadKey((k) => k + 1)
  }

  async function handleDownload(entry: ArchiveEntry) {
    setDownloading(entry.docHash)
    await downloadArchive(entry.docHash, entry.filename ?? undefined)
    setDownloading(null)
  }

  return (
    <div className="rounded-xl border border-text-muted/15 bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PiArchive className="text-lg text-text-muted" />
          <p className="text-sm font-medium text-text">Archiv</p>
        </div>
        <button
          onClick={load}
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

      {state.status === 'ready' && state.entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <PiArchive className="text-3xl text-text-muted" />
          <p className="text-sm text-text-muted">Noch keine archivierten Dokumente.</p>
        </div>
      )}

      {state.status === 'ready' && state.entries.length > 0 && (
        <ul className="space-y-2">
          {state.entries.map((entry) => (
            <li
              key={entry.docHash}
              className="flex items-start justify-between gap-3 rounded-lg bg-surface-alt p-3"
            >
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
                <p className="text-xs text-text-muted/70">
                  Archiviert am {formatTs(entry.archivedAt)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(entry)}
                disabled={downloading === entry.docHash}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-sm text-text transition-colors hover:bg-surface-alt disabled:opacity-50"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
