import { useState, useCallback, useEffect, useRef } from 'react'

const PREFIX = 'uav-form:'
const TTL = 8 * 60 * 60 * 1000 // 8h

interface StoredEntry<T> {
  value: T
  timestamp: number
}

function readStorage<T>(key: string, fallback: T): T {
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

function writeStorage<T>(key: string, value: T) {
  const entry: StoredEntry<T> = { value, timestamp: Date.now() }
  localStorage.setItem(PREFIX + key, JSON.stringify(entry))
}

export function usePersistedState<T>(key: string, initialValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => readStorage(key, initialValue))
  const keyRef = useRef(key)
  keyRef.current = key

  const setPersistedState = useCallback(
    (valueOrUpdater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (prev: T) => T)(prev)
          : valueOrUpdater
        writeStorage(keyRef.current, next)
        return next
      })
    },
    [],
  )

  // Sync if key changes (e.g. after storage clear + remount)
  useEffect(() => {
    const stored = readStorage(key, initialValue)
    setState(stored)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return [state, setPersistedState]
}

export function clearFormStorageByPrefix(prefix: string) {
  const fullPrefix = PREFIX + prefix
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(fullPrefix)) {
      keysToRemove.push(k)
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}
