import { useMissionId } from '../context/MissionContext'
import { usePersistedState, clearFormStorageByPrefix } from './usePersistedState'

export function useMissionPersistedState<T>(key: string, initialValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const missionId = useMissionId()
  return usePersistedState<T>(key, initialValue, missionId)
}

export function clearMissionFormStorageByPrefix(prefix: string, missionId: string) {
  clearFormStorageByPrefix(prefix, missionId)
}
