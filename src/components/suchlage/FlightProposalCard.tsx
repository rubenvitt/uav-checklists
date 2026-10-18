import { PiBroadcast, PiCheck, PiArrowsMerge } from 'react-icons/pi'
import type { FlightProposal } from '../../utils/suchlageFlights'
import { formatDistance } from '../../utils/suchlageReport'

interface FlightProposalCardProps {
  proposal: FlightProposal
  /** Beschriftung des Zusammenführens, z. B. „Mit Flug 2 zusammenführen“; `null` = bestätigen */
  mergeLabel: string | null
  /** Nein, wenn „Bestätigen“ einen zweiten offenen Flug erzeugen würde */
  canConfirm: boolean
  onConfirm: () => void
  onMerge: () => void
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/** Unbestätigter Eintrag: ein von Suchlage erkannter Flug, noch kein Teil des Flugbuchs. */
export default function FlightProposalCard({ proposal, mergeLabel, canConfirm, onConfirm, onMerge }: FlightProposalCardProps) {
  const { flight, running } = proposal
  const lost = flight.ended_at_ms !== null && flight.end_reason === 'connection_lost'
  const aircraft = flight.aircraft_label?.trim() || flight.aircraft_sn
  const facts = [
    aircraft,
    flight.max_elevation_m !== null ? `max. ${Math.round(flight.max_elevation_m)} m` : null,
    flight.distance_m !== null ? formatDistance(flight.distance_m) : null,
    flight.photo_count > 0 ? `${flight.photo_count} ${flight.photo_count === 1 ? 'Foto' : 'Fotos'}` : null,
  ].filter(Boolean)

  return (
    <div className="border border-dashed border-line-strong bg-surface">
      <div className="flex items-start gap-3 px-4 py-3">
        <PiBroadcast className="mt-0.5 shrink-0 text-lg text-text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Von Suchlage erkannt · unbestätigt</p>
          <div className="num mt-1 flex items-center gap-2 text-sm font-medium text-text">
            <span>{formatTime(flight.started_at_ms)}</span>
            <span className="text-text-muted">→</span>
            <span>{flight.ended_at_ms !== null ? formatTime(flight.ended_at_ms) : '—'}</span>
            {running && (
              <span className="ml-auto flex items-center gap-1.5 border border-good/40 bg-good-bg px-1.5 py-px text-[11px] text-good">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
                </span>
                Läuft
              </span>
            )}
            {lost && (
              <span className="ml-auto border border-caution/40 bg-caution-bg px-1.5 py-px text-[11px] text-caution">
                Verbindung abgerissen
              </span>
            )}
          </div>
          {facts.length > 0 && <p className="mt-0.5 truncate text-xs text-text-muted">{facts.join(' · ')}</p>}
        </div>
      </div>
      <div className="border-t border-dashed border-line-strong">
        {mergeLabel ? (
          <button
            type="button"
            onClick={onMerge}
            className="flex min-h-12 w-full items-center justify-center gap-2 bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            <PiArrowsMerge className="text-base" />
            {mergeLabel}
          </button>
        ) : !canConfirm ? (
          <p className="flex min-h-12 items-center justify-center px-4 text-center text-xs text-text-muted">
            Erst den offenen Flug beenden, dann bestätigen.
          </p>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            className="flex min-h-12 w-full items-center justify-center gap-2 bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            <PiCheck className="text-base" />
            Bestätigen
          </button>
        )}
      </div>
    </div>
  )
}
