import { describe, expect, it } from 'vitest'
import type { FlightLogEntry } from '../types/flightLog'
import type { FmFlight } from '../types/suchlage'
import {
  MERGE_WINDOW_MS,
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
