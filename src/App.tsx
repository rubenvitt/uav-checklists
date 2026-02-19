import { useState, useEffect } from 'react'
import type { DroneId } from './types/drone'
import { getDroneById } from './data/drones'
import { useGeolocation } from './hooks/useGeolocation'
import { useWeather } from './hooks/useWeather'
import { useKIndex } from './hooks/useKIndex'
import { useReverseGeocode } from './hooks/useReverseGeocode'
import { useNearbyCheck } from './hooks/useNearbyCheck'
import { useTheme } from './hooks/useTheme'
import { computeAssessment } from './utils/assessment'
import Header from './components/Header'
import RahmenangabenSection from './components/sections/RahmenangabenSection'
import ExternalToolsSection from './components/sections/ExternalToolsSection'
import NearbyCheckSection from './components/sections/NearbyCheckSection'
import WeatherSection from './components/sections/WeatherSection'

export default function App() {
  const [selectedDrone, setSelectedDrone] = useState<DroneId>('matrice-350-rtk')
  const [maxAltitude, setMaxAltitude] = useState<number>(() => {
    const saved = localStorage.getItem('maxAltitude')
    return saved ? Number(saved) : 120
  })
  const geo = useGeolocation()
  const nearby = useNearbyCheck(geo.latitude, geo.longitude)
  const weather = useWeather(geo.latitude, geo.longitude, maxAltitude)

  useEffect(() => {
    localStorage.setItem('maxAltitude', String(maxAltitude))
  }, [maxAltitude])
  const { setting: themeSetting, cycle: cycleTheme } = useTheme(weather.sun ?? null)
  const kIndex = useKIndex()
  const geocode = useReverseGeocode(geo.latitude, geo.longitude)

  const drone = getDroneById(selectedDrone)
  const assessment =
    weather.current && kIndex.kIndex !== null
      ? computeAssessment(weather.current, kIndex.kIndex, drone, weather.windByAltitude ?? undefined, maxAltitude)
      : null

  const isLoading = geo.loading || weather.loading || kIndex.loading
  const error = weather.error || kIndex.error

  return (
    <div className="min-h-screen bg-base text-text">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Header onRefresh={weather.refresh} lastUpdated={weather.lastUpdated} themeSetting={themeSetting} onCycleTheme={cycleTheme} />
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
        <ExternalToolsSection latitude={geo.latitude} longitude={geo.longitude} />
        <NearbyCheckSection categories={nearby.categories} loading={nearby.loading} error={nearby.error} />
        <WeatherSection
          assessment={assessment}
          sun={weather.sun}
          windByAltitude={weather.windByAltitude}
          hourlyForecast={weather.hourlyForecast}
          maxAltitude={maxAltitude}
          drone={drone}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}
