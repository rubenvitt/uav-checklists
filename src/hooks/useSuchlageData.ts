import { useEffect } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMissionId } from '../context/useMissionId'
import { useSegmentPersistedState } from './useSegmentPersistedState'
import { errorKindOf, type SuchlageMission } from './useSuchlage'
import { isAuthErrorKind, isSuchlageError, isTransientErrorKind, suchlage } from '../services/suchlageApi'
import { setSuchlageRemoteState } from '../utils/suchlageStore'
import { hasRunningFlight } from '../utils/suchlageFlights'
import type { FmFeatureCollection, FmFlight } from '../types/suchlage'

export const FLIGHTS_POLL_RUNNING_MS = 15_000
export const FLIGHTS_POLL_IDLE_MS = 60_000
export const MAP_POLL_MS = 60_000

/** Lesefehler auswerten: 404 → Einsatz weg, 409 → von anderer Flugmappe übernommen, 401/403 → Probe neu. */
export function handleSuchlageReadError(missionId: string, error: unknown, queryClient: QueryClient): void {
  const kind = errorKindOf(error)
  if (!kind) return
  const status = isSuchlageError(error) ? error.status : null
  if (status === 404) setSuchlageRemoteState(missionId, 'gone')
  else if (kind === 'conflict') setSuchlageRemoteState(missionId, 'replaced')
  else if (isAuthErrorKind(kind)) void queryClient.invalidateQueries({ queryKey: ['suchlage', 'me'] })
}

/**
 * Flüge des verknüpften Einsatzes, solange die Phase „Flüge“ offen ist: alle
 * 15 s während eines Flugs (lokal offen oder in Suchlage laufend), sonst alle
 * 60 s. Der letzte Stand bleibt im (persistierten) Query-Cache für offline.
 */
export function useSuchlageFlights(sl: SuchlageMission, localFlightOpen: boolean) {
  const missionId = useMissionId()
  const queryClient = useQueryClient()
  const id = sl.link?.suchlageMissionId ?? null
  const query = useQuery({
    queryKey: ['suchlage', 'flights', id, missionId],
    queryFn: ({ signal }) => suchlage.flights(id!, missionId, signal),
    enabled: sl.linked && id !== null && !sl.remoteEnded,
    refetchInterval: (q) =>
      localFlightOpen || hasRunningFlight((q.state.data as FmFlight[] | undefined) ?? [])
        ? FLIGHTS_POLL_RUNNING_MS
        : FLIGHTS_POLL_IDLE_MS,
    staleTime: 10_000,
    retry: false,
  })

  // Abgeschlossen erkennen: Zustand des Einsatzes in Suchlage.
  const mission = useQuery({
    queryKey: ['suchlage', 'mission', id, missionId],
    queryFn: ({ signal }) => suchlage.mission(id!, missionId, signal),
    enabled: sl.linked && id !== null && !sl.remoteEnded,
    refetchInterval: FLIGHTS_POLL_IDLE_MS,
    staleTime: 30_000,
    retry: false,
    meta: { persist: false },
  })

  useEffect(() => {
    if (query.error) handleSuchlageReadError(missionId, query.error, queryClient)
  }, [query.error, query.errorUpdatedAt, missionId, queryClient])

  useEffect(() => {
    if (mission.data?.state === 'closed') setSuchlageRemoteState(missionId, 'closed')
  }, [mission.data, missionId])

  useEffect(() => {
    if (mission.error) handleSuchlageReadError(missionId, mission.error, queryClient)
  }, [mission.error, mission.errorUpdatedAt, missionId, queryClient])

  const kind = errorKindOf(query.error)
  return {
    flights: sl.linked ? query.data ?? null : null,
    unreachable: sl.linked && kind !== null && isTransientErrorKind(kind),
  }
}

export interface StoredSuchlageMap {
  data: FmFeatureCollection
  loadedAt: number
}

/**
 * Karte des aktiven Abschnitts aus Suchlage. Der letzte Stand liegt unter
 * `seg:<id>:suchlage:map`, damit sie offline sichtbar bleibt.
 */
export function useSuchlageMap(sl: SuchlageMission, segmentId: string | null) {
  const missionId = useMissionId()
  const queryClient = useQueryClient()
  const [stored, setStored] = useSegmentPersistedState<StoredSuchlageMap | null>('suchlage:map', null)
  const id = sl.link?.suchlageMissionId ?? null
  const remote = sl.link?.remoteState
  const query = useQuery({
    queryKey: ['suchlage', 'map', id, missionId, segmentId],
    queryFn: ({ signal }) => suchlage.map(id!, missionId, segmentId, signal),
    enabled: sl.linked && id !== null && remote !== 'gone' && remote !== 'replaced',
    refetchInterval: MAP_POLL_MS,
    staleTime: 30_000,
    retry: false,
    meta: { persist: false },
  })

  useEffect(() => {
    if (query.data) setStored({ data: query.data, loadedAt: query.dataUpdatedAt })
  }, [query.data, query.dataUpdatedAt, setStored])

  useEffect(() => {
    if (query.error) handleSuchlageReadError(missionId, query.error, queryClient)
  }, [query.error, query.errorUpdatedAt, missionId, queryClient])

  const kind = errorKindOf(query.error)
  return {
    map: query.data ?? stored?.data ?? null,
    loadedAt: query.data ? query.dataUpdatedAt : stored?.loadedAt ?? null,
    loading: query.isPending && query.fetchStatus === 'fetching' && !stored,
    unreachable: kind !== null && isTransientErrorKind(kind),
    refetch: () => void query.refetch(),
  }
}
