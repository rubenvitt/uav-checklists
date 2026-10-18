import { PiArrowsLeftRight, PiX } from 'react-icons/pi'
import type { FmMission } from '../../types/suchlage'

interface TakeOverDialogProps {
  mission: FmMission | null
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

function formatDateTime(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
}

/** Rückfrage, bevor ein Einsatz übernommen wird, der mit einer anderen Flugmappe verknüpft ist. */
export default function TakeOverDialog({ mission, busy, onConfirm, onCancel }: TakeOverDialogProps) {
  if (!mission) return null
  const link = mission.link

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="takeover-title"
        className="w-full max-w-2xl border-t border-line bg-surface px-5 pt-5 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <PiArrowsLeftRight className="text-lg text-caution" />
          <h2 id="takeover-title" className="text-base font-semibold text-text">Einsatz übernehmen?</h2>
          <button onClick={onCancel} className="ml-auto flex h-11 w-11 items-center justify-center text-text-muted" aria-label="Schließen">
            <PiX className="text-lg" />
          </button>
        </div>

        <p className="text-sm text-text">
          „{mission.name}“ ist in Suchlage mit einer anderen Flugmappe verknüpft
          {link && (
            <>
              {' '}(von {link.linked_by}, <span className="num">{formatDateTime(link.linked_at_ms)}</span>)
            </>
          )}
          .
        </p>
        <div className="mt-3 border border-caution/40 bg-caution-bg p-3 text-xs text-caution">
          Nach dem Übernehmen bekommt die andere Flugmappe keine neuen Flüge mehr. Das ist richtig bei
          Gerätewechsel, Schichtwechsel oder verlorenen Browserdaten.
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="min-h-11 px-4 text-sm font-medium text-text-muted hover:text-text">
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex min-h-11 items-center gap-1.5 bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            <PiArrowsLeftRight className="text-sm" />
            {busy ? 'Wird übernommen …' : 'Übernehmen'}
          </button>
        </div>
      </div>
    </div>
  )
}
