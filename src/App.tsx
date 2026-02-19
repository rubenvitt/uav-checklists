import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DroneId } from './types/drone'
import { getDroneById } from './data/drones'
import { useGeolocation } from './hooks/useGeolocation'
import { useWeather } from './hooks/useWeather'
import { useKIndex } from './hooks/useKIndex'
import { useReverseGeocode } from './hooks/useReverseGeocode'
import { useNearbyCheck } from './hooks/useNearbyCheck'
import { useTheme } from './hooks/useTheme'
import { usePersistedState, clearFormStorageByPrefix } from './hooks/usePersistedState'
import { computeAssessment } from './utils/assessment'
import type { ArcClass } from './components/ArcDetermination'
import { generateReport, type ReportData } from './utils/generateReport'
import Header from './components/Header'
import RahmenangabenSection from './components/sections/RahmenangabenSection'
import ExternalToolsSection from './components/sections/ExternalToolsSection'
import NearbyCheckSection from './components/sections/NearbyCheckSection'
import RiskClassSection from './components/sections/RiskClassSection'
import WeatherSection from './components/sections/WeatherSection'

export default function App() {
  const queryClient = useQueryClient()
  const [selectedDrone, setSelectedDrone] = usePersistedState<DroneId>('selectedDrone', 'matrice-350-rtk')
  const [maxAltitude, setMaxAltitude] = usePersistedState<number>('maxAltitude', 120)
  const geo = useGeolocation()
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
      clearFormStorageByPrefix('grc:')
      clearFormStorageByPrefix('arc:')
      setSoraResetKey((k) => k + 1)
    }
    prevLocationRef.current = locationKey
  }, [locationKey])
  const { setting: themeSetting, cycle: cycleTheme } = useTheme(weather.sun ?? null)
  const kIndex = useKIndex()
  const geocode = useReverseGeocode(geo.latitude, geo.longitude)

  const drone = getDroneById(selectedDrone)
  const assessment =
    weather.current && kIndex.kIndex !== null
      ? computeAssessment(weather.current, kIndex.kIndex, drone, weather.windByAltitude ?? undefined, maxAltitude)
      : null

  const hasLocation = geo.latitude !== null && geo.longitude !== null
  const isLoading = geo.loading || weather.loading || kIndex.loading
  const error = weather.error || kIndex.error

  return (
    <div className="min-h-screen bg-base text-text">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Header
          onRefresh={() => queryClient.invalidateQueries()}
          lastUpdated={weather.lastUpdated}
          themeSetting={themeSetting}
          onCycleTheme={cycleTheme}
          onExportPdf={() => {
            const locationName = geo.isManual && geo.manualName
              ? geo.manualName.split(',').slice(0, 2).map(p => p.trim()).join(', ')
              : geocode.city
                ? geocode.country ? `${geocode.city}, ${geocode.country}` : geocode.city
                : 'Unbekannt'
            const data: ReportData = {
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
          }}
        />
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
          isLoading={isLoading}
          error={error}
          locked={!hasLocation}
        />
      </div>
    </div>
  )
}
