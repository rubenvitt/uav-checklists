import { useState, useEffect } from 'react'
import type { DroneId } from './types/drone'
import { getDroneById } from './data/drones'
import { useGeolocation } from './hooks/useGeolocation'
import { useWeather } from './hooks/useWeather'
import { useKIndex } from './hooks/useKIndex'
import { useReverseGeocode } from './hooks/useReverseGeocode'
import { useTheme } from './hooks/useTheme'
import { computeAssessment } from './utils/assessment'
import Header from './components/Header'
import LocationBar from './components/LocationBar'
import DroneSelector from './components/DroneSelector'
import FlightAssessment from './components/FlightAssessment'
import MetricGrid from './components/MetricGrid'
import Recommendations from './components/Recommendations'
import SunTimes from './components/SunTimes'
import AltitudeSelector from './components/AltitudeSelector'
import WindByAltitude from './components/WindByAltitude'
import HourlyForecast from './components/HourlyForecast'
import LoadingSpinner from './components/LoadingSpinner'

export default function App() {
  const [selectedDrone, setSelectedDrone] = useState<DroneId>('matrice-350-rtk')
  const [maxAltitude, setMaxAltitude] = useState<number>(() => {
    const saved = localStorage.getItem('maxAltitude')
    return saved ? Number(saved) : 120
  })
  const geo = useGeolocation()
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
        <DroneSelector selectedDrone={selectedDrone} onSelect={setSelectedDrone} />
        <AltitudeSelector value={maxAltitude} onChange={setMaxAltitude} />

        {isLoading && <LoadingSpinner />}

        {error && !isLoading && (
          <div className="rounded-xl bg-warning-bg border border-warning/30 px-5 py-4 text-center">
            <p className="text-sm text-warning">{error}</p>
          </div>
        )}

        {assessment && !isLoading && (
          <>
            <FlightAssessment status={assessment.overall} />
            <MetricGrid metrics={assessment.metrics} />
            <Recommendations recommendations={assessment.recommendations} />
          </>
        )}

        {weather.sun && <SunTimes sunrise={weather.sun.sunrise} sunset={weather.sun.sunset} />}
        {weather.windByAltitude && <WindByAltitude data={weather.windByAltitude} maxAltitude={maxAltitude} />}
        {weather.hourlyForecast && <HourlyForecast data={weather.hourlyForecast} drone={drone} />}
      </div>
    </div>
  )
}
