import { useMissionPersistedState } from './useMissionPersistedState'
import type { MapData } from '../types/mapData'
import { EMPTY_MAP_DATA } from '../types/mapData'

export function useMapData() {
  return useMissionPersistedState<MapData>('einsatzkarte', EMPTY_MAP_DATA)
}
