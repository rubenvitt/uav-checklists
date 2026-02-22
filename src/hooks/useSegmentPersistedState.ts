import { useSegmentId } from '../context/SegmentContext'
import { useMissionPersistedState } from './useMissionPersistedState'

export function useSegmentPersistedState<T>(key: string, initialValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const segmentId = useSegmentId()
  const effectiveKey = segmentId ? `seg:${segmentId}:${key}` : key
  return useMissionPersistedState<T>(effectiveKey, initialValue)
}
