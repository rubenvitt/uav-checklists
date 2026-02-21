import { useMissionId } from '../context/MissionContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { useMissionWeather, useMissionKIndex, useMissionNearby } from '../hooks/useMissionEnvironment'
import LocationBar from './LocationBar'
import EinsatzdetailsSection from './sections/EinsatzdetailsSection'
import EinsatzauftragSection from './sections/EinsatzauftragSection'
import TruppstaerkeSection from './sections/TruppstaerkeSection'
import EinsatzkarteSection from './sections/EinsatzkarteSection'
import MissionsbriefingSection from './sections/MissionsbriefingSection'

export default function EinsatzdatenPhase() {
  const missionId = useMissionId()
  const geo = useGeolocation(missionId)
  const geocode = useReverseGeocode(geo.latitude, geo.longitude)
  const hasLocation = geo.latitude !== null && geo.longitude !== null

  // Pre-fetch environment data as soon as location is known
  useMissionWeather(geo.latitude, geo.longitude)
  useMissionKIndex()
  useMissionNearby(geo.latitude, geo.longitude)

  return (
    <div className="space-y-4">
      <LocationBar
        city={geocode.city}
        country={geocode.country}
        loading={geocode.loading}
        hasLocation={hasLocation}
        isManual={geo.isManual}
        manualName={geo.manualName}
        needsManualLocation={geo.needsManualLocation}
        onManualLocation={geo.setManualLocation}
        onClearManual={geo.clearManualLocation}
      />
      <EinsatzdetailsSection />
      <EinsatzauftragSection />
      <TruppstaerkeSection />
      <EinsatzkarteSection
        latitude={geo.latitude}
        longitude={geo.longitude}
        locked={!hasLocation}
      />
      <MissionsbriefingSection />
    </div>
  )
}
