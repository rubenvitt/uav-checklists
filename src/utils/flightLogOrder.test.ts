import { describe, expect, it } from 'vitest'
import type { FlightLogEntry } from '../types/flightLog'
import { sortByBlockOff } from './flightLogOrder'

const entry = (id: string, blockOff: string): FlightLogEntry => ({
  id,
  blockOff,
  blockOn: null,
  fernpilot: '',
  lrb: '',
  landungStatus: 'ok',
  bemerkung: '',
})

describe('sortByBlockOff', () => {
  it('sortiert einen nachträglich bestätigten älteren Flug an seinen Platz', () => {
    const entries = [
      entry('a', '2026-10-29T08:00:00.000Z'),
      entry('b', '2026-10-29T08:34:00.000Z'),
      entry('c', '2026-10-29T08:09:00.000Z'),
    ]
    expect(sortByBlockOff(entries).map((e) => e.id)).toEqual(['a', 'c', 'b'])
  })

  it('liefert dasselbe Array, wenn die Reihenfolge schon stimmt', () => {
    const entries = [entry('a', '2026-10-29T08:00:00.000Z'), entry('b', '2026-10-29T08:34:00.000Z')]
    expect(sortByBlockOff(entries)).toBe(entries)
  })

  it('hält gleiche Startzeiten stabil und stellt unlesbare Zeiten nach hinten', () => {
    const entries = [
      entry('x', 'kaputt'),
      entry('a', '2026-10-29T08:00:00.000Z'),
      entry('b', '2026-10-29T08:00:00.000Z'),
    ]
    expect(sortByBlockOff(entries).map((e) => e.id)).toEqual(['a', 'b', 'x'])
  })
})
