/**
 * Reine Logik für das Flugbuch bei verknüpftem Einsatz: Vorschläge aus den von
 * Suchlage erkannten Flügen, Zusammenführen mit selbst gestarteten Einträgen
 * und das Nachziehen der Landezeit.
 *
 * Grundsatz: Nichts wird ohne Tipp zum Eintrag. Ein Vorschlag ist kein
 * Flugbucheintrag und erscheint deshalb auch nie im Bericht.
 */
import type { FlightLogEntry, SuchlageFlightRef } from '../types/flightLog'
import type { PayloadId } from '../types/payload'
import type { FmFlight } from '../types/suchlage'

/** Höchster Abstand der Startzeiten, um einen eigenen Eintrag zum Zusammenführen anzubieten. */
export const MERGE_WINDOW_MS = 5 * 60_000

export function isFlightRunning(f: FmFlight): boolean {
  return f.ended_at_ms === null
}

/** Beendet und nicht mit Verbindungsabriss: Landezeit aus der Telemetrie ist gültig. */
export function isFlightLanded(f: FmFlight): boolean {
  return f.ended_at_ms !== null && f.end_reason !== 'connection_lost'
}

export function hasRunningFlight(flights: readonly FmFlight[]): boolean {
  return flights.some(isFlightRunning)
}

export function toFlightRef(f: FmFlight): SuchlageFlightRef {
  return {
    flightId: f.id,
    aircraftSn: f.aircraft_sn,
    aircraftLabel: f.aircraft_label,
    maxElevationM: f.max_elevation_m,
    distanceM: f.distance_m,
    photoCount: f.photo_count,
    endReason: f.ended_at_ms === null ? null : (f.end_reason ?? 'landed'),
  }
}

const iso = (ms: number) => new Date(ms).toISOString()

export interface FlightProposal {
  flight: FmFlight
  running: boolean
  /**
   * Eigener Eintrag ohne Suchlage-Bezug zum Zusammenführen: Start höchstens
   * 5 min daneben, oder – wenn der Flug offen bliebe – der offene Eintrag.
   */
  mergeEntryId: string | null
  /**
   * „Bestätigen“ erlaubt. Nein, wenn daraus ein zweiter offener Eintrag würde
   * (die Oberfläche kennt nur einen laufenden Flug).
   */
  canConfirm: boolean
}

/** Ein Eintrag aus diesem Flug hätte keine Landezeit (läuft noch oder Verbindungsabriss). */
export function wouldStayOpen(f: FmFlight): boolean {
  return !isFlightLanded(f)
}

/**
 * Vorschläge = Suchlage-Flüge, die in keinem Eintrag stehen, ältester zuerst.
 * Zusammenführen wird paarweise nach kleinstem Zeitabstand vergeben, damit
 * jeder Eintrag höchstens einem Flug angeboten wird (der nächste gewinnt).
 */
export function computeProposals(flights: readonly FmFlight[], entries: readonly FlightLogEntry[]): FlightProposal[] {
  const linked = new Set(entries.flatMap((e) => (e.suchlage ? [e.suchlage.flightId] : [])))
  const open = flights
    .filter((f) => !linked.has(f.id))
    .slice()
    .sort((a, b) => a.started_at_ms - b.started_at_ms)

  const candidates = entries.filter((e) => !e.suchlage)
  const pairs: Array<{ flightId: number; entryId: string; delta: number }> = []
  for (const f of open) {
    for (const e of candidates) {
      const start = new Date(e.blockOff).getTime()
      if (Number.isNaN(start)) continue
      const delta = Math.abs(start - f.started_at_ms)
      if (delta <= MERGE_WINDOW_MS) pairs.push({ flightId: f.id, entryId: e.id, delta })
    }
  }
  pairs.sort((a, b) => a.delta - b.delta)
  const byFlight = new Map<number, string>()
  const usedEntries = new Set<string>()
  for (const p of pairs) {
    if (byFlight.has(p.flightId) || usedEntries.has(p.entryId)) continue
    byFlight.set(p.flightId, p.entryId)
    usedEntries.add(p.entryId)
  }

  // Bliebe ein Flug offen und ist lokal schon ein Flug offen, wird zusammengeführt –
  // unabhängig vom Zeitfenster –, damit nie zwei offene Einträge entstehen.
  const openEntry = candidates.find((e) => e.blockOn === null)
  if (openEntry && !usedEntries.has(openEntry.id)) {
    const flight = open.find((f) => wouldStayOpen(f) && !byFlight.has(f.id))
    if (flight) {
      byFlight.set(flight.id, openEntry.id)
      usedEntries.add(openEntry.id)
    }
  }
  const anyOpen = entries.some((e) => e.blockOn === null)

  return open.map((flight) => ({
    flight,
    running: isFlightRunning(flight),
    mergeEntryId: byFlight.get(flight.id) ?? null,
    canConfirm: !wouldStayOpen(flight) || !anyOpen,
  }))
}

export interface ConfirmContext {
  id: string
  fernpilot: string
  lrb: string
  activeSegmentId: string | null
  knownSegmentIds: readonly string[]
  payloads: PayloadId[]
}

/** „Bestätigen“: neuer Eintrag mit Zeiten aus der Telemetrie, Besatzung wie beim Start vorbelegt. */
export function confirmFlight(flight: FmFlight, ctx: ConfirmContext): FlightLogEntry {
  const section = flight.flugmappe_section_id
  const segmentId = section && ctx.knownSegmentIds.includes(section) ? section : ctx.activeSegmentId
  return {
    id: ctx.id,
    blockOff: iso(flight.started_at_ms),
    blockOn: isFlightLanded(flight) ? iso(flight.ended_at_ms!) : null,
    fernpilot: ctx.fernpilot,
    lrb: ctx.lrb,
    landungStatus: 'ok',
    bemerkung: '',
    segmentId: segmentId ?? undefined,
    payloads: ctx.payloads,
    suchlage: toFlightRef(flight),
  }
}

/**
 * „Bestätigen“ als Änderung am Flugbuch, idempotent: nichts tun, wenn der Flug
 * schon in einem Eintrag steht oder ein zweiter offener Eintrag entstünde.
 */
export function addConfirmedFlight(entries: FlightLogEntry[], flight: FmFlight, ctx: ConfirmContext): FlightLogEntry[] {
  if (entries.some((e) => e.suchlage?.flightId === flight.id)) return entries
  if (wouldStayOpen(flight) && entries.some((e) => e.blockOn === null)) return entries
  return [...entries, confirmFlight(flight, ctx)]
}

/** Zusammenführen als Änderung am Flugbuch, idempotent (Flug schon verknüpft, Ziel hat schon einen Bezug). */
export function applyMerge(entries: FlightLogEntry[], entryId: string, flight: FmFlight): FlightLogEntry[] {
  if (entries.some((e) => e.suchlage?.flightId === flight.id)) return entries
  const target = entries.find((e) => e.id === entryId)
  if (!target || target.suchlage) return entries
  return entries.map((e) => (e.id === entryId ? mergeFlight(e, flight) : e))
}

/** „Mit Flug N zusammenführen“: eigener Eintrag bekommt den Bezug und die Telemetrie-Zeiten. */
export function mergeFlight(entry: FlightLogEntry, flight: FmFlight): FlightLogEntry {
  return {
    ...entry,
    blockOff: iso(flight.started_at_ms),
    blockOn: isFlightLanded(flight) ? iso(flight.ended_at_ms!) : entry.blockOn,
    suchlage: toFlightRef(flight),
  }
}

function sameRef(a: SuchlageFlightRef, b: SuchlageFlightRef): boolean {
  return a.flightId === b.flightId
    && a.aircraftSn === b.aircraftSn
    && a.aircraftLabel === b.aircraftLabel
    && a.maxElevationM === b.maxElevationM
    && a.distanceM === b.distanceM
    && a.photoCount === b.photoCount
    && a.endReason === b.endReason
}

/**
 * Bestätigte Einträge auf den Stand von Suchlage bringen: Werte (Höhe, Strecke,
 * Fotos, Endegrund) aktualisieren und die Landezeit eintragen, **nur wenn sie
 * leer ist** und der Flug gelandet ist. Eine eigene Korrektur bleibt also.
 * Liefert dasselbe Array, wenn sich nichts ändert.
 */
export function syncFromSuchlage(entries: FlightLogEntry[], flights: readonly FmFlight[]): FlightLogEntry[] {
  const byId = new Map(flights.map((f) => [f.id, f]))
  let changed = false
  const next = entries.map((e) => {
    if (!e.suchlage) return e
    const f = byId.get(e.suchlage.flightId)
    if (!f) return e
    const ref = toFlightRef(f)
    const fillLanding = e.blockOn === null && isFlightLanded(f)
    if (!fillLanding && sameRef(e.suchlage, ref)) return e
    changed = true
    return { ...e, suchlage: ref, blockOn: fillLanding ? iso(f.ended_at_ms!) : e.blockOn }
  })
  return changed ? next : entries
}

/** Flug endete mit Verbindungsabriss und es fehlt noch eine Landezeit. */
export function needsManualLanding(entry: FlightLogEntry): boolean {
  return entry.blockOn === null && entry.suchlage?.endReason === 'connection_lost'
}
