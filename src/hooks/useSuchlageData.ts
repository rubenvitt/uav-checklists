import { useEffect } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMissionId } from '../context/useMissionId'
import { useSegmentPersistedState } from './useSegmentPersistedState'
import { errorKindOf, useSuchlageMission, type SuchlageMission } from './useSuchlage'
import { isRestingErrorKind, isSuchlageError, suchlage } from '../services/suchlageApi'
import { hintSuchlageRemoteState, setSuchlageRemoteState } from '../utils/suchlageStore'
import { storeSuchlageMap, type StoredSuchlageMap } from '../utils/suchlageMapStore'
import { hasRunningFlight } from '../utils/suchlageFlights'
import type { FmFlight } from '../types/suchlage'

export const FLIGHTS_POLL_RUNNING_MS = 15_000
export const FLIGHTS_POLL_IDLE_MS = 60_000
export const MAP_POLL_MS = 60_000

/**
 * Lesefehler bei Flügen/Karte auswerten: 409 → von anderer Flugmappe
 * übernommen, 401/403/503 → Probe neu (Teile ruhen), 404 → nur den Zustand
 * des Einsatzes neu prüfen. Ob er weg ist, entscheidet allein `GET /missions/{id}`.
 */
export function handleSuchlageReadError(missionId: string, error: unknown, queryClient: QueryClient): void {
  const kind = errorKindOf(error)
  if (!kind) return
  const status = isSuchlageError(error) ? error.status : null
  if (kind === 'conflict') hintSuchlageRemoteState(missionId, 'replaced')
  else if (isRestingErrorKind(kind)) void queryClient.invalidateQueries({ queryKey: ['suchlage', 'me'] })
  else if (status === 404) void queryClient.invalidateQueries({ queryKey: ['suchlage', 'mission'] })
}

/**
 * Zustand des verknüpften Einsatzes in Suchlage (`GET /missions/{id}`), solange
 * ein Einsatz offen ist, jede Minute: abgeschlossen, gelöscht (404) oder von
 * einer anderen Flugmappe übernommen (409). Liefert er wieder 200, löst sich
 * „weg“ bzw. „abgelöst“ wieder auf. Einmal je Einsatz eingehängt (Router).
 */
export function useSuchlageRemoteWatch(): void {
  const missionId = useMissionId()
  const queryClient = useQueryClient()
  const sl = useSuchlageMission()
  const id = sl.link?.suchlageMissionId ?? null
  const closed = sl.link?.remoteState === 'closed'
  const mission = useQuery({
    queryKey: ['suchlage', 'mission', id, missionId],
    queryFn: ({ signal }) => suchlage.mission(id!, missionId, signal),
    enabled: sl.linked && id !== null,
    refetchInterval: closed ? false : FLIGHTS_POLL_IDLE_MS,
    staleTime: 30_000,
    retry: false,
    meta: { persist: false },
  })

  useEffect(() => {
    if (!mission.data) return
    setSuchlageRemoteState(missionId, mission.data.state === 'closed' ? 'closed' : undefined)
  }, [mission.data, mission.dataUpdatedAt, missionId])

  useEffect(() => {
    if (!mission.error) return
    const kind = errorKindOf(mission.error)
    const status = isSuchlageError(mission.error) ? mission.error.status : null
    if (status === 404) setSuchlageRemoteState(missionId, 'gone')
    else if (kind === 'conflict') setSuchlageRemoteState(missionId, 'replaced')
    else if (kind && isRestingErrorKind(kind)) void queryClient.invalidateQueries({ queryKey: ['suchlage', 'me'] })
  }, [mission.error, mission.errorUpdatedAt, missionId, queryClient])
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

  useEffect(() => {
    if (query.error) handleSuchlageReadError(missionId, query.error, queryClient)
  }, [query.error, query.errorUpdatedAt, missionId, queryClient])

  const kind = errorKindOf(query.error)
  return {
    flights: sl.linked ? query.data ?? null : null,
    unreachable: sl.linked && kind === 'offline',
  }
}

/**
 * Karte des aktiven Abschnitts aus Suchlage. Abgefragt wird erst, wenn der
 * Abschnitt in Suchlage angelegt ist (`sectionPending` sonst). Der letzte
 * Stand liegt ausgedünnt unter `seg:<id>:suchlage:map`, damit die Karte
 * offline sichtbar bleibt.
 */
export function useSuchlageMap(sl: SuchlageMission, segmentId: string | null) {
  const missionId = useMissionId()
  const queryClient = useQueryClient()
  const [stored] = useSegmentPersistedState<StoredSuchlageMap | null>('suchlage:map', null)
  const id = sl.link?.suchlageMissionId ?? null
  const remote = sl.link?.remoteState
  const sectionKnown = !!(segmentId && sl.link?.sections[segmentId])
  const query = useQuery({
    queryKey: ['suchlage', 'map', id, missionId, segmentId],
    queryFn: ({ signal }) => suchlage.map(id!, missionId, segmentId, signal),
    enabled: sl.linked && id !== null && sectionKnown && remote !== 'gone' && remote !== 'replaced',
    refetchInterval: MAP_POLL_MS,
    staleTime: 30_000,
    retry: false,
    meta: { persist: false },
  })

  useEffect(() => {
    if (query.data && segmentId) storeSuchlageMap(missionId, segmentId, query.data, query.dataUpdatedAt)
  }, [query.data, query.dataUpdatedAt, missionId, segmentId])

  useEffect(() => {
    if (query.error) handleSuchlageReadError(missionId, query.error, queryClient)
  }, [query.error, query.errorUpdatedAt, missionId, queryClient])

  const kind = errorKindOf(query.error)
  return {
    map: query.data ?? stored?.data ?? null,
    loadedAt: query.data ? query.dataUpdatedAt : stored?.loadedAt ?? null,
    loading: query.isPending && query.fetchStatus === 'fetching' && !stored,
    /** Verknüpft, aber der Abschnitt ist in Suchlage noch nicht angelegt (Ausgangsliste). */
    sectionPending: sl.linked && !!segmentId && !sectionKnown,
    unreachable: kind === 'offline',
    refetch: () => void query.refetch(),
  }
}
