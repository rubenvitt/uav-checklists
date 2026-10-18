import { describe, expect, it } from 'vitest'
import { PHOTO_NOTE, formatDistance, suchlageReportDetails } from './suchlageReport'
import type { SuchlageFlightRef } from '../types/flightLog'

const ref: SuchlageFlightRef = {
  flightId: 1,
  aircraftSn: '1581F5BKD225',
  aircraftLabel: 'M30T Rot',
  maxElevationM: 87.4,
  distanceM: 2430,
  photoCount: 0,
  endReason: 'landed',
}

describe('suchlageReportDetails', () => {
  it('ohne Suchlage-Bezug nichts', () => {
    expect(suchlageReportDetails(undefined)).toBeNull()
  })

  it('Fluggerät, max. Höhe und Strecke erscheinen', () => {
    const d = suchlageReportDetails(ref)!
    expect(d.rows).toEqual([
      { label: 'Fluggerät', value: 'M30T Rot' },
      { label: 'Max. Höhe', value: '87 m' },
      { label: 'Strecke', value: '2,4 km' },
    ])
    expect(d.photoNote).toBeNull()
  })

  it('ohne Bezeichnung die Seriennummer, fehlende Werte fehlen', () => {
    const d = suchlageReportDetails({ ...ref, aircraftLabel: null, maxElevationM: null, distanceM: null })!
    expect(d.rows).toEqual([{ label: 'Fluggerät', value: '1581F5BKD225' }])
  })

  it('mit Fotos der Hinweis auf Suchlage', () => {
    expect(suchlageReportDetails({ ...ref, photoCount: 3 })!.photoNote).toBe(PHOTO_NOTE)
  })

  it('Verbindungsabriss steht dabei', () => {
    const d = suchlageReportDetails({ ...ref, endReason: 'connection_lost' })!
    expect(d.rows.at(-1)).toEqual({ label: 'Flugende', value: 'Verbindungsabriss (laut Suchlage)' })
  })
})

describe('formatDistance', () => {
  it('Meter unter 1 km, sonst km mit Komma', () => {
    expect(formatDistance(850.4)).toBe('850 m')
    expect(formatDistance(1000)).toBe('1,0 km')
  })
})
