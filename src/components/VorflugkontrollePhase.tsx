import { useState, useCallback, useEffect, useRef } from 'react'
import type { DroneId } from '../types/drone'
import { getDroneById } from '../data/drones'
import { useMissionId } from '../context/MissionContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { useWeather } from '../hooks/useWeather'
import { useKIndex } from '../hooks/useKIndex'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { useNearbyCheck } from '../hooks/useNearbyCheck'
import { useMissionPersistedState, clearMissionFormStorageByPrefix } from '../hooks/useMissionPersistedState'
import { readStorage } from '../hooks/usePersistedState'
import { computeAssessment } from '../utils/assessment'
import type { ArcClass } from './ArcDetermination'
import { generateReport, type ReportData, type EinsatzdetailsData } from '../utils/generateReport'
import { getMission } from '../utils/missionStorage'
import RahmenangabenSection from './sections/RahmenangabenSection'
import ExternalToolsSection from './sections/ExternalToolsSection'
import NearbyCheckSection from './sections/NearbyCheckSection'
import RiskClassSection from './sections/RiskClassSection'
import WeatherSection from './sections/WeatherSection'

interface VorflugkontrollePhaseProps {
  setExportPdf: (fn: () => void) => void
}

export default function VorflugkontrollePhase({ setExportPdf }: VorflugkontrollePhaseProps) {
  const missionId = useMissionId()
  const [selectedDrone, setSelectedDrone] = useMissionPersistedState<DroneId>('selectedDrone', 'matrice-350-rtk')
  const [maxAltitude, setMaxAltitude] = useMissionPersistedState<number>('maxAltitude', 120)
  const geo = useGeolocation(missionId)
  const nearby = useNearbyCheck(geo.latitude, geo.longitude)
  const weather = useWeather(geo.latitude, geo.longitude, maxAltitude)

  // Lifted state for PDF report
  const [soraData, setSoraData] = useState<{ grc: number | null; arc: ArcClass | null; sail: number | null }>({ grc: null, arc: null, sail: null })
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({})
  const handleSoraChange = useCallback((data: { grc: number | null; arc: ArcClass | null; sail: number | null }) => setSoraData(data), [])
  const handleManualChecksChange = useCallback((checked: Record<string, boolean>) => setManualChecks(checked), [])

  // Reset SORA when location changes significantly (~1.1 km)
  const locationKey = geo.latitude !== null && geo.longitude !== null
    ? `${geo.latitude.toFixed(2)},${geo.longitude.toFixed(2)}`
    : ''
  const [soraResetKey, setSoraResetKey] = useState(0)
  const prevLocationRef = useRef(locationKey)
  useEffect(() => {
    if (prevLocationRef.current && locationKey && prevLocationRef.current !== locationKey) {
      clearMissionFormStorageByPrefix('grc:', missionId)
      clearMissionFormStorageByPrefix('arc:', missionId)
      setSoraResetKey((k) => k + 1)
    }
    prevLocationRef.current = locationKey
  }, [locationKey, missionId])

  const kIndex = useKIndex()
  const geocode = useReverseGeocode(geo.latitude, geo.longitude)

  const drone = getDroneById(selectedDrone)
  const assessment =
    weather.current && kIndex.kIndex !== null
      ? computeAssessment(weather.current, kIndex.kIndex, drone, weather.windByAltitude ?? undefined, maxAltitude)
      : null

  const hasLocation = geo.latitude !== null && geo.longitude !== null

  // Register PDF export handler
  useEffect(() => {
    setExportPdf(() => {
      const mission = getMission(missionId)
      const locationName = geo.isManual && geo.manualName
        ? geo.manualName.split(',').slice(0, 2).map(p => p.trim()).join(', ')
        : geocode.city
          ? geocode.country ? `${geocode.city}, ${geocode.country}` : geocode.city
          : 'Unbekannt'
      const FLUG_ANLASS_LABELS: Record<string, string> = {
        einsatz: 'Einsatz',
        uebung: 'Übung',
        ausbildung: 'Ausbildung',
        testflug: 'Testflug/Wartung',
      }
      const flugAnlassRaw = readStorage<string>('flugAnlass', 'einsatz', missionId)
      const einsatzdetails: EinsatzdetailsData = {
        flugAnlass: FLUG_ANLASS_LABELS[flugAnlassRaw] ?? flugAnlassRaw,
        einsatzstichwort: readStorage<string>('einsatzstichwort', '', missionId),
        alarmzeit: readStorage<string>('alarmzeit', '', missionId),
        alarmierungDurch: readStorage<string>('alarmierungDurch', '', missionId),
        anforderndeStelle: readStorage<string>('anforderndeStelle', '', missionId),
        einsatzleiter: readStorage<string>('einsatzleiter', '', missionId),
        abschnittsleiter: readStorage<string>('abschnittsleiter', '', missionId),
      }
      const data: ReportData = {
        missionLabel: mission?.label,
        einsatzdetails,
        location: locationName,
        drone,
        maxAltitude,
        categories: nearby.categories,
        manualChecks,
        grc: soraData.grc,
        arc: soraData.arc,
        sail: soraData.sail,
        assessment,
      }
      generateReport(data)
    })
  }) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <RahmenangabenSection
        city={geocode.city}
        country={geocode.country}
        geocodeLoading={geocode.loading}
        isManual={geo.isManual}
        manualName={geo.manualName}
        needsManualLocation={geo.needsManualLocation}
        onManualLocation={geo.setManualLocation}
        onClearManual={geo.clearManualLocation}
        selectedDrone={selectedDrone}
        onSelectDrone={setSelectedDrone}
        maxAltitude={maxAltitude}
        onChangeAltitude={setMaxAltitude}
      />
      <ExternalToolsSection latitude={geo.latitude} longitude={geo.longitude} locked={!hasLocation} />
      <NearbyCheckSection categories={nearby.categories} loading={nearby.loading} error={nearby.error} locked={!hasLocation} onManualChecksChange={handleManualChecksChange} />
      <RiskClassSection key={soraResetKey} locked={!hasLocation} onSoraChange={handleSoraChange} />
      <WeatherSection
        assessment={assessment}
        sun={weather.sun}
        windByAltitude={weather.windByAltitude}
        hourlyForecast={weather.hourlyForecast}
        maxAltitude={maxAltitude}
        drone={drone}
        isLoading={geo.loading || weather.loading || kIndex.loading}
        error={weather.error || kIndex.error}
        locked={!hasLocation}
      />
    </>
  )
}
