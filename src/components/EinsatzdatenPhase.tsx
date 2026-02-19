import { useMissionId } from '../context/MissionContext'
import { useGeolocation } from '../hooks/useGeolocation'
import EinsatzdetailsSection from './sections/EinsatzdetailsSection'
import EinsatzauftragSection from './sections/EinsatzauftragSection'
import TruppstaerkeSection from './sections/TruppstaerkeSection'
import EinsatzkarteSection from './sections/EinsatzkarteSection'

export default function EinsatzdatenPhase() {
  const missionId = useMissionId()
  const geo = useGeolocation(missionId)
  const hasLocation = geo.latitude !== null && geo.longitude !== null

  return (
    <div className="space-y-4">
      <EinsatzdetailsSection />
      <EinsatzauftragSection />
      <TruppstaerkeSection />
      <EinsatzkarteSection
        latitude={geo.latitude}
        longitude={geo.longitude}
        locked={!hasLocation}
      />
    </div>
  )
}
