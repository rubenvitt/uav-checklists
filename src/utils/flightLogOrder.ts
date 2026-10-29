import type { FlightLogEntry } from '../types/flightLog'

/**
 * Flugbuch in Startreihenfolge (Block Off). Die Flugnummer im Flugtagebuch, in
 * „Mit Flug N zusammenführen“ und im Bericht ist die Position in dieser Liste –
 * ein nachträglich bestätigter älterer Suchlage-Flug rutscht so an seinen Platz.
 *
 * Stabil: gleiche Startzeiten behalten ihre Reihenfolge, ein Eintrag ohne
 * lesbare Startzeit steht hinten. Liefert dasselbe Array, wenn es schon sortiert ist.
 */
export function sortByBlockOff(entries: FlightLogEntry[]): FlightLogEntry[] {
  const keyed = entries.map((entry, index) => {
    const ms = new Date(entry.blockOff).getTime()
    return { entry, index, ms: Number.isNaN(ms) ? Infinity : ms }
  })
  keyed.sort((a, b) => (a.ms === b.ms ? a.index - b.index : a.ms < b.ms ? -1 : 1))
  return keyed.every((k, i) => k.index === i) ? entries : keyed.map((k) => k.entry)
}
