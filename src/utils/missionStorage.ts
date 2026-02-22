import type { Mission, MissionPhase, MissionSegment } from '../types/mission'
import { readStorage } from '../hooks/usePersistedState'

const MISSIONS_KEY = 'uav-missions'
const MISSION_TTL = 56 * 60 * 60 * 1000 // 56h
const COMPLETED_TTL = 24 * 60 * 60 * 1000 // 24h

export function generateId(): string {
  // crypto.randomUUID() requires a secure context (HTTPS/localhost).
  // Fallback for HTTP access over LAN.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID() } catch { /* fall through */ }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function loadMissions(): Mission[] {
  try {
    const raw = localStorage.getItem(MISSIONS_KEY)
    if (!raw) return []
    const missions = JSON.parse(raw) as Mission[]
    // Ensure backward compatibility: add segments fields if missing
    for (const m of missions) {
      if (!m.segments) m.segments = []
      if (m.activeSegmentId === undefined) m.activeSegmentId = null
    }
    return missions
  } catch {
    return []
  }
}

export function saveMissions(missions: Mission[]) {
  localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions))
}

export function createMission(): Mission {
  const now = new Date()
  const label = `Einsatz ${now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  const firstSegment: MissionSegment = {
    id: generateId(),
    createdAt: Date.now(),
    label: 'Standort 1',
    status: 'active',
  }
  const mission: Mission = {
    id: generateId(),
    createdAt: Date.now(),
    label,
    phase: 'einsatzdaten',
    segments: [firstSegment],
    activeSegmentId: firstSegment.id,
  }
  const missions = loadMissions()
  missions.push(mission)
  saveMissions(missions)
  return mission
}

export function deleteMission(missionId: string) {
  const missions = loadMissions().filter((m) => m.id !== missionId)
  saveMissions(missions)
  clearMissionStorage(missionId)
}

export function updateMissionPhase(missionId: string, phase: Mission['phase']) {
  const missions = loadMissions()
  const mission = missions.find((m) => m.id === missionId)
  if (mission) {
    mission.phase = phase
    saveMissions(missions)
  }
}

export function completeMission(missionId: string) {
  const missions = loadMissions()
  const mission = missions.find((m) => m.id === missionId)
  if (mission) {
    mission.completedAt = Date.now()
    saveMissions(missions)
  }
}

export function getMission(missionId: string): Mission | undefined {
  return loadMissions().find((m) => m.id === missionId)
}

export function isMissionExpired(mission: Mission): boolean {
  if (mission.completedAt) {
    return Date.now() - mission.completedAt > COMPLETED_TTL
  }
  return Date.now() - mission.createdAt > MISSION_TTL
}

export function cleanExpiredMissions() {
  const missions = loadMissions()
  const expired = missions.filter((m) => isMissionExpired(m))
  if (expired.length === 0) return
  for (const m of expired) {
    clearMissionStorage(m.id)
  }
  saveMissions(missions.filter((m) => !isMissionExpired(m)))
}

export function clearMissionStorage(missionId: string) {
  const prefix = `uav-form:${missionId}:`
  const locationKey = `uav-manual-location:${missionId}`
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && (k.startsWith(prefix) || k.startsWith(locationKey))) {
      keysToRemove.push(k)
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}

/* ── Segment management ─────────────────────────────────────── */

export function getSegments(missionId: string): MissionSegment[] {
  const mission = getMission(missionId)
  return mission?.segments ?? []
}

export function getActiveSegment(missionId: string): MissionSegment | null {
  const mission = getMission(missionId)
  if (!mission?.activeSegmentId) return null
  return mission.segments.find(s => s.id === mission.activeSegmentId) ?? null
}

export function ensureDefaultSegment(missionId: string): MissionSegment | null {
  const missions = loadMissions()
  const mission = missions.find(m => m.id === missionId)
  if (!mission) return null
  if (mission.segments.length > 0) {
    return mission.segments.find(s => s.id === mission.activeSegmentId) ?? null
  }
  const segment: MissionSegment = {
    id: generateId(),
    createdAt: Date.now(),
    label: 'Standort 1',
    status: 'active',
  }
  mission.segments = [segment]
  mission.activeSegmentId = segment.id
  saveMissions(missions)
  return segment
}

export function createSegment(missionId: string, label: string): MissionSegment | null {
  const missions = loadMissions()
  const mission = missions.find(m => m.id === missionId)
  if (!mission) return null
  // Complete the current active segment
  for (const seg of mission.segments) {
    if (seg.status === 'active') seg.status = 'completed'
  }
  const segment: MissionSegment = {
    id: generateId(),
    createdAt: Date.now(),
    label,
    status: 'active',
  }
  mission.segments.push(segment)
  mission.activeSegmentId = segment.id
  saveMissions(missions)
  return segment
}

export function updateSegmentLocationName(missionId: string, segmentId: string, name: string) {
  const missions = loadMissions()
  const mission = missions.find(m => m.id === missionId)
  if (!mission) return
  const segment = mission.segments.find(s => s.id === segmentId)
  if (segment) {
    segment.locationName = name
    saveMissions(missions)
  }
}

export function canAccessPhase(missionId: string, phase: MissionPhase): boolean {
  if (phase === 'einsatzdaten' || phase === 'vorflugkontrolle') return true
  // Read flugfreigabe segment-specifically
  const mission = getMission(missionId)
  const segmentId = mission?.activeSegmentId
  const flugfreigabeKey = segmentId ? `seg:${segmentId}:flugfreigabe` : 'flugfreigabe'
  const flugfreigabe = readStorage<string | null>(flugfreigabeKey, null, missionId)
  if (phase === 'fluege') return !!flugfreigabe
  if (phase === 'nachbereitung') {
    const fluegeAbgeschlossen = readStorage<boolean>('fluegeAbgeschlossen', false, missionId)
    return !!flugfreigabe && fluegeAbgeschlossen
  }
  return false
}

export function getRemainingTime(mission: Mission): string {
  const ttl = mission.completedAt ? COMPLETED_TTL : MISSION_TTL
  const base = mission.completedAt ?? mission.createdAt
  const elapsed = Date.now() - base
  const remaining = ttl - elapsed
  if (remaining <= 0) return 'Abgelaufen'
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  return `${hours}h ${minutes}m`
}
