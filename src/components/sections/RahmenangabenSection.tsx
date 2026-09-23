import type { DroneId } from '../../types/drone'
import type { PayloadId } from '../../types/payload'
import { getDroneById } from '../../data/drones'
import DroneSelector from '../DroneSelector'
import PayloadSelector from '../PayloadSelector'
import AltitudeSelector from '../AltitudeSelector'

interface RahmenangabenSectionProps {
  selectedDrone: DroneId
  onSelectDrone: (id: DroneId) => void
  selectedPayloads: PayloadId[]
  onChangePayloads: (ids: PayloadId[]) => void
  maxAltitude: number
  onChangeAltitude: (alt: number) => void
}

export default function RahmenangabenSection(props: RahmenangabenSectionProps) {
  return (
    <div className="divide-y divide-surface-alt rounded-xl bg-surface">
      <DroneSelector selectedDrone={props.selectedDrone} onSelect={props.onSelectDrone} />
      <PayloadSelector
        drone={getDroneById(props.selectedDrone)}
        value={props.selectedPayloads}
        onChange={props.onChangePayloads}
      />
      <AltitudeSelector value={props.maxAltitude} onChange={props.onChangeAltitude} />
    </div>
  )
}
