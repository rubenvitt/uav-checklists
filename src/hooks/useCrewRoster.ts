import { useSyncExternalStore, useCallback } from 'react'
import { loadCrewRoster, addToCrewRoster, removeFromCrewRoster } from '../utils/crewRoster'

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

let snapshot: string[] = loadCrewRoster()

function getSnapshot(): string[] {
  return snapshot
}

export function useCrewRoster() {
  const roster = useSyncExternalStore(subscribe, getSnapshot)

  const add = useCallback((name: string) => {
    if (!name.trim()) return
    snapshot = addToCrewRoster(name)
    emitChange()
  }, [])

  const remove = useCallback((name: string) => {
    snapshot = removeFromCrewRoster(name)
    emitChange()
  }, [])

  return { roster, add, remove }
}
