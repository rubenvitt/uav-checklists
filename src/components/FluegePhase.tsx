import { PiAirplaneTakeoff } from 'react-icons/pi'

export default function FluegePhase() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-surface py-16 text-center">
      <PiAirplaneTakeoff className="text-4xl text-text-muted" />
      <div>
        <p className="text-sm font-medium text-text">Flüge</p>
        <p className="mt-1 text-xs text-text-muted">
          Hier werden zukünftig Flüge dokumentiert und verwaltet.
        </p>
      </div>
    </div>
  )
}
