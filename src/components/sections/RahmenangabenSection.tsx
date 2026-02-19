import type { DroneId } from '../../types/drone'
import LocationBar from '../LocationBar'
import DroneSelector from '../DroneSelector'
import AltitudeSelector from '../AltitudeSelector'

interface RahmenangabenSectionProps {
  city: string | null
  country: string | null
  geocodeLoading: boolean
  isManual: boolean
  manualName: string | null
  needsManualLocation: boolean
  onManualLocation: (location: { latitude: number; longitude: number; name: string }) => void
  onClearManual: () => void
  selectedDrone: DroneId
  onSelectDrone: (id: DroneId) => void
  maxAltitude: number
  onChangeAltitude: (alt: number) => void
}

export default function RahmenangabenSection(props: RahmenangabenSectionProps) {
  return (
    <div className="space-y-3">
      <LocationBar
        city={props.city}
        country={props.country}
        loading={props.geocodeLoading}
        isManual={props.isManual}
        manualName={props.manualName}
        needsManualLocation={props.needsManualLocation}
        onManualLocation={props.onManualLocation}
        onClearManual={props.onClearManual}
      />
      <DroneSelector selectedDrone={props.selectedDrone} onSelect={props.onSelectDrone} />
      <AltitudeSelector value={props.maxAltitude} onChange={props.onChangeAltitude} />
    </div>
  )
}
