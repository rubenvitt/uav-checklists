import { useState } from 'react'
import { PiMapPinArea, PiWarning, PiCheck, PiX } from 'react-icons/pi'

interface RelocationConfirmDialogProps {
  open: boolean
  segmentNumber: number
  onConfirm: (label: string) => void
  onCancel: () => void
}

const resetItems = [
  'Standort & Karte',
  'Wetterdaten',
  'Umgebungsprüfung',
  'Fluganmeldungen',
  'SORA-Risikoklasse',
  'Aufstiegsort',
  'Flugbriefing',
  'Funktionskontrolle & Freigabe',
  'Einsatzkarte',
]

const keepItems = [
  'Drohnenauswahl & Höhe',
  'Besatzung',
  'UAV-Check',
  'RC-Check',
]

export default function RelocationConfirmDialog({ open, segmentNumber, onConfirm, onCancel }: RelocationConfirmDialogProps) {
  const [label, setLabel] = useState(`Standort ${segmentNumber}`)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div
        className="w-full max-w-2xl rounded-t-2xl bg-surface px-5 pb-6 pt-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Titel */}
        <div className="mb-4 flex items-center gap-2">
          <PiMapPinArea className="text-lg text-caution" />
          <h2 className="text-base font-semibold text-text">Standort verlegen</h2>
          <button onClick={onCancel} className="ml-auto text-text-muted">
            <PiX className="text-lg" />
          </button>
        </div>

        {/* Label Input */}
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-text-muted">Bezeichnung des neuen Standorts</span>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full rounded-lg border border-surface-alt bg-base px-3 py-2 text-sm text-text outline-none focus:border-caution"
          />
        </label>

        {/* Wird zurückgesetzt */}
        <div className="mb-3 rounded-lg bg-caution-bg p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-caution">
            <PiWarning className="text-sm" />
            Wird zurückgesetzt
          </p>
          <ul className="space-y-1">
            {resetItems.map(item => (
              <li key={item} className="flex items-center gap-2 text-xs text-caution">
                <PiWarning className="shrink-0 text-[10px]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Bleibt erhalten */}
        <div className="mb-5 rounded-lg bg-good-bg p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-good">
            <PiCheck className="text-sm" />
            Bleibt erhalten
          </p>
          <ul className="space-y-1">
            {keepItems.map(item => (
              <li key={item} className="flex items-center gap-2 text-xs text-good">
                <PiCheck className="shrink-0 text-[10px]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onConfirm(label)}
            className="flex items-center gap-1.5 rounded-lg bg-caution px-4 py-2 text-sm font-medium text-white"
          >
            <PiMapPinArea className="text-sm" />
            Standort verlegen
          </button>
        </div>
      </div>
    </div>
  )
}
