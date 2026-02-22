import { useSyncExternalStore, useCallback } from 'react'
import { useMissionId } from '../context/MissionContext'
import type { MissionSegment } from '../types/mission'
import {
  ensureDefaultSegment,
  createSegment as createSegmentStorage,
  updateSegmentLocationName as updateLocationNameStorage,
  loadMissions,
} from '../utils/missionStorage'
import { setMissionField } from '../stores/missionFormStore'

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

// Snapshot keyed by missionId
let snapshotCache: Record<string, { segments: MissionSegment[]; activeSegmentId: string | null }> = {}

function getSnapshotForMission(missionId: string) {
  if (!snapshotCache[missionId]) {
    const missions = loadMissions()
    const mission = missions.find(m => m.id === missionId)
    snapshotCache[missionId] = {
      segments: mission?.segments ?? [],
      activeSegmentId: mission?.activeSegmentId ?? null,
    }
  }
  return snapshotCache[missionId]
}

function refresh(missionId: string) {
  delete snapshotCache[missionId]
  emitChange()
}

export function useMissionSegment() {
  const missionId = useMissionId()

  const snapshot = useSyncExternalStore(
    subscribe,
    () => getSnapshotForMission(missionId),
  )

  const activeSegment = snapshot.segments.find(s => s.id === snapshot.activeSegmentId) ?? null
  const isMultiSegment = snapshot.segments.length > 1

  const initializeSegment = useCallback(() => {
    ensureDefaultSegment(missionId)
    refresh(missionId)
  }, [missionId])

  const startRelocation = useCallback((label?: string) => {
    const segmentNumber = snapshot.segments.length + 1
    createSegmentStorage(missionId, label ?? `Standort ${segmentNumber}`)
    setMissionField(missionId, 'autoexpand:visited:vorflugkontrolle', false)
    refresh(missionId)
  }, [missionId, snapshot.segments.length])

  const setLocationName = useCallback((segmentId: string, name: string) => {
    updateLocationNameStorage(missionId, segmentId, name)
    refresh(missionId)
  }, [missionId])

  return {
    segments: snapshot.segments,
    activeSegment,
    activeSegmentId: snapshot.activeSegmentId,
    isMultiSegment,
    initializeSegment,
    startRelocation,
    setLocationName,
  }
}
