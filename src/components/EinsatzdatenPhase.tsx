import { useMissionId } from '../context/MissionContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-surface">
        <LocationBar
          city={geocode.city}
          country={geocode.country}
          loading={geocode.loading}
          isManual={geo.isManual}
          manualName={geo.manualName}
          needsManualLocation={geo.needsManualLocation}
          onManualLocation={geo.setManualLocation}
          onClearManual={geo.clearManualLocation}
        />
      </div>
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
