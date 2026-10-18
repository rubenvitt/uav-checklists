/**
 * Offline-Stand der Suchlage-Karte je Abschnitt (`seg:<id>:suchlage:map`).
 * Gespeichert wird ausgedünnt (Flugspuren höchstens 500 Punkte) und nur, wenn
 * sich etwas geändert hat oder der Stand älter als zehn Minuten ist – der
 * Speicher im Browser ist knapp.
 */
import { getMissionField, setMissionField } from '../stores/missionFormStore'
import { thinForStorage } from './suchlageMap'
import type { FmFeatureCollection } from '../types/suchlage'

export interface StoredSuchlageMap {
  data: FmFeatureCollection
  loadedAt: number
}

export const STORED_MAP_REFRESH_MS = 10 * 60_000

export const suchlageMapKey = (segmentId: string) => `seg:${segmentId}:suchlage:map`

export function readStoredSuchlageMap(missionId: string, segmentId: string): StoredSuchlageMap | null {
  return getMissionField<StoredSuchlageMap | null>(missionId, suchlageMapKey(segmentId), null)
}

export function storeSuchlageMap(missionId: string, segmentId: string, data: FmFeatureCollection, loadedAt: number): void {
  const thin = thinForStorage(data)
  const prev = readStoredSuchlageMap(missionId, segmentId)
  if (prev && loadedAt - prev.loadedAt < STORED_MAP_REFRESH_MS && JSON.stringify(prev.data) === JSON.stringify(thin)) return
  setMissionField(missionId, suchlageMapKey(segmentId), { data: thin, loadedAt } satisfies StoredSuchlageMap)
}
