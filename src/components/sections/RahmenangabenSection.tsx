import type { DroneId } from '../../types/drone'
import DroneSelector from '../DroneSelector'
import AltitudeSelector from '../AltitudeSelector'

interface RahmenangabenSectionProps {
  selectedDrone: DroneId
  onSelectDrone: (id: DroneId) => void
  maxAltitude: number
  onChangeAltitude: (alt: number) => void
}

export default function RahmenangabenSection(props: RahmenangabenSectionProps) {
  return (
    <div className="divide-y divide-surface-alt rounded-xl bg-surface">
      <DroneSelector selectedDrone={props.selectedDrone} onSelect={props.onSelectDrone} />
      <AltitudeSelector value={props.maxAltitude} onChange={props.onChangeAltitude} />
    </div>
  )
}
