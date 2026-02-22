import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMissionPersistedState } from './useMissionPersistedState'
import { useSegmentPersistedState } from './useSegmentPersistedState'
import { fetchWeather } from '../services/weatherApi'
import { fetchKIndex } from '../services/kIndexApi'
import { fetchNearbyPOIs, type NearbyCategory } from '../services/overpassApi'
import type { WeatherResponse, WeatherData, SunData, WindAtAltitude, HourlyForecastPoint } from '../types/weather'
import { setMissionField } from '../stores/missionFormStore'

/* ── Weather ──────────────────────────────────────────────── */

interface UseMissionWeatherResult {
  current: WeatherData | null
  sun: SunData | null
  windByAltitude: WindAtAltitude[] | null
  hourlyForecast: HourlyForecastPoint[] | null
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}

export function useMissionWeather(lat: number | null, lon: number | null, maxAltitude: number = 120): UseMissionWeatherResult {
  const queryClient = useQueryClient()
  const [persisted, setPersisted] = useSegmentPersistedState<WeatherResponse | null>('env:weather', null)
  const [persistedAlt, setPersistedAlt] = useSegmentPersistedState<number>('env:weather:alt', 120)
  const [persistedCoords, setPersistedCoords] = useSegmentPersistedState<string | null>('env:weather:coords', null)

  const roundedLat = lat !== null ? Math.round(lat * 1000) / 1000 : null
  const roundedLon = lon !== null ? Math.round(lon * 1000) / 1000 : null
  const hasLocation = lat !== null && lon !== null
  const currentCoords = hasLocation ? `${roundedLat},${roundedLon}` : null

  // Auto-invalidate when coordinates change significantly
  useEffect(() => {
    if (persisted !== null && currentCoords !== null && persistedCoords !== null && currentCoords !== persistedCoords) {
      setPersisted(null)
      setPersistedCoords(null)
      setPersistedAlt(120)
      queryClient.removeQueries({ queryKey: ['weather'] })
    }
  }, [currentCoords, persistedCoords, persisted, setPersisted, setPersistedCoords, setPersistedAlt, queryClient])

  // Need to fetch if: no persisted data, or altitude changed since last fetch
  const needsFetch = persisted === null || persistedAlt !== maxAltitude
  const shouldFetch = hasLocation && needsFetch

  const query = useQuery<WeatherResponse>({
    queryKey: ['weather', roundedLat, roundedLon, maxAltitude],
    queryFn: () => fetchWeather(lat!, lon!, maxAltitude),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: shouldFetch,
  })

  // Persist when data arrives
  useEffect(() => {
    if (query.data && needsFetch) {
      setPersisted(query.data)
      setPersistedAlt(maxAltitude)
      setPersistedCoords(currentCoords)
    }
  }, [query.data, needsFetch, maxAltitude, currentCoords, setPersisted, setPersistedAlt, setPersistedCoords])

  const data = needsFetch ? (query.data ?? persisted) : persisted

  const refresh = useCallback(() => {
    setPersisted(null)
    queryClient.removeQueries({ queryKey: ['weather'] })
  }, [queryClient, setPersisted])

  return {
    current: data?.current ?? null,
    sun: data?.sun ?? null,
    windByAltitude: data?.windByAltitude ?? null,
    hourlyForecast: data?.hourlyForecast ?? null,
    loading: shouldFetch && query.isLoading,
    error: shouldFetch && query.error
      ? (query.error instanceof Error ? query.error.message : 'Wetterdaten konnten nicht geladen werden')
      : null,
    refresh,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  }
}

/* ── K-Index ──────────────────────────────────────────────── */

interface UseMissionKIndexResult {
  kIndex: number | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useMissionKIndex(): UseMissionKIndexResult {
  const queryClient = useQueryClient()
  const [persisted, setPersisted] = useMissionPersistedState<{ kIndex: number } | null>('env:kindex', null)

  const shouldFetch = persisted === null

  const query = useQuery({
    queryKey: ['kindex'],
    queryFn: fetchKIndex,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: shouldFetch,
  })

  useEffect(() => {
    if (query.data && persisted === null) {
      setPersisted(query.data)
    }
  }, [query.data, persisted, setPersisted])

  const data = persisted ?? query.data ?? null

  const refresh = useCallback(() => {
    setPersisted(null)
    queryClient.removeQueries({ queryKey: ['kindex'] })
  }, [queryClient, setPersisted])

  return {
    kIndex: data?.kIndex ?? null,
    loading: shouldFetch && query.isLoading,
    error: shouldFetch && query.error
      ? (query.error instanceof Error ? query.error.message : 'K-Index konnte nicht geladen werden')
      : null,
    refresh,
  }
}

/* ── Nearby POIs ──────────────────────────────────────────── */

interface UseMissionNearbyResult {
  categories: NearbyCategory[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useMissionNearby(lat: number | null, lon: number | null): UseMissionNearbyResult {
  const queryClient = useQueryClient()
  const [persisted, setPersisted] = useSegmentPersistedState<NearbyCategory[] | null>('env:nearby', null)
  const [persistedCoords, setPersistedCoords] = useSegmentPersistedState<string | null>('env:nearby:coords', null)

  const roundedLat = lat !== null ? Math.round(lat * 1000) / 1000 : null
  const roundedLon = lon !== null ? Math.round(lon * 1000) / 1000 : null
  const hasLocation = lat !== null && lon !== null
  const currentCoords = hasLocation ? `${roundedLat},${roundedLon}` : null

  // Auto-invalidate when coordinates change significantly
  useEffect(() => {
    if (persisted !== null && currentCoords !== null && persistedCoords !== null && currentCoords !== persistedCoords) {
      setPersisted(null)
      setPersistedCoords(null)
      queryClient.removeQueries({ queryKey: ['nearby'] })
    }
  }, [currentCoords, persistedCoords, persisted, setPersisted, setPersistedCoords, queryClient])

  const shouldFetch = hasLocation && persisted === null

  const query = useQuery({
    queryKey: ['nearby', roundedLat, roundedLon],
    queryFn: () => fetchNearbyPOIs(lat!, lon!),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: shouldFetch,
  })

  useEffect(() => {
    if (query.data && persisted === null) {
      setPersisted(query.data)
      setPersistedCoords(currentCoords)
    }
  }, [query.data, persisted, currentCoords, setPersisted, setPersistedCoords])

  const data = persisted ?? query.data ?? null

  const refresh = useCallback(() => {
    setPersisted(null)
    queryClient.removeQueries({ queryKey: ['nearby'] })
  }, [queryClient, setPersisted])

  return {
    categories: data ?? [],
    loading: shouldFetch && query.isLoading,
    error: shouldFetch && query.error
      ? (query.error instanceof Error ? query.error.message : 'Umgebungsdaten konnten nicht geladen werden')
      : null,
    refresh,
  }
}

/* ── Clear all environment data for a mission ─────────────── */

export function clearMissionEnvironment(missionId: string, segmentId?: string | null) {
  const prefix = segmentId ? `seg:${segmentId}:` : ''
  setMissionField(missionId, `${prefix}env:weather`, null)
  setMissionField(missionId, `${prefix}env:weather:alt`, null)
  setMissionField(missionId, `${prefix}env:weather:coords`, null)
  setMissionField(missionId, 'env:kindex', null)
  setMissionField(missionId, `${prefix}env:nearby`, null)
  setMissionField(missionId, `${prefix}env:nearby:coords`, null)
}
