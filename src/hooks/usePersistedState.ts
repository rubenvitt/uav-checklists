import { useState, useCallback, useEffect, useRef } from 'react'

const PREFIX = 'uav-form:'
const TTL = 56 * 60 * 60 * 1000 // 56h

interface StoredEntry<T> {
  value: T
  timestamp: number
}

function buildPrefix(missionId?: string): string {
  return missionId ? `${PREFIX}${missionId}:` : PREFIX
}

export function readStorage<T>(key: string, fallback: T, missionId?: string): T {
  try {
    const raw = localStorage.getItem(buildPrefix(missionId) + key)
    if (!raw) return fallback
    const entry: StoredEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > TTL) {
      localStorage.removeItem(buildPrefix(missionId) + key)
      return fallback
    }
    return entry.value
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T, missionId?: string) {
  const entry: StoredEntry<T> = { value, timestamp: Date.now() }
  localStorage.setItem(buildPrefix(missionId) + key, JSON.stringify(entry))
}

export function usePersistedState<T>(key: string, initialValue: T, missionId?: string): [T, (v: T | ((prev: T) => T)) => void] {
  const fullKey = missionId ? `${missionId}:${key}` : key
  const [state, setState] = useState<T>(() => readStorage(key, initialValue, missionId))
  const keyRef = useRef(key)
  const missionIdRef = useRef(missionId)
  keyRef.current = key
  missionIdRef.current = missionId

  const setPersistedState = useCallback(
    (valueOrUpdater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (prev: T) => T)(prev)
          : valueOrUpdater
        writeStorage(keyRef.current, next, missionIdRef.current)
        return next
      })
    },
    [],
  )

  // Sync if key changes (e.g. after storage clear + remount)
  useEffect(() => {
    const stored = readStorage(key, initialValue, missionId)
    setState(stored)
  }, [fullKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return [state, setPersistedState]
}

export function clearFormStorageByPrefix(prefix: string, missionId?: string) {
  const fullPrefix = buildPrefix(missionId) + prefix
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(fullPrefix)) {
      keysToRemove.push(k)
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}
