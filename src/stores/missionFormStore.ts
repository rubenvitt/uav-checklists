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

/** `uav-form:<missionId>:<key>` zerlegen; `null` für fremde und nicht einsatzbezogene Schlüssel. */
export function parseMissionStorageKey(fullKey: string): { missionId: string; key: string } | null {
  if (!fullKey.startsWith(PREFIX)) return null
  const rest = fullKey.slice(PREFIX.length)
  const sep = rest.indexOf(':')
  if (sep <= 0 || sep === rest.length - 1) return null
  return { missionId: rest.slice(0, sep), key: rest.slice(sep + 1) }
}

/**
 * Einen in einem anderen Tab geschriebenen Eintrag in den Zustand übernehmen.
 * `newValue === null` heißt gelöscht. Ein unlesbarer Eintrag ändert nichts –
 * lieber den bekannten Stand behalten als ein Feld zu verlieren.
 */
export function applyStorageChange(state: MissionState, key: string, newValue: string | null): MissionState {
  if (newValue === null) {
    if (!(key in state)) return state
    const next = { ...state }
    delete next[key]
    return next
  }
  let entry: StoredEntry<unknown>
  try {
    entry = JSON.parse(newValue)
  } catch {
    return state
  }
  if (!entry || typeof entry !== 'object' || !('value' in entry)) return state
  return { ...state, [key]: entry.value }
}

/**
 * Abgleich zwischen Tabs (SUL-83): Der Browser meldet `storage` nur in den
 * *anderen* Tabs, eigene Schreibvorgänge lösen hier also nichts aus – und das
 * Nachziehen schreibt nicht zurück, es entsteht kein Kreislauf. Nur schon
 * angelegte Atome werden nachgezogen; ein neues liest ohnehin frisch.
 */
export function handleStorageEvent(event: Pick<StorageEvent, 'key' | 'newValue' | 'storageArea'>) {
  if (typeof localStorage !== 'undefined' && event.storageArea && event.storageArea !== localStorage) return
  if (event.key === null) {
    // localStorage.clear() in einem anderen Tab
    for (const [missionId, atom] of atomCache) atom.set(hydrateFromLocalStorage(missionId))
    return
  }
  const parsed = parseMissionStorageKey(event.key)
  if (!parsed) return
  const atom = atomCache.get(parsed.missionId)
  if (!atom) return
  // Den aktuellen Stand lesen, nicht `event.newValue`: Hat dieser Tab dasselbe Feld
  // geschrieben, bevor das Ereignis ankam, ist das Ereignis schon überholt.
  const prev = atom.get()
  const next = applyStorageChange(prev, parsed.key, localStorage.getItem(event.key))
  if (next !== prev) atom.set(next)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorageEvent)
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

  // The atom (above) is the source of truth. Persist to localStorage best-effort:
  // a write failure (e.g. quota exceeded by a large inserted signature) must not
  // silently desync the store from storage.
  const entry: StoredEntry<unknown> = { value, timestamp: Date.now() }
  try {
    localStorage.setItem(`${PREFIX}${missionId}:${key}`, JSON.stringify(entry))
  } catch (err) {
    console.warn(`[missionFormStore] localStorage write failed for "${key}":`, err)
  }
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
