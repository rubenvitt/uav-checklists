import { useSyncExternalStore, useCallback } from 'react'
import { useMissionId } from '../context/useMissionId'
import type { MissionSegment } from '../types/mission'
import {
  ensureDefaultSegment,
  createSegment as createSegmentStorage,
  updateSegmentLocationName as updateLocationNameStorage,
  loadMissions,
} from '../utils/missionStorage'
import { setMissionField } from '../stores/missionFormStore'
import { enqueueSuchlage } from '../utils/suchlageStore'

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
const snapshotCache: Record<string, { segments: MissionSegment[]; activeSegmentId: string | null }> = {}

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
    const segment = createSegmentStorage(missionId, label ?? `Standort ${segmentNumber}`)
    // Verknüpft mit Suchlage: dort einen neuen Abschnitt anlegen (über die Ausgangsliste,
    // die Phase wechselt sofort). Ohne Verknüpfung passiert nichts.
    if (segment) {
      enqueueSuchlage(missionId, { kind: 'section', segmentId: segment.id, label: segment.label, location: segment.locationName ?? null })
    }
    setMissionField(missionId, 'autoexpand:visited:vorflugkontrolle', false)
    refresh(missionId)
  }, [missionId, snapshot.segments.length])

  const setLocationName = useCallback((segmentId: string, name: string) => {
    // Verknüpft mit Suchlage: den Ort dort nachreichen, er steht oft erst nach der
    // Verlegung fest. Ohne Verknüpfung passiert nichts.
    if (updateLocationNameStorage(missionId, segmentId, name)) {
      enqueueSuchlage(missionId, { kind: 'sectionUpdate', segmentId })
    }
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
