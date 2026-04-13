import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import type { DroneId } from '../types/drone'
import { getDroneById } from '../data/drones'
import { useMissionId } from '../context/MissionContext'
import { useSegmentId } from '../context/SegmentContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { useMissionWeather, useMissionKIndex, useMissionNearby } from '../hooks/useMissionEnvironment'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { useMissionPersistedState, clearMissionFormStorageByPrefix } from '../hooks/useMissionPersistedState'
import { useSegmentPersistedState } from '../hooks/useSegmentPersistedState'
import { computeAssessment } from '../utils/assessment'
import { useAutoExpand } from '../hooks/useAutoExpand'
import { useVorflugkontrolleCompleteness } from '../hooks/useSectionCompleteness'
import { useMissionSegment } from '../hooks/useMissionSegment'
import LocationBar from './LocationBar'
import RelocationConfirmDialog from './RelocationConfirmDialog'
import SegmentBanner from './SegmentBanner'
import RahmenangabenSection from './sections/RahmenangabenSection'
import ExternalToolsSection from './sections/ExternalToolsSection'
import NearbyCheckSection from './sections/NearbyCheckSection'
import AnmeldungenSection from './sections/AnmeldungenSection'
import RiskClassSection from './sections/RiskClassSection'
import WeatherSection from './sections/WeatherSection'
import { AufstiegsortSection, UavCheckSection, RemoteControllerSection } from './sections/TechnischeKontrolleSections'
import FlugbriefingSection from './sections/FlugbriefingSection'
import FunktionskontrolleSection from './sections/FunktionskontrolleSection'

export default function VorflugkontrollePhase() {
  const missionId = useMissionId()
  const segmentId = useSegmentId()
  const queryClient = useQueryClient()
  const { segments, activeSegment, setLocationName, startRelocation } = useMissionSegment()
  const [showRelocationDialog, setShowRelocationDialog] = useState(false)
  const [selectedDrone, setSelectedDrone] = useMissionPersistedState<DroneId>('selectedDrone', 'matrice-350-rtk')
  const [maxAltitude, setMaxAltitude] = useMissionPersistedState<number>('maxAltitude', 120)
  const [currentFlugfreigabe] = useSegmentPersistedState<string | null>('flugfreigabe', null)
  const [currentFlugentscheidung] = useSegmentPersistedState<{ status: 'granted' | 'denied'; timestamp: string } | null>('flugentscheidung', null)
  const isFirstSegment = segments.length > 0 && activeSegment?.id === segments[0].id
  const geo = useGeolocation(missionId, segmentId, isFirstSegment)

  // Clear weather/nearby query cache when segment changes to avoid stale data
  const prevSegmentRef = useRef(segmentId)
  useEffect(() => {
    if (prevSegmentRef.current && segmentId && prevSegmentRef.current !== segmentId) {
      queryClient.removeQueries({ queryKey: ['weather'] })
      queryClient.removeQueries({ queryKey: ['nearby'] })
    }
    prevSegmentRef.current = segmentId
  }, [segmentId, queryClient])
  const nearby = useMissionNearby(geo.latitude, geo.longitude)
  const weather = useMissionWeather(geo.latitude, geo.longitude, maxAltitude)


  // Reset SORA when location changes significantly (~1.1 km)
  const locationKey = geo.latitude !== null && geo.longitude !== null
    ? `${geo.latitude.toFixed(2)},${geo.longitude.toFixed(2)}`
    : ''
  const soraResetKey = `${segmentId ?? 'mission'}:${locationKey || 'unset'}`
  const prevLocationRef = useRef(locationKey)
  useEffect(() => {
    if (prevLocationRef.current && locationKey && prevLocationRef.current !== locationKey) {
      const prefix = segmentId ? `seg:${segmentId}:` : ''
      clearMissionFormStorageByPrefix(`${prefix}grc:`, missionId)
      clearMissionFormStorageByPrefix(`${prefix}arc:`, missionId)
    }
    prevLocationRef.current = locationKey
  }, [locationKey, missionId, segmentId])

  const kIndex = useMissionKIndex()
  const geocode = useReverseGeocode(geo.latitude, geo.longitude)

  // Update segment location name from geocode
  useEffect(() => {
    if (segmentId && geocode.city) {
      const name = geocode.country ? `${geocode.city}, ${geocode.country}` : geocode.city
      setLocationName(segmentId, name)
    }
  }, [segmentId, geocode.city, geocode.country, setLocationName])

  const drone = getDroneById(selectedDrone)
  const assessment =
    weather.current && kIndex.kIndex !== null
      ? computeAssessment(weather.current, kIndex.kIndex, drone, weather.windByAltitude ?? undefined, maxAltitude)
      : null

  const hasLocation = geo.latitude !== null && geo.longitude !== null

  // Auto-expand logic
  const weatherWarning = assessment?.overall === 'warning'
  const criticalNearbyKeys = ['aviation', 'military', 'prison']
  const criticalNearbyCategories = nearby.categories?.filter((c: { key: string }) => criticalNearbyKeys.includes(c.key)) ?? []
  const nearbyWarning = criticalNearbyCategories.length > 0
  const noGoReasonsFromWeather = (assessment?.metrics ?? [])
    .filter((metric) => metric.status === 'warning')
    .map((metric) => `Wetter: ${metric.label} ${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`)
  const noGoReasonsFromNearby = criticalNearbyCategories.map((category) => `Umgebung: ${category.label}`)
  const noGoReasons = [...new Set([...noGoReasonsFromWeather, ...noGoReasonsFromNearby])]
  const sections = useVorflugkontrolleCompleteness(!!weatherWarning, !!nearbyWarning, hasLocation)
  const { openState, toggle, continueToNext, isComplete } = useAutoExpand(sections, 'vorflugkontrolle')
  const navigate = useNavigate()
  const currentDecision =
    currentFlugentscheidung ?? (currentFlugfreigabe ? { status: 'granted' as const, timestamp: currentFlugfreigabe } : null)
  const nextPhase: 'fluege' | 'nachbereitung' = currentDecision?.status === 'denied' ? 'nachbereitung' : 'fluege'
  const goToNextPhase = () => navigate(`/mission/${missionId}/${nextPhase}`)

  return (
    <>
      <SegmentBanner
        segments={segments}
        activeSegment={activeSegment}
        onRelocate={() => setShowRelocationDialog(true)}
      />
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
      <RahmenangabenSection
        selectedDrone={selectedDrone}
        onSelectDrone={setSelectedDrone}
        maxAltitude={maxAltitude}
        onChangeAltitude={setMaxAltitude}
      />
      {/* Gruppen-Divider */}
      <div className="flex items-center gap-3 px-1 pt-2">
        <div className="h-px flex-1 bg-surface-alt" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted/60">Standortabhängige Prüfungen</span>
        <div className="h-px flex-1 bg-surface-alt" />
      </div>
      <ExternalToolsSection latitude={geo.latitude} longitude={geo.longitude} locked={!hasLocation} open={openState.externaltools} onToggle={() => toggle('externaltools')} isComplete={isComplete.externaltools} onContinue={() => continueToNext('externaltools')} />
      <NearbyCheckSection categories={nearby.categories} loading={nearby.loading} error={nearby.error} locked={!hasLocation} open={openState.nearbycheck} onToggle={() => toggle('nearbycheck')} isComplete={isComplete.nearbycheck} onContinue={() => continueToNext('nearbycheck')} />
      <AnmeldungenSection categories={nearby.categories} open={openState.anmeldungen} onToggle={() => toggle('anmeldungen')} isComplete={isComplete.anmeldungen} onContinue={() => continueToNext('anmeldungen')} />
      <RiskClassSection key={soraResetKey} locked={!hasLocation} open={openState.riskclass} onToggle={() => toggle('riskclass')} isComplete={isComplete.riskclass} onContinue={() => continueToNext('riskclass')} />
      <WeatherSection
        assessment={assessment}
        sun={weather.sun}
        windByAltitude={weather.windByAltitude}
        hourlyForecast={weather.hourlyForecast}
        metarStation={weather.metarStation}
        maxAltitude={maxAltitude}
        drone={drone}
        isLoading={geo.loading || weather.loading || kIndex.loading}
        error={weather.error || kIndex.error}
        locked={!hasLocation}
        open={openState.weather}
        onToggle={() => toggle('weather')}
        isComplete={isComplete.weather}
        onContinue={() => continueToNext('weather')}
      />
      <AufstiegsortSection open={openState.aufstiegsort} onToggle={() => toggle('aufstiegsort')} isComplete={isComplete.aufstiegsort} onContinue={() => continueToNext('aufstiegsort')} />
      <FlugbriefingSection open={openState.flugbriefing} onToggle={() => toggle('flugbriefing')} isComplete={isComplete.flugbriefing} onContinue={() => continueToNext('flugbriefing')} />
      {/* Gruppen-Divider */}
      <div className="flex items-center gap-3 px-1 pt-2">
        <div className="h-px flex-1 bg-surface-alt" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted/60">Geräteprüfungen</span>
        <div className="h-px flex-1 bg-surface-alt" />
      </div>
      <UavCheckSection open={openState.uavcheck} onToggle={() => toggle('uavcheck')} isComplete={isComplete.uavcheck} onContinue={() => continueToNext('uavcheck')} />
      <RemoteControllerSection open={openState.remotecontroller} onToggle={() => toggle('remotecontroller')} isComplete={isComplete.remotecontroller} onContinue={() => continueToNext('remotecontroller')} />
      {/* Gruppen-Divider */}
      <div className="flex items-center gap-3 px-1 pt-2">
        <div className="h-px flex-1 bg-surface-alt" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted/60">Funktionskontrolle & Freigabe</span>
        <div className="h-px flex-1 bg-surface-alt" />
      </div>
      <FunktionskontrolleSection
        open={openState.funktionskontrolle}
        onToggle={() => toggle('funktionskontrolle')}
        isComplete={isComplete.funktionskontrolle}
        onContinue={goToNextPhase}
        continueLabel={nextPhase === 'nachbereitung' ? 'Weiter zur Nachbereitung' : 'Weiter zu den Flügen'}
        isPhaseComplete
        noGoRecommended={noGoReasons.length > 0}
        noGoReasons={noGoReasons}
      />
      <RelocationConfirmDialog
        open={showRelocationDialog}
        segmentNumber={segments.length + 1}
        onConfirm={(label) => {
          setShowRelocationDialog(false)
          startRelocation(label)
          navigate(`/mission/${missionId}/vorflugkontrolle`)
        }}
        onCancel={() => setShowRelocationDialog(false)}
      />
    </>
  )
}
