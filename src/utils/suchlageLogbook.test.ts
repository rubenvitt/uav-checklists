import { describe, expect, it } from 'vitest'
import type { FlightLogEntry } from '../types/flightLog'
import {
  UNKNOWN_AIRCRAFT,
  dropConfirmation,
  logbookSnapshot,
  reconcileLogbook,
  toFmLogbookEntry,
  type LogbookContext,
} from './suchlageLogbook'

const T = Date.UTC(2026, 10, 8, 10, 0, 0)
const MIN = 60_000

function entry(id: string, startMin: number, endMin: number | null, extra: Partial<FlightLogEntry> = {}): FlightLogEntry {
  return {
    id,
    blockOff: new Date(T + startMin * MIN).toISOString(),
    blockOn: endMin === null ? null : new Date(T + endMin * MIN).toISOString(),
    fernpilot: 'Pilot',
    lrb: 'LRB',
    landungStatus: 'ok',
    bemerkung: '',
    segmentId: 's1',
    ...extra,
  }
}

const ref = (flightId: number) => ({
  flightId, aircraftSn: 'SN', aircraftLabel: null, maxElevationM: null, distanceM: null, photoCount: 0, endReason: 'landed' as const,
})

const ctx: LogbookContext = { aircraftLabel: 'DJI Matrice 200', sections: new Set(['s1']) }

describe('logbookSnapshot', () => {
  it('übernimmt Zeiten, Fluggerät, Fernpilot, Landestatus und den Suchlage-Flug', () => {
    const s = logbookSnapshot(entry('e1', 0, 12, { suchlage: ref(7), landungStatus: 'auffaellig' }), ctx, 99)
    expect(s).toEqual({
      flightId: 7, segmentId: 's1', startedAtMs: T, landedAtMs: T + 12 * MIN,
      aircraftLabel: 'DJI Matrice 200', pilot: 'Pilot', landingStatus: 'Mit Auffälligkeiten', changedAtMs: 99,
    })
  })

  it('Abschnitt nur, wenn Suchlage ihn kennt; ohne Fernpilot null; leeres Fluggerät wird Platzhalter', () => {
    const s = logbookSnapshot(entry('e1', 0, null, { segmentId: 's9', fernpilot: '  ' }), { aircraftLabel: ' ', sections: new Set() }, 1)
    expect(s).toMatchObject({ segmentId: null, landedAtMs: null, pilot: null, aircraftLabel: UNKNOWN_AIRCRAFT })
  })

  it('unlesbare Startzeit wird nicht gemeldet', () => {
    expect(logbookSnapshot(entry('e1', 0, 1, { blockOff: 'kaputt' }), ctx, 1)).toBeNull()
  })

  it('schickt einen Abschnitt nur mit, wenn er in Suchlage angelegt ist', () => {
    const s = logbookSnapshot(entry('e1', 0, 1), ctx, 1)!
    expect(toFmLogbookEntry(s, 3, { s1: true }).flugmappe_section_id).toBe('s1')
    expect(toFmLogbookEntry(s, 3, {})).toMatchObject({ flugmappe_section_id: null, revision: 3 })
  })
})

describe('reconcileLogbook', () => {
  it('meldet jeden Eintrag einmal mit Revision 1, bestätigt wie von Hand', () => {
    const entries = [entry('a', 0, 10, { suchlage: ref(7) }), entry('b', 20, null)]
    const r = reconcileLogbook(entries, null, 42, ctx, T)
    expect(r.items.map((i) => [i.entryId, i.revision, i.entry?.flightId])).toEqual([['a', 1, 7], ['b', 1, null]])
    expect(r.state.suchlageMissionId).toBe(42)
    // Unverändert: nichts Neues, derselbe Zustand.
    const again = reconcileLogbook(entries, r.state, 42, ctx, T + 1)
    expect(again.items).toEqual([])
    expect(again.state).toBe(r.state)
  })

  it('eine Änderung erhöht die Revision; eine Bemerkung allein nicht', () => {
    const first = reconcileLogbook([entry('a', 0, null)], null, 1, ctx, T)
    const noted = reconcileLogbook([entry('a', 0, null, { bemerkung: 'Notiz' })], first.state, 1, ctx, T)
    expect(noted.items).toEqual([])
    const landed = reconcileLogbook([entry('a', 0, 15)], first.state, 1, ctx, T)
    expect(landed.items).toHaveLength(1)
    expect(landed.items[0]).toMatchObject({ entryId: 'a', revision: 2 })
    expect(landed.items[0].entry?.landedAtMs).toBe(T + 15 * MIN)
  })

  it('ein gelöschter Eintrag wird einmal gelöscht, mit der nächsten Revision', () => {
    const first = reconcileLogbook([entry('a', 0, 10), entry('b', 20, 30)], null, 1, ctx, T)
    const changed = reconcileLogbook([entry('a', 0, 11), entry('b', 20, 30)], first.state, 1, ctx, T)
    const deleted = reconcileLogbook([entry('b', 20, 30)], changed.state, 1, ctx, T)
    expect(deleted.items).toEqual([{ kind: 'logbook', entryId: 'a', revision: 3, entry: null }])
    expect(reconcileLogbook([entry('b', 20, 30)], deleted.state, 1, ctx, T).items).toEqual([])
  })

  it('ein Abschnitt, den Suchlage erst später kennt, wird nachgemeldet', () => {
    const first = reconcileLogbook([entry('a', 0, 10, { segmentId: 's2' })], null, 1, ctx, T)
    expect(first.items[0].entry?.segmentId).toBeNull()
    const later = reconcileLogbook([entry('a', 0, 10, { segmentId: 's2' })], first.state, 1, { ...ctx, sections: new Set(['s1', 's2']) }, T)
    expect(later.items[0]).toMatchObject({ revision: 2, entry: { segmentId: 's2' } })
  })

  it('anderer Suchlage-Einsatz: alles neu melden, Revisionen laufen weiter, Gelöschtes bleibt weg', () => {
    const first = reconcileLogbook([entry('a', 0, 10), entry('b', 20, 30)], null, 1, ctx, T)
    const gone = reconcileLogbook([entry('a', 0, 10)], first.state, 1, ctx, T)
    const moved = reconcileLogbook([entry('a', 0, 10)], gone.state, 2, ctx, T)
    expect(moved.items.map((i) => [i.entryId, i.revision, i.entry === null])).toEqual([['a', 2, false]])
    expect(moved.state.suchlageMissionId).toBe(2)
  })

  it('ein 409 macht die Bestätigung zum Handeintrag, der dann neu gemeldet wird', () => {
    const entries = [entry('a', 0, 10, { suchlage: ref(7) })]
    const first = reconcileLogbook(entries, null, 1, ctx, T)
    const dropped = dropConfirmation(entries, 'a', 7)
    expect(dropped[0].suchlage).toBeUndefined()
    expect(dropped[0].blockOn).toBe(entries[0].blockOn)
    const next = reconcileLogbook(dropped, first.state, 1, ctx, T)
    expect(next.items[0]).toMatchObject({ entryId: 'a', revision: 2, entry: { flightId: null } })
    // Trägt der Eintrag den Flug nicht mehr, ändert sich nichts.
    expect(dropConfirmation(dropped, 'a', 7)).toBe(dropped)
  })
})
