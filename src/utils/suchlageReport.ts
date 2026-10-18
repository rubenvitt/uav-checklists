/**
 * Aufbereitung der Suchlage-Werte eines Flugbucheintrags für den Bericht.
 * Rein, damit sie ohne jsPDF testbar ist.
 */
import type { SuchlageFlightRef } from '../types/flightLog'

export const PHOTO_NOTE = 'Fotos und Video zu diesem Flug liegen in Suchlage.'

export interface SuchlageReportDetails {
  rows: Array<{ label: string; value: string }>
  photoNote: string | null
}

const fmt1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${fmt1.format(m / 1000)} km`
}

/** Fluggerät (Bezeichnung oder Seriennummer), max. Höhe, Strecke und der Fotohinweis. */
export function suchlageReportDetails(ref: SuchlageFlightRef | undefined): SuchlageReportDetails | null {
  if (!ref) return null
  const rows: SuchlageReportDetails['rows'] = []
  const aircraft = ref.aircraftLabel?.trim() || ref.aircraftSn
  if (aircraft) rows.push({ label: 'Fluggerät', value: aircraft })
  if (ref.maxElevationM !== null && Number.isFinite(ref.maxElevationM)) {
    rows.push({ label: 'Max. Höhe', value: `${Math.round(ref.maxElevationM)} m` })
  }
  if (ref.distanceM !== null && Number.isFinite(ref.distanceM)) {
    rows.push({ label: 'Strecke', value: formatDistance(ref.distanceM) })
  }
  if (ref.endReason === 'connection_lost') {
    rows.push({ label: 'Flugende', value: 'Verbindungsabriss (laut Suchlage)' })
  }
  return { rows, photoNote: ref.photoCount > 0 ? PHOTO_NOTE : null }
}
