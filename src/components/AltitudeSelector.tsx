const ALTITUDE_PRESETS = [30, 50, 80, 100, 120, 150] as const

interface AltitudeSelectorProps {
  value: number
  onChange: (altitude: number) => void
}

export default function AltitudeSelector({ value, onChange }: AltitudeSelectorProps) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <p className="mb-2 text-xs text-text-muted">Max. Flughöhe</p>
      <div className="flex flex-wrap gap-2">
        {ALTITUDE_PRESETS.map((alt) => (
          <button
            key={alt}
            onClick={() => onChange(alt)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              value === alt
                ? 'bg-text text-base'
                : 'bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            {alt} m
          </button>
        ))}
      </div>
    </div>
  )
}
