import { useState, useRef, type DragEvent } from 'react'
import { PiShieldCheck, PiShieldWarning, PiSpinner, PiUpload, PiX, PiSealCheck, PiClock, PiUser, PiWarning, PiArrowsClockwise, PiClockCountdown } from 'react-icons/pi'
import { verifyPdf, isSigningConfigured } from '../services/signingApi'
import type { VerificationResult, SignatureInfo } from '../types/signing'

export default function SignatureVerifier() {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isSigningConfigured()) return null

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Nur PDF-Dateien werden unterstützt.')
      return
    }
    setVerifying(true)
    setError(null)
    setResult(null)
    setFileName(file.name)
    try {
      const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' })
      const res = await verifyPdf(blob, file.name)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifizierung fehlgeschlagen.')
    } finally {
      setVerifying(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setFileName(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const dropZone = (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
        dragOver
          ? 'border-text/40 bg-surface-alt'
          : 'border-surface-alt hover:border-text/20 hover:bg-surface-alt/50'
      }`}
    >
      <PiUpload className="text-2xl text-text-muted" />
      <p className="text-xs text-text-muted text-center">
        PDF hierher ziehen oder klicken
      </p>
    </div>
  )

  return (
    <div className="rounded-xl bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PiShieldCheck className="text-lg text-text-muted" />
        <h3 className="text-sm font-medium text-text">Signatur prüfen</h3>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {!result && !verifying && !error && dropZone}

      {verifying && (
        <div className="flex items-center justify-center gap-2 py-6">
          <PiSpinner className="text-lg animate-spin text-text-muted" />
          <p className="text-sm text-text-muted">Signatur wird geprüft...</p>
        </div>
      )}

      {error && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-caution-bg p-3">
            <PiWarning className="mt-0.5 shrink-0 text-lg text-caution" />
            <div className="flex-1">
              <p className="text-sm text-caution">{error}</p>
            </div>
            <button onClick={handleReset} className="text-text-muted hover:text-text">
              <PiX className="text-base" />
            </button>
          </div>
          {dropZone}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 rounded-lg p-3 ${
            result.valid ? 'bg-good-bg' : 'bg-warning-bg'
          }`}>
            {result.valid
              ? <PiShieldCheck className="text-xl text-good" />
              : <PiShieldWarning className="text-xl text-warning" />
            }
            <div className="flex-1">
              <p className={`text-sm font-medium ${result.valid ? 'text-good' : 'text-warning'}`}>
                {result.valid ? 'Signatur gültig' : 'Signatur ungültig'}
              </p>
              <p className="text-xs text-text-muted">{fileName}</p>
            </div>
            <button onClick={handleReset} className="text-text-muted hover:text-text" title="Zurücksetzen">
              <PiX className="text-base" />
            </button>
          </div>

          {result.signatures.length === 0 && (
            <p className="text-xs text-text-muted px-1">Keine Signaturen in dieser PDF gefunden.</p>
          )}

          {result.signatures.filter(s => !s.isTimestamp).map((sig, i) => (
            <SignatureCard key={i} sig={sig} />
          ))}

          {result.signatures.some(s => s.isTimestamp) && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-text-muted px-1">Zeitstempel</p>
              {result.signatures.filter(s => s.isTimestamp).map((sig, i) => (
                <TimestampCard key={i} sig={sig} />
              ))}
            </div>
          )}

          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-alt py-2 text-xs text-text-muted transition-colors hover:bg-surface-alt/50"
          >
            <PiArrowsClockwise className="text-sm" />
            Andere PDF prüfen
          </button>
        </div>
      )}
    </div>
  )
}

function SignatureCard({ sig }: { sig: SignatureInfo }) {
  return (
    <div className="rounded-lg bg-base p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <PiUser className="text-sm text-text-muted" />
        <span className="text-sm text-text">{sig.signer}</span>
      </div>
      {sig.timestamp && (
        <div className="flex items-center gap-2">
          <PiClock className="text-sm text-text-muted" />
          <span className="text-xs text-text-muted">
            {new Date(sig.timestamp).toLocaleString('de-DE')}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <PiSealCheck className="text-sm text-text-muted" />
        <span className="text-xs text-text-muted">{sig.level}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <StatusBadge label="Intakt" ok={sig.intact} />
        <StatusBadge label="Gültig" ok={sig.valid} />
        <StatusBadge label="Vertrauenswürdig" ok={sig.trusted} />
      </div>
    </div>
  )
}

function TimestampCard({ sig }: { sig: SignatureInfo }) {
  return (
    <div className="rounded-lg bg-base/50 px-3 py-2 flex items-center gap-3">
      <PiClockCountdown className="text-base text-text-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted truncate">{sig.signer}</p>
        {sig.note && <p className="text-xs text-caution">{sig.note}</p>}
      </div>
      {sig.intact && sig.valid ? (
        <span className="shrink-0 rounded-full bg-good-bg px-2 py-0.5 text-xs font-medium text-good">{'\u2713'}</span>
      ) : (
        <span className="shrink-0 rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-muted">~</span>
      )}
    </div>
  )
}

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      ok ? 'bg-good-bg text-good' : 'bg-warning-bg text-warning'
    }`}>
      {ok ? '\u2713' : '\u2717'} {label}
    </span>
  )
}
