import { useStore } from '@tanstack/react-store'
import { useState, useCallback, useRef } from 'react'
import { getMissionAtom, setMissionField, getMissionField, clearMissionFieldsByPrefix } from '../stores/missionFormStore'

const PREFIX = 'uav-form:'
const TTL = 56 * 60 * 60 * 1000 // 56h

interface StoredEntry<T> {
  value: T
  timestamp: number
}

/**
 * Read a value — from TanStack Store (mission-scoped) or localStorage (non-mission).
 * For mission-scoped keys this reads from the in-memory store cache.
 */
export function readStorage<T>(key: string, fallback: T, missionId?: string): T {
  if (missionId) {
    return getMissionField(missionId, key, fallback)
  }
  // Non-mission-scoped: read from localStorage directly
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    const entry: StoredEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > TTL) {
      localStorage.removeItem(PREFIX + key)
      return fallback
    }
    return entry.value
  } catch {
    return fallback
  }
}

/**
 * Persisted state hook. Mission-scoped calls use TanStack Store (reactive);
 * non-mission-scoped calls fall back to local useState + localStorage.
 */
export function usePersistedState<T>(key: string, initialValue: T, missionId?: string): [T, (v: T | ((prev: T) => T)) => void] {
  if (missionId) {
    return useMissionScopedPersistedState<T>(key, initialValue, missionId)
  }
  return useLocalPersistedState<T>(key, initialValue)
}

// --- Mission-scoped: TanStack Store backed ---

function useMissionScopedPersistedState<T>(key: string, initialValue: T, missionId: string): [T, (v: T | ((prev: T) => T)) => void] {
  const atom = getMissionAtom(missionId)

  const value = useStore(atom, (s: Record<string, unknown>) => {
    const v = s[key]
    return (v === undefined ? initialValue : v) as T
  })

  const keyRef = useRef(key)
  const missionIdRef = useRef(missionId)
  keyRef.current = key
  missionIdRef.current = missionId

  const setValue = useCallback(
    (valueOrUpdater: T | ((prev: T) => T)) => {
      const currentAtom = getMissionAtom(missionIdRef.current)
      const prev = currentAtom.get()[keyRef.current]
      const prevValue = prev === undefined ? initialValue : (prev as T)
      const next = typeof valueOrUpdater === 'function'
        ? (valueOrUpdater as (prev: T) => T)(prevValue)
        : valueOrUpdater
      setMissionField(missionIdRef.current, keyRef.current, next)
    },
    [initialValue],
  )

  return [value, setValue]
}

// --- Non-mission-scoped: local state + localStorage ---

function useLocalPersistedState<T>(key: string, initialValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => readStorage(key, initialValue))
  const keyRef = useRef(key)
  keyRef.current = key

  const setPersistedState = useCallback(
    (valueOrUpdater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (prev: T) => T)(prev)
          : valueOrUpdater
        const entry: StoredEntry<T> = { value: next, timestamp: Date.now() }
        localStorage.setItem(PREFIX + keyRef.current, JSON.stringify(entry))
        return next
      })
    },
    [],
  )

  return [state, setPersistedState]
}

export { clearMissionFieldsByPrefix as clearFormStorageByPrefix }
