import { useEffect, useRef, useState } from 'react'
import { PiFloppyDisk, PiTrash, PiCheckCircle, PiUserCircle } from 'react-icons/pi'
import SignaturePad from './SignaturePad'
import {
  getStoredSignature,
  putStoredSignature,
  deleteStoredSignature,
} from '../services/signApi'

interface StoredSignaturePanelProps {
  /** Notifies the parent when the stored signature changes (load/save/delete). */
  onStoredSignatureChange?: (dataUrl: string | null) => void
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Management UI for the user's single server-stored personal signature.
 * Rendered only when logged in (the caller gates on auth). Loads the stored
 * signature via `GET /me/signature`, lets the user draw and save it via
 * `PUT /me/signature`, and remove it via `DELETE /me/signature`.
 */
export default function StoredSignaturePanel({ onStoredSignatureChange }: StoredSignaturePanelProps) {
  const [draft, setDraft] = useState('')
  const [hasStored, setHasStored] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const onChangeRef = useRef(onStoredSignatureChange)

  useEffect(() => {
    onChangeRef.current = onStoredSignatureChange
  })

  // Load the existing stored signature once on mount.
  useEffect(() => {
    let active = true
    getStoredSignature().then((dataUrl) => {
      if (!active) return
      if (dataUrl) {
        setDraft(dataUrl)
        setHasStored(true)
        onChangeRef.current?.(dataUrl)
      } else {
        onChangeRef.current?.(null)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function handleSave() {
    if (!draft.trim()) return
    setStatus('saving')
    const ok = await putStoredSignature(draft)
    if (ok) {
      setHasStored(true)
      setStatus('saved')
      onChangeRef.current?.(draft)
    } else {
      setStatus('error')
    }
  }

  async function handleDelete() {
    setStatus('saving')
    const ok = await deleteStoredSignature()
    if (ok) {
      setDraft('')
      setHasStored(false)
      setStatus('idle')
      onChangeRef.current?.(null)
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="rounded-lg border border-text-muted/15 bg-surface-alt/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <PiUserCircle className="text-sm text-text-muted" />
        <p className="text-xs font-medium text-text-muted">Meine gespeicherte Signatur</p>
        {hasStored && <span className="h-1.5 w-1.5 rounded-full bg-good" />}
      </div>
      <p className="text-[0.7rem] text-text-muted/70">
        Wird serverseitig an dein Konto gebunden und geräteübergreifend
        wiederverwendet.
      </p>

      <SignaturePad label="Signatur zeichnen" value={draft} onChange={setDraft} />

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={!draft.trim() || status === 'saving'}
          className="flex items-center gap-1.5 rounded-lg bg-good/10 px-3 py-1.5 text-xs font-medium text-good transition-colors hover:bg-good/20 disabled:opacity-40 disabled:hover:bg-good/10"
        >
          <PiFloppyDisk className="text-sm" />
          Speichern
        </button>
        {hasStored && (
          <button
            onClick={handleDelete}
            disabled={status === 'saving'}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-warning hover:bg-warning-bg disabled:opacity-40"
          >
            <PiTrash className="text-sm" />
            Entfernen
          </button>
        )}
        {status === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-good">
            <PiCheckCircle className="text-sm" />
            Gespeichert
          </span>
        )}
        {status === 'error' && (
          <span className="text-xs text-warning">Fehler beim Speichern</span>
        )}
      </div>
    </div>
  )
}
