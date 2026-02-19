import type { WindAtAltitude } from '../types/weather'

interface WindByAltitudeProps {
  data: WindAtAltitude[]
}

function compassLabel(degrees: number): string {
  const dirs = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const idx = Math.round(degrees / 22.5) % 16
  return dirs[idx]
}

function DirectionArrow({ degrees }: { degrees: number }) {
  const rotation = degrees
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block text-text-muted"
        style={{ transform: `rotate(${rotation}deg)` }}
        title={`${Math.round(degrees)}°`}
      >
        ↑
      </span>
      <span className="text-xs text-text-muted">{compassLabel(degrees)} <span className="text-text-muted/50">({Math.round(degrees)}°)</span></span>
    </span>
  )
}

export default function WindByAltitude({ data }: WindByAltitudeProps) {
  const sorted = [...data].sort((a, b) => b.altitude - a.altitude)

  return (
    <div className="rounded-xl bg-surface px-4 py-4">
      <h3 className="mb-3 text-sm font-semibold text-text">💨 Wind nach Höhe</h3>
      <div className="space-y-2">
        {sorted.map((row) => (
          <div key={row.altitude} className="flex items-center text-sm">
            <span className="w-16 text-text-muted">{row.altitude.toFixed(1)} m</span>
            <span className="mx-2"><DirectionArrow degrees={row.windDirection} /></span>
            <span className="flex-1 text-right font-medium text-text">
              {row.windSpeed.toFixed(1)} km/h{' '}
              <span className="text-text-muted">↑ {row.windGusts.toFixed(1)} km/h</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
