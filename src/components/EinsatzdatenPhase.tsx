import { useNavigate } from 'react-router'
import { useMissionId } from '../context/MissionContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { useMissionWeather, useMissionKIndex, useMissionNearby } from '../hooks/useMissionEnvironment'
import { useAutoExpand } from '../hooks/useAutoExpand'
import { useEinsatzdatenCompleteness } from '../hooks/useSectionCompleteness'
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

  // Auto-expand logic
  const completeness = useEinsatzdatenCompleteness()
  const sections = completeness.map(s =>
    s.id === 'einsatzkarte' ? { ...s, locked: !hasLocation } : s
  )
  const { openState, toggle, continueToNext, isComplete } = useAutoExpand(sections, 'einsatzdaten')
  const navigate = useNavigate()
  const goToNextPhase = () => navigate(`/mission/${missionId}/vorflugkontrolle`)

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
      <EinsatzdetailsSection open={openState.einsatzdetails} onToggle={() => toggle('einsatzdetails')} isComplete={isComplete.einsatzdetails} onContinue={() => continueToNext('einsatzdetails')} />
      <EinsatzauftragSection open={openState.einsatzauftrag} onToggle={() => toggle('einsatzauftrag')} isComplete={isComplete.einsatzauftrag} onContinue={() => continueToNext('einsatzauftrag')} />
      <TruppstaerkeSection open={openState.truppstaerke} onToggle={() => toggle('truppstaerke')} isComplete={isComplete.truppstaerke} onContinue={() => continueToNext('truppstaerke')} />
      <EinsatzkarteSection
        latitude={geo.latitude}
        longitude={geo.longitude}
        locked={!hasLocation}
        open={openState.einsatzkarte}
        onToggle={() => toggle('einsatzkarte')}
        isComplete={isComplete.einsatzkarte}
        onContinue={() => continueToNext('einsatzkarte')}
      />
      <MissionsbriefingSection
        open={openState.missionsbriefing}
        onToggle={() => toggle('missionsbriefing')}
        isComplete={isComplete.missionsbriefing}
        onContinue={goToNextPhase}
        continueLabel="Weiter zur Vorflugkontrolle"
        isPhaseComplete
      />
    </div>
  )
}
