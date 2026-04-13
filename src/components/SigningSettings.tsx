import { useEffect, useRef, useState } from 'react'
import { PiSealCheck, PiFloppyDisk, PiTrash } from 'react-icons/pi'
import { getSigningSettings, setSigningSettings, clearSigningSettings, isSigningConfigured } from '../services/signingApi'

export default function SigningSettings() {
  const [url, setUrl] = useState(() => getSigningSettings()?.backendUrl ?? '')
  const [configured, setConfigured] = useState(() => isSigningConfigured())
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => { clearTimeout(savedTimerRef.current) }
  }, [])

  const handleSave = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setSigningSettings({ backendUrl: trimmed })
    setConfigured(true)
    setSaved(true)
    clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    clearSigningSettings()
    setUrl('')
    setConfigured(false)
    setSaved(false)
  }

  return (
    <div className="rounded-xl bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PiSealCheck className="text-lg text-text-muted" />
        <h3 className="text-sm font-medium text-text">PDF-Signatur</h3>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
          configured
            ? 'bg-good-bg text-good'
            : 'bg-surface-alt text-text-muted'
        }`}>
          {configured ? 'Konfiguriert' : 'Nicht konfiguriert'}
        </span>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-text-muted" htmlFor="signing-url">
          Backend-URL
        </label>
        <input
          id="signing-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:3001"
          className="w-full rounded-lg border border-surface-alt bg-base px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-text/20"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!url.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-text px-3 py-2 text-sm font-medium text-base transition-colors hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
        >
          <PiFloppyDisk className="text-base" />
          {saved ? 'Gespeichert' : 'Speichern'}
        </button>
        {configured && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm font-medium text-warning transition-colors hover:opacity-90 active:scale-95"
          >
            <PiTrash className="text-base" />
            Entfernen
          </button>
        )}
      </div>
    </div>
  )
}
