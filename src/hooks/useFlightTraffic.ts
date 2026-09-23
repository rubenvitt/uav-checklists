import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSegmentPersistedState } from './useSegmentPersistedState'
import { AdsbError, fetchFlightTraffic, isAdsbConfigured, type AdsbErrorKind } from '../services/adsbApi'
import { haversineDistance } from '../utils/geo'
import type { FlightTrafficSnapshot } from '../types/traffic'

/** Echtzeitdaten: nach 30 s veraltet, standardmäßig jede Minute neu laden */
const STALE_MS = 30_000
const DEFAULT_REFETCH_MS = 60_000
/** Ohne erreichbaren Server nur selten erneut versuchen */
const NO_SERVER_RETRY_MS = 5 * 60_000
/** Ein gespeicherter Snapshot gilt nur, solange sich der Standort kaum geändert hat */
const SNAPSHOT_MAX_OFFSET_M = 500

interface UseFlightTrafficOptions {
  /** Abfrageintervall in ms (Default 60 s) */
  refetchMs?: number
  /** Auch abfragen, während der Tab im Hintergrund ist */
  refetchInBackground?: boolean
  /**
   * Letzten Stand als Snapshot des Abschnitts speichern (Default true). Die
   * Überwachung während der Flüge setzt false, damit der Stand der
   * Vorflugkontrolle im Bericht erhalten bleibt.
   */
  persist?: boolean
}

export type FlightTrafficErrorKind = AdsbErrorKind

interface UseFlightTrafficResult {
  /** Aktuelle Daten, sonst der zuletzt gespeicherte Snapshot für diesen Standort */
  snapshot: FlightTrafficSnapshot | null
  /** true, wenn `snapshot` aus der laufenden Abfrage stammt (nicht aus dem Speicher) */
  isLive: boolean
  configured: boolean
  loading: boolean
  fetching: boolean
  error: string | null
  /** Art des Fehlers — `no-server` ist kein Datenfehler, sondern fehlende Verbindung zum Proxy */
  errorKind: FlightTrafficErrorKind | null
  refresh: () => void
}

function errorKindOf(error: unknown): FlightTrafficErrorKind {
  return error instanceof AdsbError ? error.kind : 'http'
}

export function useFlightTraffic(
  lat: number | null,
  lon: number | null,
  radiusKm: number,
  { refetchMs = DEFAULT_REFETCH_MS, refetchInBackground = false, persist = true }: UseFlightTrafficOptions = {},
): UseFlightTrafficResult {
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
    refetchInterval: (q) => (q.state.error && errorKindOf(q.state.error) === 'no-server' ? NO_SERVER_RETRY_MS : refetchMs),
    refetchIntervalInBackground: refetchInBackground,
    // Fehlender Server bzw. fehlendes Netz lösen sich nicht in Sekunden
    retry: (count, error) => count < 1 && errorKindOf(error) !== 'no-server' && errorKindOf(error) !== 'offline',
    enabled,
  })

  // Letzten Stand je Abschnitt sichern — für PDF-Bericht und Offline-Anzeige
  useEffect(() => {
    if (persist && query.data && query.data.fetchedAt !== persisted?.fetchedAt) {
      setPersisted(query.data)
    }
  }, [persist, query.data, persisted?.fetchedAt, setPersisted])

  const persistedMatches =
    persisted !== null && lat !== null && lon !== null &&
    haversineDistance(lat, lon, persisted.lat, persisted.lon) <= SNAPSHOT_MAX_OFFSET_M

  const snapshot = query.data ?? (persistedMatches ? persisted : null)
  const errorKind = enabled && query.error ? errorKindOf(query.error) : null

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
    errorKind,
    refresh,
  }
}
