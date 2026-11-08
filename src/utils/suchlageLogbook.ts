/**
 * Flugbuch an Suchlage melden (SUL-114): reine Logik ohne Netz und Speicher.
 *
 * Jeder Flugbucheintrag (bestätigt oder von Hand) geht an Suchlage, ebenso
 * Änderungen und das Löschen. Statt jede Stelle zu kennen, an der das Flugbuch
 * sich ändert, vergleicht {@link reconcileLogbook} das Flugbuch mit dem zuletzt
 * gemeldeten Stand: Was anders ist, bekommt eine neue Revision und einen
 * Eintrag in der Ausgangsliste. Die Revisionen liegen im Einsatzspeicher
 * (`suchlage:logbook`) und überstehen so Neustarts.
 */
import type { FlightLogEntry, LandingStatus } from '../types/flightLog'
import type { FmLogbookEntry } from '../types/suchlage'
import type { LogbookSnapshot, NewOutboxItem } from './suchlageOutbox'

export interface LogbookRecord {
  /** Zuletzt vergebene Revision (ab 1). */
  revision: number
  /**
   * Gemeldeter Stand; `null` = als gelöscht gemeldet; fehlt = an diesen
   * Suchlage-Einsatz noch nicht gemeldet (nach einem Wechsel des Einsatzes).
   */
  fingerprint?: string | null
}

export interface LogbookState {
  /** Suchlage-Einsatz, an den gemeldet wurde; bei einem anderen beginnt alles neu. */
  suchlageMissionId: number
  entries: Record<string, LogbookRecord>
}

/** Fluggerät, wenn die Flugmappe keins kennt (wie die Migration in Suchlage). */
export const UNKNOWN_AIRCRAFT = 'Fluggerät unbekannt'

/** Landestatus wie in der Flugmappe angezeigt. */
const LANDING_STATUS_TEXT: Record<LandingStatus, string> = {
  ok: 'In Ordnung',
  auffaellig: 'Mit Auffälligkeiten',
  notfall: 'Notfall',
}

export interface LogbookContext {
  /** Bezeichnung des Fluggeräts der Flugmappe, z. B. „DJI Matrice 200“. */
  aircraftLabel: string
  /** Abschnitte, die Suchlage kennt oder die vorher in der Ausgangsliste angelegt werden. */
  sections: ReadonlySet<string>
}

function ms(iso: string | null): number | null {
  if (iso === null) return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : t
}

/** Stand eines Eintrags für Suchlage; `null`, wenn die Startzeit unlesbar ist. */
export function logbookSnapshot(entry: FlightLogEntry, ctx: LogbookContext, changedAtMs: number): LogbookSnapshot | null {
  const startedAtMs = ms(entry.blockOff)
  if (startedAtMs === null) return null
  const segmentId = entry.segmentId && ctx.sections.has(entry.segmentId) ? entry.segmentId : null
  return {
    flightId: entry.suchlage?.flightId ?? null,
    segmentId,
    startedAtMs,
    landedAtMs: ms(entry.blockOn),
    aircraftLabel: ctx.aircraftLabel.trim() || UNKNOWN_AIRCRAFT,
    pilot: entry.fernpilot.trim() || null,
    landingStatus: LANDING_STATUS_TEXT[entry.landungStatus] ?? null,
    changedAtMs,
  }
}

/** Vergleichswert: alles außer dem Änderungszeitpunkt. */
export function fingerprint(s: LogbookSnapshot): string {
  return JSON.stringify([s.flightId, s.segmentId, s.startedAtMs, s.landedAtMs, s.aircraftLabel, s.pilot, s.landingStatus])
}

/** Meldung für Suchlage; der Abschnitt nur, wenn Suchlage ihn wirklich kennt (sonst 422). */
export function toFmLogbookEntry(s: LogbookSnapshot, revision: number, knownSections: Readonly<Record<string, true>>): FmLogbookEntry {
  return {
    revision,
    flight_id: s.flightId,
    flugmappe_section_id: s.segmentId && knownSections[s.segmentId] ? s.segmentId : null,
    started_at_ms: s.startedAtMs,
    landed_at_ms: s.landedAtMs,
    aircraft_label: s.aircraftLabel,
    pilot: s.pilot,
    landing_status: s.landingStatus,
    changed_at_ms: s.changedAtMs,
  }
}

export function emptyLogbookState(suchlageMissionId: number): LogbookState {
  return { suchlageMissionId, entries: {} }
}

export interface ReconcileResult {
  /** Derselbe Zustand, wenn nichts zu melden ist. */
  state: LogbookState
  items: Extract<NewOutboxItem, { kind: 'logbook' }>[]
}

/**
 * Flugbuch mit dem gemeldeten Stand vergleichen: neue und geänderte Einträge
 * melden, gelöschte löschen, jeweils mit der nächsten Revision.
 */
export function reconcileLogbook(
  entries: readonly FlightLogEntry[],
  previous: LogbookState | null,
  suchlageMissionId: number,
  ctx: LogbookContext,
  now: number,
): ReconcileResult {
  // Anderer Suchlage-Einsatz: alles neu melden, die Revisionen laufen aber weiter.
  const base: LogbookState = !previous
    ? emptyLogbookState(suchlageMissionId)
    : previous.suchlageMissionId === suchlageMissionId
      ? previous
      : {
          suchlageMissionId,
          entries: Object.fromEntries(Object.entries(previous.entries).map(([id, r]) => [id, { revision: r.revision }])),
        }
  const next: Record<string, LogbookRecord> = { ...base.entries }
  const items: ReconcileResult['items'] = []
  const present = new Set<string>()

  for (const entry of entries) {
    present.add(entry.id)
    const snapshot = logbookSnapshot(entry, ctx, now)
    if (!snapshot) continue
    const fp = fingerprint(snapshot)
    const record = next[entry.id]
    if (record && record.fingerprint === fp) continue
    const revision = (record?.revision ?? 0) + 1
    next[entry.id] = { revision, fingerprint: fp }
    items.push({ kind: 'logbook', entryId: entry.id, revision, entry: snapshot })
  }

  for (const [entryId, record] of Object.entries(base.entries)) {
    if (present.has(entryId) || record.fingerprint == null) continue
    const revision = record.revision + 1
    next[entryId] = { revision, fingerprint: null }
    items.push({ kind: 'logbook', entryId, revision, entry: null })
  }

  if (items.length === 0 && base === previous) return { state: base, items }
  return { state: { suchlageMissionId, entries: next }, items }
}

/**
 * 409 beim Melden einer Bestätigung: Ein anderer Trupp hat den Flug. Der
 * Eintrag bleibt als Handeintrag ohne Suchlage-Bezug (nichts geht verloren).
 * Liefert dasselbe Array, wenn der Eintrag den Flug nicht mehr trägt.
 */
export function dropConfirmation(entries: FlightLogEntry[], entryId: string, flightId: number): FlightLogEntry[] {
  let changed = false
  const next = entries.map((e) => {
    if (e.id !== entryId || e.suchlage?.flightId !== flightId) return e
    changed = true
    const rest = { ...e }
    delete rest.suchlage
    return rest
  })
  return changed ? next : entries
}
