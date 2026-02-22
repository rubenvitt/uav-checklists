import { PiMapPin, PiAirplaneTakeoff, PiClock } from 'react-icons/pi'
import type { MissionSegment } from '../../types/mission'
import type { FlightLogEntry } from '../../types/flightLog'
import ChecklistSection from '../ChecklistSection'

interface SegmentSummarySectionProps {
  segments: MissionSegment[]
  flightEntries: FlightLogEntry[]
  open?: boolean
  onToggle?: () => void
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}min`
}

export default function SegmentSummarySection({ segments, flightEntries, open, onToggle }: SegmentSummarySectionProps) {
  return (
    <ChecklistSection
      title="Standorte"
      icon={<PiMapPin />}
      badge={{ label: `${segments.length}`, status: 'good' }}
      open={open}
      onToggle={onToggle}
      isComplete
    >
      <div className="space-y-3">
        {segments.map(seg => {
          const segFlights = flightEntries.filter(e => e.segmentId === seg.id && e.blockOn)
          const totalMinutes = segFlights.reduce((acc, f) => {
            if (f.blockOn) {
              const diff = new Date(f.blockOn).getTime() - new Date(f.blockOff).getTime()
              return acc + (diff > 0 ? Math.floor(diff / 60000) : 0)
            }
            return acc
          }, 0)

          return (
            <div key={seg.id} className="rounded-lg bg-surface-alt px-4 py-3">
              <div className="flex items-center gap-2">
                <PiMapPin className="shrink-0 text-sm text-text-muted" />
                <span className="flex-1 text-sm font-medium text-text">{seg.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  seg.status === 'active' ? 'bg-good-bg text-good' : 'bg-surface text-text-muted'
                }`}>
                  {seg.status === 'active' ? 'Aktiv' : 'Abgeschlossen'}
                </span>
              </div>
              {seg.locationName && (
                <p className="mt-0.5 pl-6 text-xs text-text-muted">{seg.locationName}</p>
              )}
              <div className="mt-2 flex gap-4 pl-6">
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <PiAirplaneTakeoff className="text-sm" />
                  {segFlights.length} {segFlights.length === 1 ? 'Flug' : 'Flüge'}
                </div>
                {totalMinutes > 0 && (
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <PiClock className="text-sm" />
                    {formatDuration(totalMinutes)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ChecklistSection>
  )
}
