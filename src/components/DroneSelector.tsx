import { drones } from '../data/drones'
import type { DroneId } from '../types/drone'

interface DroneSelectorProps {
  selectedDrone: DroneId
  onSelect: (id: DroneId) => void
}

export default function DroneSelector({ selectedDrone, onSelect }: DroneSelectorProps) {
  return (
    <div className="px-4 py-3">
      <label htmlFor="drone-select" className="mb-1 block text-xs text-text-muted">
        Drohne auswählen
      </label>
      <select
        id="drone-select"
        value={selectedDrone}
        onChange={(e) => onSelect(e.target.value as DroneId)}
        className="w-full cursor-pointer rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
      >
        {drones.map((drone) => (
          <option key={drone.id} value={drone.id}>
            {drone.name}
          </option>
        ))}
      </select>
    </div>
  )
}
