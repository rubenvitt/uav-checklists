import { useState, useEffect, useCallback } from 'react'
import type { WeatherData, SunData, WindAtAltitude, HourlyForecastPoint, WeatherResponse } from '../types/weather'
import { fetchWeather } from '../services/weatherApi'

const REFRESH_INTERVAL = 600_000 // 10 Minuten
const CACHE_TTL = 5 * 60 * 1000 // 5 Minuten
const CACHE_KEY = 'weather_cache'

interface CacheEntry {
  ts: number
  lat: number
  lon: number
  alt: number
  data: WeatherResponse
}

function readCache(lat: number, lon: number, alt: number): WeatherResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL) return null
    // Same location (~111m) and same altitude
    if (Math.abs(entry.lat - lat) > 0.001 || Math.abs(entry.lon - lon) > 0.001) return null
    if (entry.alt !== alt) return null
    return entry.data
  } catch {
    return null
  }
}

function writeCache(lat: number, lon: number, alt: number, data: WeatherResponse): void {
  try {
    const entry: CacheEntry = { ts: Date.now(), lat, lon, alt, data }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage full — ignore
  }
}

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

export function useWeather(lat: number | null, lon: number | null, maxAltitude: number = 120): UseWeatherResult {
  const [current, setCurrent] = useState<WeatherData | null>(null)
  const [sun, setSun] = useState<SunData | null>(null)
  const [windByAltitude, setWindByAltitude] = useState<WindAtAltitude[] | null>(null)
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const applyResponse = useCallback((res: WeatherResponse) => {
    setCurrent(res.current)
    setSun(res.sun)
    setWindByAltitude(res.windByAltitude)
    setHourlyForecast(res.hourlyForecast)
    setLastUpdated(new Date())
  }, [])

  const load = useCallback(async () => {
    if (lat === null || lon === null) return

    // Check cache first
    const cached = readCache(lat, lon, maxAltitude)
    if (cached) {
      applyResponse(cached)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetchWeather(lat, lon, maxAltitude)
      applyResponse(res)
      writeCache(lat, lon, maxAltitude, res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wetterdaten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [lat, lon, maxAltitude, applyResponse])

  const forceRefresh = useCallback(async () => {
    if (lat === null || lon === null) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWeather(lat, lon, maxAltitude)
      applyResponse(res)
      writeCache(lat, lon, maxAltitude, res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wetterdaten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [lat, lon, maxAltitude, applyResponse])

  useEffect(() => {
    load()

    if (lat === null || lon === null) return

    const interval = setInterval(forceRefresh, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [load, forceRefresh, lat, lon])

  return { current, sun, windByAltitude, hourlyForecast, loading, error, refresh: forceRefresh, lastUpdated }
}
