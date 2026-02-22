import { loadMissions, saveMissions, generateId } from './missionStorage'
import type { Mission } from '../types/mission'

const MIGRATED_KEY = 'uav-migrated'
const MIGRATED_V2_KEY = 'uav-migrated-v2'

export function migrateOldData() {
  if (localStorage.getItem(MIGRATED_KEY)) return

  // Check if there are old-format keys (uav-form:key without missionId UUID pattern)
  const oldKeys: string[] = []
  const uuidPattern = /^uav-form:[0-9a-f]{8}-[0-9a-f]{4}-/
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('uav-form:') && !uuidPattern.test(k)) {
      oldKeys.push(k)
    }
  }

  const oldManualLocation = localStorage.getItem('uav-manual-location')

  if (oldKeys.length === 0 && !oldManualLocation) {
    localStorage.setItem(MIGRATED_KEY, '1')
    return
  }

  // Create a migration mission
  const now = new Date()
  const mission: Mission = {
    id: generateId(),
    createdAt: Date.now(),
    label: `Einsatz ${now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} (migriert)`,
    phase: 'einsatzdaten',
    segments: [],
    activeSegmentId: null,
  }

  // Migrate form keys
  for (const oldKey of oldKeys) {
    const suffix = oldKey.replace('uav-form:', '')
    const newKey = `uav-form:${mission.id}:${suffix}`
    const value = localStorage.getItem(oldKey)
    if (value) {
      localStorage.setItem(newKey, value)
    }
    localStorage.removeItem(oldKey)
  }

  // Migrate manual location
  if (oldManualLocation) {
    localStorage.setItem(`uav-manual-location:${mission.id}`, oldManualLocation)
    localStorage.removeItem('uav-manual-location')
  }

  // Save mission
  const missions = loadMissions()
  missions.push(mission)
  saveMissions(missions)

  localStorage.setItem(MIGRATED_KEY, '1')
}

export function migrateLocationToSegment() {
  if (localStorage.getItem(MIGRATED_V2_KEY)) return

  const missions = loadMissions()
  for (const mission of missions) {
    const seg = mission.segments[0]
    if (!seg) continue
    const oldKey = `uav-manual-location:${mission.id}`
    const newKey = `uav-manual-location:${mission.id}:seg:${seg.id}`
    const oldValue = localStorage.getItem(oldKey)
    if (oldValue && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldValue)
    }
  }

  localStorage.setItem(MIGRATED_V2_KEY, '1')
}
