export type FlightPurpose = 'einsatz' | 'uebung' | 'ausbildung' | 'testflug'

const FLIGHT_PURPOSES: { id: FlightPurpose; label: string }[] = [
  { id: 'einsatz', label: 'Einsatz' },
  { id: 'uebung', label: 'Übung' },
  { id: 'ausbildung', label: 'Ausbildung' },
  { id: 'testflug', label: 'Testflug/Wartung' },
]

interface FlightPurposeSelectorProps {
  value: FlightPurpose
  onChange: (purpose: FlightPurpose) => void
}

export default function FlightPurposeSelector({ value, onChange }: FlightPurposeSelectorProps) {
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-xs text-text-muted">Anlass des Fluges</p>
      <div className="flex flex-wrap gap-2">
        {FLIGHT_PURPOSES.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              value === p.id
                ? 'bg-text text-base'
                : 'bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
