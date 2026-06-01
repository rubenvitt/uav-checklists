import { useRef, useState } from 'react'
import {
  PiSealCheck,
  PiUploadSimple,
  PiShieldCheck,
  PiWarningCircle,
  PiCircleNotch,
  PiCaretDown,
} from 'react-icons/pi'
import { verifyPdf, type VerifyResult } from '../services/signApi'

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE')
  } catch {
    return iso
  }
}

type VerifyState =
  | { status: 'idle' }
  | { status: 'checking'; filename: string }
  | { status: 'done'; filename: string; result: VerifyResult }
  | { status: 'error'; filename: string }

/**
 * Public PDF-signature checker, shown only on the overview (main) page when a
 * signature backend is configured. Lives as a quiet, collapsed disclosure so it
 * stays out of the way until needed. Verification needs no login: it uploads a
 * PDF to the public `POST /verify` endpoint and reports whether the document is
 * registered and unaltered.
 */
export default function SignatureVerifyPanel() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<VerifyState>({ status: 'idle' })
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleVerifyFile(file: File) {
    setState({ status: 'checking', filename: file.name })
    const result = await verifyPdf(file)
    setState(result ? { status: 'done', filename: file.name, result } : { status: 'error', filename: file.name })
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-xs font-medium text-text-muted/70 transition-colors hover:text-text"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <PiSealCheck className="text-sm" />
          Signatur prüfen
        </span>
        <PiCaretDown className={`text-sm transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-3 px-1">
          <p className="text-xs text-text-muted/80">
            Lade ein PDF hoch, um zu prüfen, ob es im Signatur-Register hinterlegt und unverändert ist.
            Eine Anmeldung ist dafür nicht nötig.
          </p>

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
            disabled={state.status === 'checking'}
            className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-surface-alt disabled:opacity-50"
          >
            {state.status === 'checking' ? <PiCircleNotch className="animate-spin" /> : <PiUploadSimple />}
            PDF hochladen &amp; prüfen
          </button>

          {state.status === 'done' &&
            (state.result.valid ? (
              <div className="rounded-lg bg-good-bg p-3 text-xs space-y-1">
                <p className="flex items-center gap-1.5 font-medium text-good">
                  <PiShieldCheck className="shrink-0" /> Gültige Signatur
                </p>
                <p className="text-text-muted">
                  Signiert von {state.result.signer?.name || state.result.signer?.sub} am{' '}
                  {state.result.createdAt ? formatTs(state.result.createdAt) : '—'}
                </p>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <PiWarningCircle className="shrink-0" /> Ungültig oder nicht im Register ({state.filename})
              </p>
            ))}

          {state.status === 'error' && (
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <PiWarningCircle className="shrink-0" /> Prüfung fehlgeschlagen — Backend nicht erreichbar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
