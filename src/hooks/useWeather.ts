import { useState, useEffect, useCallback } from 'react'
import type { WeatherData, SunData, WindAtAltitude, HourlyForecastPoint } from '../types/weather'
import { fetchWeather } from '../services/weatherApi'

const REFRESH_INTERVAL = 600_000 // 10 Minuten

interface UseWeatherResult {
  current: WeatherData | null
  sun: SunData | null
  windByAltitude: WindAtAltitude[] | null
  hourlyForecast: HourlyForecastPoint[] | null
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}

export function useWeather(lat: number | null, lon: number | null): UseWeatherResult {
  const [current, setCurrent] = useState<WeatherData | null>(null)
  const [sun, setSun] = useState<SunData | null>(null)
  const [windByAltitude, setWindByAltitude] = useState<WindAtAltitude[] | null>(null)
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    if (lat === null || lon === null) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetchWeather(lat, lon)
      setCurrent(res.current)
      setSun(res.sun)
      setWindByAltitude(res.windByAltitude)
      setHourlyForecast(res.hourlyForecast)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wetterdaten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [lat, lon])

  useEffect(() => {
    load()

    if (lat === null || lon === null) return

    const interval = setInterval(load, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [load, lat, lon])

  return { current, sun, windByAltitude, hourlyForecast, loading, error, refresh: load, lastUpdated }
}
