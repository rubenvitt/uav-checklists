import { useRef, useState } from 'react'
import {
  PiSealCheck,
  PiFilePdf,
  PiArchive,
  PiShieldCheck,
  PiUploadSimple,
  PiWarningCircle,
  PiCircleNotch,
  PiCheckCircle,
} from 'react-icons/pi'
import { signPdf, verifyPdf, archivePdf, type SignReceipt, type VerifyResult } from '../services/signApi'
import { downloadPdf } from '../utils/generateReport'

interface DigitalSignaturePanelProps {
  /** Produces the final mission PDF (blob + filename), or undefined if unavailable. */
  getReport: () => { blob: Blob; filename: string } | undefined
}

type SignState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'signed'; blob: Blob; filename: string; receipt: SignReceipt; archived: boolean }
  | { status: 'error'; message: string }

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
 * (hash registry), download the sealed copy, optionally archive it, and verify
 * an uploaded PDF. Rendered only when logged in (the caller gates on auth).
 */
export default function DigitalSignaturePanel({ getReport }: DigitalSignaturePanelProps) {
  const [sign, setSign] = useState<SignState>({ status: 'idle' })
  const [archiving, setArchiving] = useState(false)
  const [verify, setVerify] = useState<{ status: 'idle' | 'checking'; result?: VerifyResult | null; filename?: string }>({
    status: 'idle',
  })
  const fileRef = useRef<HTMLInputElement>(null)

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
    const res = await archivePdf(sign.blob)
    setArchiving(false)
    if (res?.archived) setSign({ ...sign, archived: true })
  }

  async function handleVerifyFile(file: File) {
    setVerify({ status: 'checking', filename: file.name })
    const result = await verifyPdf(file)
    setVerify({ status: 'idle', result, filename: file.name })
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

      {/* Signieren */}
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

      {/* Verifizieren */}
      <div className="space-y-2 border-t border-text-muted/10 pt-3">
        <p className="text-xs font-medium text-text-muted">Signatur eines PDFs prüfen</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleVerifyFile(f)
            e.target.value = ''
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={verify.status === 'checking'}
          className="flex items-center gap-2 rounded-lg bg-surface-alt px-3 py-2 text-sm text-text transition-colors hover:bg-surface disabled:opacity-50"
        >
          {verify.status === 'checking' ? <PiCircleNotch className="animate-spin" /> : <PiUploadSimple />}
          PDF hochladen &amp; prüfen
        </button>

        {verify.status === 'idle' && verify.result && (
          verify.result.valid ? (
            <div className="rounded-lg bg-good-bg p-3 text-xs space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-good">
                <PiShieldCheck className="shrink-0" /> Gültige Signatur
              </p>
              <p className="text-text-muted">
                Signiert von {verify.result.signer?.name || verify.result.signer?.sub} am{' '}
                {verify.result.createdAt ? formatTs(verify.result.createdAt) : '—'}
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <PiWarningCircle className="shrink-0" /> Ungültig oder nicht im Register
              {verify.filename ? ` (${verify.filename})` : ''}
            </p>
          )
        )}
      </div>
    </div>
  )
}
