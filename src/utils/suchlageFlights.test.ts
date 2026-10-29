import { describe, expect, it } from 'vitest'
import type { FlightLogEntry } from '../types/flightLog'
import type { FmFlight } from '../types/suchlage'
import {
  MERGE_WINDOW_MS,
  addConfirmedFlight,
  applyMerge,
  computeProposals,
  confirmFlight,
  hasRunningFlight,
  mergeFlight,
  needsManualLanding,
  syncFromSuchlage,
  toFlightRef,
} from './suchlageFlights'

const T = Date.UTC(2026, 9, 18, 10, 0, 0)
const MIN = 60_000

function flight(id: number, startMin: number, endMin: number | null, extra: Partial<FmFlight> = {}): FmFlight {
  return {
    id,
    flugmappe_section_id: null,
    started_at_ms: T + startMin * MIN,
    ended_at_ms: endMin === null ? null : T + endMin * MIN,
    end_reason: endMin === null ? null : 'landed',
    aircraft_sn: `SN${id}`,
    aircraft_label: null,
    max_elevation_m: 80,
    distance_m: 1200,
    photo_count: 0,
    ...extra,
  }
}

function entry(id: string, startMin: number, endMin: number | null, extra: Partial<FlightLogEntry> = {}): FlightLogEntry {
  return {
    id,
    blockOff: new Date(T + startMin * MIN).toISOString(),
    blockOn: endMin === null ? null : new Date(T + endMin * MIN).toISOString(),
    fernpilot: 'FP',
    lrb: 'LRB',
    landungStatus: 'ok',
    bemerkung: '',
    ...extra,
  }
}

describe('computeProposals', () => {
  it('schlägt nur Flüge vor, die in keinem Eintrag stehen, ältester zuerst', () => {
    const flights = [flight(2, 30, 40), flight(1, 0, 10), flight(3, 50, null)]
    const entries = [entry('a', 0, 10, { suchlage: toFlightRef(flights[1]) })]
    const p = computeProposals(flights, entries)
    expect(p.map((x) => x.flight.id)).toEqual([2, 3])
    expect(p.map((x) => x.running)).toEqual([false, true])
  })

  it('bietet Zusammenführen bis genau 5 min an, darüber nicht', () => {
    const atLimit = computeProposals([flight(1, 5, 10)], [entry('a', 0, null)])
    expect(atLimit[0].mergeEntryId).toBe('a')
    const beyond = computeProposals([{ ...flight(1, 5, 10), started_at_ms: T + MERGE_WINDOW_MS + 1 }], [entry('a', 0, null)])
    expect(beyond[0].mergeEntryId).toBeNull()
  })

  it('der nächste Eintrag gewinnt', () => {
    const p = computeProposals([flight(1, 10, 20)], [entry('weit', 6, 20), entry('nah', 11, 20)])
    expect(p[0].mergeEntryId).toBe('nah')
  })

  it('ein Eintrag wird nur einem Flug angeboten (dem nächsten)', () => {
    const p = computeProposals([flight(1, 0, 5), flight(2, 3, 8)], [entry('a', 3, 8)])
    expect(p.find((x) => x.flight.id === 2)?.mergeEntryId).toBe('a')
    expect(p.find((x) => x.flight.id === 1)?.mergeEntryId).toBeNull()
  })

  it('bereits verknüpfte Einträge werden nicht doppelt angeboten', () => {
    const linked = entry('a', 0, 10, { suchlage: toFlightRef(flight(9, 0, 10)) })
    const p = computeProposals([flight(1, 1, 10)], [linked])
    expect(p[0].mergeEntryId).toBeNull()
  })
})

describe('computeProposals: nie zwei offene Einträge', () => {
  it('laufender Vorschlag bei offenem eigenem Eintrag: zusammenführen, auch außerhalb von 5 min', () => {
    const p = computeProposals([flight(1, 20, null)], [entry('offen', 0, null)])
    expect(p[0].mergeEntryId).toBe('offen')
  })

  it('Verbindungsabriss bei offenem Eintrag: ebenfalls zusammenführen', () => {
    const p = computeProposals([flight(1, 20, 25, { end_reason: 'connection_lost' })], [entry('offen', 0, null)])
    expect(p[0].mergeEntryId).toBe('offen')
  })

  it('eigener Eintrag seit 2 h offen, in Suchlage läuft ein anderer Flug: nicht zusammenführen, nicht bestätigen', () => {
    const p = computeProposals([flight(1, 120, null)], [entry('offen', 0, null)])
    expect(p[0]).toMatchObject({ mergeEntryId: null, canConfirm: false })
  })

  it('alter Verbindungsabriss vor dem eigenen Start wird nicht genommen, der laufende Flug schon', () => {
    // 08:30 Abriss (Ende vor dem eigenen Start), eigener Eintrag ab 09:00, in Suchlage läuft seit 09:02 ein Flug
    const p = computeProposals(
      [flight(1, -30, -20, { end_reason: 'connection_lost' }), flight(2, 2, null)],
      [entry('offen', 0, null)],
    )
    expect(p.find((x) => x.flight.id === 1)).toMatchObject({ mergeEntryId: null, canConfirm: false })
    expect(p.find((x) => x.flight.id === 2)?.mergeEntryId).toBe('offen')
  })

  it('laufende Flüge gehen vor Verbindungsabriss, dann der kleinste Abstand', () => {
    const p = computeProposals(
      [flight(1, 6, 8, { end_reason: 'connection_lost' }), flight(2, 25, null), flight(3, 12, null)],
      [entry('offen', 0, null)],
    )
    expect(p.find((x) => x.mergeEntryId === 'offen')?.flight.id).toBe(3)
  })

  it('gelandeter Vorschlag bei offenem Eintrag: bestätigen bleibt erlaubt', () => {
    const p = computeProposals([flight(1, 30, 40)], [entry('offen', 0, null)])
    expect(p[0]).toMatchObject({ mergeEntryId: null, canConfirm: true })
  })

  it('offener Eintrag schon aus Suchlage: zweiter laufender Flug kann nicht bestätigt werden', () => {
    const entries = [entry('a', 0, null, { suchlage: toFlightRef(flight(9, 0, null)) })]
    const p = computeProposals([flight(9, 0, null), flight(2, 5, null)], entries)
    expect(p).toHaveLength(1)
    expect(p[0]).toMatchObject({ mergeEntryId: null, canConfirm: false })
  })

  it('ohne offenen Eintrag darf ein laufender Flug bestätigt werden', () => {
    expect(computeProposals([flight(1, 0, null)], [entry('a', -60, -50)])[0].canConfirm).toBe(true)
  })
})

describe('addConfirmedFlight / applyMerge', () => {
  const ctx = { id: 'neu', fernpilot: 'P', lrb: 'L', activeSegmentId: null, knownSegmentIds: [], payloads: [] }

  it('bestätigt einmal; ein zweiter Tipp ändert nichts', () => {
    const once = addConfirmedFlight([], flight(1, 0, 10), ctx)
    expect(once).toHaveLength(1)
    expect(addConfirmedFlight(once, flight(1, 0, 10), { ...ctx, id: 'x' })).toBe(once)
  })

  it('erzeugt keinen zweiten offenen Eintrag', () => {
    const entries = [entry('offen', 0, null)]
    expect(addConfirmedFlight(entries, flight(1, 30, null), ctx)).toBe(entries)
  })

  it('führt einmal zusammen; Ziel mit Bezug oder schon verknüpfter Flug: nichts', () => {
    const entries = [entry('a', 0, null), entry('b', 20, 30)]
    const merged = applyMerge(entries, 'a', flight(1, 1, null))
    expect(merged[0].suchlage?.flightId).toBe(1)
    expect(applyMerge(merged, 'b', flight(1, 1, null))).toBe(merged)
    expect(applyMerge(merged, 'a', flight(2, 1, null))).toBe(merged)
    expect(applyMerge(entries, 'fehlt', flight(3, 1, null))).toBe(entries)
  })

  it('sortiert einen nachträglich bestätigten älteren Flug nach Startzeit ein (SUL-109)', () => {
    const entries = [entry('a', 0, 5), entry('b', 34, 40)]
    expect(addConfirmedFlight(entries, flight(1, 9, 20), ctx).map((e) => e.id)).toEqual(['a', 'neu', 'b'])
  })

  it('rückt einen Eintrag an seinen Platz, wenn das Zusammenführen die Startzeit verschiebt', () => {
    const entries = [entry('a', 0, 5), entry('b', 10, 12), entry('c', 14, 20)]
    expect(applyMerge(entries, 'b', flight(1, 15, 18)).map((e) => e.id)).toEqual(['a', 'c', 'b'])
  })
})

describe('confirmFlight', () => {
  const ctx = { id: 'neu', fernpilot: 'Pilot', lrb: 'Beob', activeSegmentId: 'seg2', knownSegmentIds: ['seg1', 'seg2'], payloads: ['zenmuse-h30t' as const] }

  it('übernimmt Zeiten aus der Telemetrie und die Besatzung', () => {
    const e = confirmFlight(flight(1, 0, 12), ctx)
    expect(e).toMatchObject({ id: 'neu', fernpilot: 'Pilot', lrb: 'Beob', landungStatus: 'ok', segmentId: 'seg2' })
    expect(e.blockOff).toBe(new Date(T).toISOString())
    expect(e.blockOn).toBe(new Date(T + 12 * MIN).toISOString())
    expect(e.suchlage?.flightId).toBe(1)
    expect(e.payloads).toEqual(['zenmuse-h30t'])
  })

  it('nimmt den Abschnitt aus Suchlage, wenn er bekannt ist', () => {
    expect(confirmFlight(flight(1, 0, 12, { flugmappe_section_id: 'seg1' }), ctx).segmentId).toBe('seg1')
    expect(confirmFlight(flight(1, 0, 12, { flugmappe_section_id: 'fremd' }), ctx).segmentId).toBe('seg2')
  })

  it('laufender Flug und Verbindungsabriss: keine Landezeit', () => {
    expect(confirmFlight(flight(1, 0, null), ctx).blockOn).toBeNull()
    const lost = confirmFlight(flight(1, 0, 9, { end_reason: 'connection_lost' }), ctx)
    expect(lost.blockOn).toBeNull()
    expect(needsManualLanding(lost)).toBe(true)
  })
})

describe('mergeFlight', () => {
  it('gilt die Telemetrie: Start und, falls gelandet, Landung', () => {
    const merged = mergeFlight(entry('a', 2, null, { bemerkung: 'x' }), flight(1, 0, 10))
    expect(merged.blockOff).toBe(new Date(T).toISOString())
    expect(merged.blockOn).toBe(new Date(T + 10 * MIN).toISOString())
    expect(merged.bemerkung).toBe('x')
    expect(merged.suchlage?.flightId).toBe(1)
  })

  it('laufender Flug lässt die Landung offen', () => {
    expect(mergeFlight(entry('a', 2, null), flight(1, 0, null)).blockOn).toBeNull()
  })
})

describe('syncFromSuchlage', () => {
  it('zieht die Landung nach, wenn sie leer ist und der Flug gelandet ist', () => {
    const running = flight(1, 0, null)
    const entries = [entry('a', 0, null, { suchlage: toFlightRef(running) })]
    const next = syncFromSuchlage(entries, [flight(1, 0, 15)])
    expect(next[0].blockOn).toBe(new Date(T + 15 * MIN).toISOString())
    expect(next[0].suchlage?.endReason).toBe('landed')
  })

  it('überschreibt eine eingetragene Landung nicht', () => {
    const entries = [entry('a', 0, 20, { suchlage: toFlightRef(flight(1, 0, null)) })]
    const next = syncFromSuchlage(entries, [flight(1, 0, 15)])
    expect(next[0].blockOn).toBe(new Date(T + 20 * MIN).toISOString())
  })

  it('Verbindungsabriss: keine Landezeit, Hinweis', () => {
    const entries = [entry('a', 0, null, { suchlage: toFlightRef(flight(1, 0, null)) })]
    const next = syncFromSuchlage(entries, [flight(1, 0, 15, { end_reason: 'connection_lost' })])
    expect(next[0].blockOn).toBeNull()
    expect(needsManualLanding(next[0])).toBe(true)
  })

  it('aktualisiert Werte, lässt manuelle Einträge in Ruhe und liefert ohne Änderung dasselbe Array', () => {
    const f = flight(1, 0, 10)
    const entries = [entry('a', 0, 10, { suchlage: toFlightRef(f) }), entry('m', 30, 40)]
    expect(syncFromSuchlage(entries, [f])).toBe(entries)
    const updated = syncFromSuchlage(entries, [{ ...f, photo_count: 4, max_elevation_m: 95 }])
    expect(updated).not.toBe(entries)
    expect(updated[0].suchlage).toMatchObject({ photoCount: 4, maxElevationM: 95 })
    expect(updated[1]).toBe(entries[1])
  })
})

describe('hasRunningFlight', () => {
  it('erkennt laufende Flüge', () => {
    expect(hasRunningFlight([flight(1, 0, 5)])).toBe(false)
    expect(hasRunningFlight([flight(1, 0, 5), flight(2, 6, null)])).toBe(true)
  })
})
