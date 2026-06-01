import { useState } from 'react'
import {
  PiSealCheck,
  PiFilePdf,
  PiArchive,
  PiDownloadSimple,
  PiWarningCircle,
  PiCircleNotch,
  PiCheckCircle,
} from 'react-icons/pi'
import { signPdf, archivePdf, downloadArchive, type SignReceipt } from '../services/signApi'
import { downloadPdf } from '../utils/generateReport'
import { useMissionPersistedState } from '../hooks/useMissionPersistedState'

interface DigitalSignaturePanelProps {
  /** Produces the final mission PDF (blob + filename), or undefined if unavailable. */
  getReport: () => { blob: Blob; filename: string } | undefined
}

type SignState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'signed'; blob: Blob; filename: string; receipt: SignReceipt; archived: boolean }
  | { status: 'error'; message: string }

/**
 * A mission's document that was sealed AND archived. Persisted per mission so a
 * later visit can offer "download from archive" instead of re-signing. The PDF
 * itself is not persisted — regenerating it would yield a different timestamp
 * (and thus a different hash), so the archive holds the canonical copy.
 */
interface ArchivedReceipt {
  docHash: string
  signerName?: string
  createdAt: string
  filename: string
  archivedAt: string
}

function shortHash(h: string): string {
  return h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE')
  } catch {
    return iso
  }
}

/**
 * Phase 3 e-signature UI: cryptographically seal the finished mission PDF
 * (hash registry), download the sealed copy, and optionally archive it.
 * Rendered only when logged in (the caller gates on auth). Verifying an uploaded
 * PDF lives on the overview page ({@link SignatureVerifyPanel}) and needs no login.
 *
 * Once a mission's document has been archived, the seal/sign action is replaced
 * by "download from archive" (the backend authorizes the original signer) so the
 * same document is never signed twice.
 */
export default function DigitalSignaturePanel({ getReport }: DigitalSignaturePanelProps) {
  const [sign, setSign] = useState<SignState>({ status: 'idle' })
  const [archiving, setArchiving] = useState(false)
  const [archivedReceipt, setArchivedReceipt] = useMissionPersistedState<ArchivedReceipt | null>(
    'esign:archived',
    null,
  )
  const [download, setDownload] = useState<{ status: 'idle' | 'working'; error?: string }>({
    status: 'idle',
  })

  async function handleSign() {
    const report = getReport()
    if (!report) {
      setSign({ status: 'error', message: 'Das PDF konnte nicht erzeugt werden.' })
      return
    }
    setSign({ status: 'working' })
    const receipt = await signPdf(report.blob)
    if (!receipt) {
      setSign({ status: 'error', message: 'Signierung fehlgeschlagen. Backend erreichbar und angemeldet?' })
      return
    }
    setSign({ status: 'signed', blob: report.blob, filename: report.filename, receipt, archived: false })
  }

  function handleDownloadSigned() {
    if (sign.status !== 'signed') return
    downloadPdf(sign.blob, sign.filename)
  }

  async function handleArchive() {
    if (sign.status !== 'signed') return
    setArchiving(true)
    const res = await archivePdf(sign.blob, sign.filename)
    setArchiving(false)
    if (res?.archived) {
      setSign({ ...sign, archived: true })
      // Persist the mission→archive link so a later visit downloads the archived
      // copy instead of re-signing. The doc hash binds it to that exact PDF.
      setArchivedReceipt({
        docHash: sign.receipt.docHash,
        signerName: sign.receipt.signer.name,
        createdAt: sign.receipt.createdAt,
        filename: sign.filename,
        archivedAt: res.archivedAt ?? new Date().toISOString(),
      })
    }
  }

  async function handleArchiveDownload() {
    if (!archivedReceipt) return
    setDownload({ status: 'working' })
    const ok = await downloadArchive(archivedReceipt.docHash, archivedReceipt.filename)
    setDownload(
      ok
        ? { status: 'idle' }
        : { status: 'idle', error: 'Download aus dem Archiv fehlgeschlagen. Angemeldet und berechtigt?' },
    )
  }

  function handleResign() {
    setArchivedReceipt(null)
    setSign({ status: 'idle' })
    setDownload({ status: 'idle' })
  }

  return (
    <div className="rounded-xl border border-text-muted/15 bg-surface p-4 space-y-4">
      <div className="flex items-center gap-2">
        <PiSealCheck className="text-lg text-text-muted" />
        <p className="text-sm font-medium text-text">Elektronische Signatur</p>
      </div>
      <p className="text-xs text-text-muted/80">
        Versiegelt das Abschlussdokument serverseitig (Integrität &amp; Urheberschaft). Das PDF bleibt
        unverändert; die Signatur wird im Register hinterlegt und kann später geprüft werden.
      </p>

      {archivedReceipt ? (
        /* Already sealed & archived: offer the canonical archived copy instead
           of signing the (now differently-timestamped) document again. */
        <div className="space-y-2">
          <div className="rounded-lg bg-good-bg p-3 space-y-2 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-good">
              <PiArchive className="shrink-0" />
              Bereits signiert &amp; im Archiv abgelegt
            </p>
            <p className="text-text-muted">
              Signiert von {archivedReceipt.signerName || '—'} am {formatTs(archivedReceipt.createdAt)}
            </p>
            <p className="text-text-muted/70 break-all">Dokument-Hash: {shortHash(archivedReceipt.docHash)}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleArchiveDownload}
                disabled={download.status === 'working'}
                className="flex items-center gap-1.5 rounded-md bg-text px-2.5 py-1.5 font-medium text-base transition-colors active:scale-[0.99] disabled:opacity-50"
              >
                {download.status === 'working' ? (
                  <PiCircleNotch className="animate-spin" />
                ) : (
                  <PiDownloadSimple />
                )}
                Aus Archiv herunterladen
              </button>
            </div>
            {download.error && (
              <p className="flex items-center gap-1.5 text-warning">
                <PiWarningCircle className="shrink-0" /> {download.error}
              </p>
            )}
          </div>
          <button
            onClick={handleResign}
            className="text-xs text-text-muted/70 underline underline-offset-2 transition-colors hover:text-text-muted"
          >
            Dokument hat sich geändert? Neu signieren
          </button>
        </div>
      ) : (
        /* Signieren */
        <div className="space-y-2">
          <button
            onClick={handleSign}
            disabled={sign.status === 'working'}
            className="flex items-center gap-2 rounded-lg bg-text px-3 py-2 text-sm font-medium text-base transition-colors active:scale-[0.99] disabled:opacity-50"
          >
            {sign.status === 'working' ? <PiCircleNotch className="animate-spin" /> : <PiSealCheck />}
            Dokument signieren
          </button>

          {sign.status === 'error' && (
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <PiWarningCircle className="shrink-0" /> {sign.message}
            </p>
          )}

          {sign.status === 'signed' && (
            <div className="rounded-lg bg-good-bg p-3 space-y-2 text-xs">
              <p className="flex items-center gap-1.5 font-medium text-good">
                <PiCheckCircle className="shrink-0" />
                Signiert von {sign.receipt.signer.name || sign.receipt.signer.sub}
              </p>
              <p className="text-text-muted">am {formatTs(sign.receipt.createdAt)}</p>
              <p className="text-text-muted/70 break-all">Dokument-Hash: {shortHash(sign.receipt.docHash)}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleDownloadSigned}
                  className="flex items-center gap-1.5 rounded-md bg-surface-alt px-2.5 py-1.5 text-text transition-colors hover:bg-surface"
                >
                  <PiFilePdf /> Signiertes PDF herunterladen
                </button>
                {!sign.archived ? (
                  <button
                    onClick={handleArchive}
                    disabled={archiving}
                    className="flex items-center gap-1.5 rounded-md bg-surface-alt px-2.5 py-1.5 text-text transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    {archiving ? <PiCircleNotch className="animate-spin" /> : <PiArchive />} Ins Archiv ablegen
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-good">
                    <PiCheckCircle /> Im Archiv abgelegt
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
