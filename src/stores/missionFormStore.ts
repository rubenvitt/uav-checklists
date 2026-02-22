import { createAtom, type Atom } from '@tanstack/store'

const PREFIX = 'uav-form:'
const TTL = 56 * 60 * 60 * 1000 // 56h

interface StoredEntry<T> {
  value: T
  timestamp: number
}

type MissionState = Record<string, unknown>

// One atom per missionId, lazily created
const atomCache = new Map<string, Atom<MissionState>>()

function hydrateFromLocalStorage(missionId: string): MissionState {
  const prefix = `${PREFIX}${missionId}:`
  const state: MissionState = {}
  const now = Date.now()

  for (let i = 0; i < localStorage.length; i++) {
    const fullKey = localStorage.key(i)
    if (!fullKey || !fullKey.startsWith(prefix)) continue

    const key = fullKey.slice(prefix.length)
    try {
      const entry: StoredEntry<unknown> = JSON.parse(localStorage.getItem(fullKey)!)
      if (now - entry.timestamp > TTL) {
        localStorage.removeItem(fullKey)
      } else {
        state[key] = entry.value
      }
    } catch {
      // corrupt entry — skip
    }
  }
  return state
}

export function getMissionAtom(missionId: string): Atom<MissionState> {
  let atom = atomCache.get(missionId)
  if (!atom) {
    atom = createAtom(hydrateFromLocalStorage(missionId))
    atomCache.set(missionId, atom)
  }
  return atom
}

export function setMissionField(missionId: string, key: string, value: unknown) {
  const atom = getMissionAtom(missionId)
  atom.set((prev) => ({ ...prev, [key]: value }))

  const entry: StoredEntry<unknown> = { value, timestamp: Date.now() }
  localStorage.setItem(`${PREFIX}${missionId}:${key}`, JSON.stringify(entry))
}

export function getMissionField<T>(missionId: string, key: string, fallback: T): T {
  const atom = getMissionAtom(missionId)
  const value = atom.get()[key]
  return value === undefined ? fallback : (value as T)
}

export function clearMissionFieldsByPrefix(prefix: string, missionId: string) {
  const atom = getMissionAtom(missionId)
  const fullLsPrefix = `${PREFIX}${missionId}:${prefix}`

  // Remove from localStorage
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(fullLsPrefix)) {
      keysToRemove.push(k)
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))

  // Remove from atom
  atom.set((prev) => {
    const next = { ...prev }
    for (const key of Object.keys(next)) {
      if (key.startsWith(prefix)) {
        delete next[key]
      }
    }
    return next
  })
}
