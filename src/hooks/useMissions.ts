import { useSyncExternalStore, useCallback } from 'react'
import type { Mission, MissionPhase } from '../types/mission'
import {
  loadMissions,
  createMission as createMissionStorage,
  deleteMission as deleteMissionStorage,
  restoreMission as restoreMissionStorage,
  purgeMission as purgeMissionStorage,
  updateMissionPhase as updateMissionPhaseStorage,
  completeMission as completeMissionStorage,
  cleanExpiredMissions,
} from '../utils/missionStorage'

let listeners: Array<() => void> = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

let snapshot = loadMissions()

function getSnapshot(): Mission[] {
  return snapshot
}

function refresh() {
  snapshot = loadMissions()
  emitChange()
}

export function useMissions() {
  const missions = useSyncExternalStore(subscribe, getSnapshot)

  const create = useCallback((): Mission => {
    const mission = createMissionStorage()
    refresh()
    return mission
  }, [])

  const remove = useCallback((missionId: string) => {
    deleteMissionStorage(missionId)
    refresh()
  }, [])

  const restore = useCallback((missionId: string) => {
    restoreMissionStorage(missionId)
    refresh()
  }, [])

  const purge = useCallback((missionId: string) => {
    purgeMissionStorage(missionId)
    refresh()
  }, [])

  const updatePhase = useCallback((missionId: string, phase: MissionPhase) => {
    updateMissionPhaseStorage(missionId, phase)
    refresh()
  }, [])

  const complete = useCallback((missionId: string) => {
    completeMissionStorage(missionId)
    refresh()
  }, [])

  const clean = useCallback(() => {
    cleanExpiredMissions()
    refresh()
  }, [])

  return { missions, create, remove, restore, purge, updatePhase, complete, clean }
}
