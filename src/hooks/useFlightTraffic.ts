import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSegmentPersistedState } from './useSegmentPersistedState'
import { fetchFlightTraffic, isAdsbConfigured } from '../services/adsbApi'
import { haversineDistance } from '../utils/geo'
import type { FlightTrafficSnapshot } from '../types/traffic'

/** Echtzeitdaten: nach 30 s veraltet, jede Minute automatisch neu laden */
const STALE_MS = 30_000
const REFETCH_MS = 60_000
/** Ein gespeicherter Snapshot gilt nur, solange sich der Standort kaum geändert hat */
const SNAPSHOT_MAX_OFFSET_M = 500

interface UseFlightTrafficResult {
  /** Aktuelle Daten, sonst der zuletzt gespeicherte Snapshot für diesen Standort */
  snapshot: FlightTrafficSnapshot | null
  /** true, wenn `snapshot` aus der laufenden Abfrage stammt (nicht aus dem Speicher) */
  isLive: boolean
  configured: boolean
  loading: boolean
  fetching: boolean
  error: string | null
  refresh: () => void
}

export function useFlightTraffic(lat: number | null, lon: number | null, radiusKm: number): UseFlightTrafficResult {
  const queryClient = useQueryClient()
  const [persisted, setPersisted] = useSegmentPersistedState<FlightTrafficSnapshot | null>('env:traffic', null)

  const configured = isAdsbConfigured()
  const roundedLat = lat !== null ? Math.round(lat * 1000) / 1000 : null
  const roundedLon = lon !== null ? Math.round(lon * 1000) / 1000 : null
  const hasLocation = lat !== null && lon !== null
  const enabled = configured && hasLocation

  const query = useQuery<FlightTrafficSnapshot>({
    queryKey: ['traffic', roundedLat, roundedLon, radiusKm],
    queryFn: () => fetchFlightTraffic(lat!, lon!, radiusKm),
    staleTime: STALE_MS,
    gcTime: 5 * 60_000,
    refetchInterval: REFETCH_MS,
    retry: 1,
    enabled,
  })

  // Letzten Stand je Abschnitt sichern — für PDF-Bericht und Offline-Anzeige
  useEffect(() => {
    if (query.data && query.data.fetchedAt !== persisted?.fetchedAt) {
      setPersisted(query.data)
    }
  }, [query.data, persisted?.fetchedAt, setPersisted])

  const persistedMatches =
    persisted !== null && lat !== null && lon !== null &&
    haversineDistance(lat, lon, persisted.lat, persisted.lon) <= SNAPSHOT_MAX_OFFSET_M

  const snapshot = query.data ?? (persistedMatches ? persisted : null)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['traffic'] })
  }

  return {
    snapshot,
    isLive: !!query.data && !query.isError,
    configured,
    loading: enabled && query.isLoading,
    fetching: enabled && query.isFetching,
    error: enabled && query.error
      ? (query.error instanceof Error ? query.error.message : 'Flugverkehrsdaten konnten nicht geladen werden')
      : null,
    refresh,
  }
}
