import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { WeatherData, SunData, WindAtAltitude, HourlyForecastPoint, WeatherResponse } from '../types/weather'
import { fetchWeather } from '../services/weatherApi'

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
  const queryClient = useQueryClient()

  const roundedLat = lat !== null ? Math.round(lat * 1000) / 1000 : null
  const roundedLon = lon !== null ? Math.round(lon * 1000) / 1000 : null

  const query = useQuery<WeatherResponse>({
    queryKey: ['weather', roundedLat, roundedLon, maxAltitude],
    queryFn: () => fetchWeather(lat!, lon!, maxAltitude),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: lat !== null && lon !== null,
  })

  return {
    current: query.data?.current ?? null,
    sun: query.data?.sun ?? null,
    windByAltitude: query.data?.windByAltitude ?? null,
    hourlyForecast: query.data?.hourlyForecast ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Wetterdaten konnten nicht geladen werden') : null,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['weather'] }),
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  }
}
