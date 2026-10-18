import { describe, expect, it } from 'vitest'
import type { MapData } from '../types/mapData'
import { SUCHLAGE_DEFAULT_COLORS, buildMapImport, collectionBounds, thinForStorage, toDisplayCollection } from './suchlageMap'

const mapData: MapData = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [9.1, 52.1] }, properties: { shapeType: 'standort', createdAt: 1 } },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[9, 52], [9.2, 52], [9.2, 52.2], [9, 52]]] },
      properties: { shapeType: 'einsatzgebiet', createdAt: 2 },
    },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [9.3, 52.3] }, properties: { shapeType: 'standort', createdAt: 3 } },
  ],
}

describe('buildMapImport', () => {
  it('Flächen ohne Schlusspunkt, erster Standort als Standort, weitere als Punkt', () => {
    const r = buildMapImport(mapData, { lat: 0, lon: 0 })
    expect(r.standort).toEqual({ lat: 52.1, lon: 9.1 })
    expect(r.features).toEqual([
      { name: 'Einsatzgebiet', kind: 'polygon', points: [{ lat: 52, lon: 9 }, { lat: 52, lon: 9.2 }, { lat: 52.2, lon: 9.2 }] },
      { name: 'Standort', kind: 'point', points: [{ lat: 52.3, lon: 9.3 }] },
    ])
  })

  it('ohne gezeichneten Standort der des Abschnitts', () => {
    const r = buildMapImport({ type: 'FeatureCollection', features: [] }, { lat: 1, lon: 2 })
    expect(r).toEqual({ features: [], standort: { lat: 1, lon: 2 } })
  })
})

describe('toDisplayCollection', () => {
  it('ersetzt leere oder ungültige Farben je Art', () => {
    const r = toDisplayCollection({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: { kind: 'flight_track', flight_id: 1, name: 'Flug 1', color: '', flugmappe_section_id: null, started_at_ms: 0, ended_at_ms: null } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { kind: 'map_element', id: 'a', name: 'P', color: 'url(evil)' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { kind: 'map_element', id: 'b', name: 'Q', color: '#ff0000' } },
      ],
    })
    expect(r.features.map((f) => f.properties.color)).toEqual([
      SUCHLAGE_DEFAULT_COLORS.flight_track,
      SUCHLAGE_DEFAULT_COLORS.map_element,
      '#ff0000',
    ])
  })

  it('verträgt fehlende Daten', () => {
    expect(toDisplayCollection(null).features).toEqual([])
  })
})

describe('collectionBounds', () => {
  it('umfasst Flugspuren als MultiLineString (wie von Suchlage geliefert)', () => {
    const display = toDisplayCollection({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [[[10.01, 52.43], [10.0109, 52.4306]], [[10.012, 52.4315], [10.02, 52.44]]] },
        properties: { kind: 'flight_track', flight_id: 6, name: 'Flug 6', color: '#00AAFF', flugmappe_section_id: null, started_at_ms: 0, ended_at_ms: 1 },
      }],
    })
    expect(display.features[0].properties).toEqual({ kind: 'flight_track', name: 'Flug 6', color: '#00AAFF' })
    expect(collectionBounds(display.features)).toEqual([[10.01, 52.43], [10.02, 52.44]])
  })

  it('umfasst alle Geometrien', () => {
    expect(collectionBounds(mapData.features)).toEqual([[9, 52], [9.3, 52.3]])
    expect(collectionBounds([])).toBeNull()
  })
})

describe('thinForStorage', () => {
  const line = (n: number) => Array.from({ length: n }, (_, i) => [10 + i / 1e4, 52] as [number, number])
  const track = (geometry: import('../types/suchlage').FmGeometry) => ({
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      geometry,
      properties: { kind: 'flight_track' as const, flight_id: 1, name: 'Flug 1', color: '#00AAFF', flugmappe_section_id: null, started_at_ms: 0, ended_at_ms: null },
    }],
  })

  it('lässt kurze Spuren und Kartenelemente unverändert', () => {
    const fc = track({ type: 'LineString', coordinates: line(100) })
    expect(thinForStorage(fc)).toBe(fc)
  })

  it('kürzt lange Spuren auf höchstens 500 Punkte, Anfang und Ende bleiben', () => {
    const coords = line(5001)
    const r = thinForStorage(track({ type: 'LineString', coordinates: coords }))
    const g = r.features[0].geometry as { coordinates: number[][] }
    expect(g.coordinates.length).toBeLessThanOrEqual(501)
    expect(g.coordinates[0]).toEqual(coords[0])
    expect(g.coordinates.at(-1)).toEqual(coords.at(-1))
  })

  it('zählt bei MultiLineString alle Teile zusammen', () => {
    const r = thinForStorage(track({ type: 'MultiLineString', coordinates: [line(800), line(800)] }))
    const g = r.features[0].geometry as { coordinates: number[][][] }
    const total = g.coordinates.reduce((n, p) => n + p.length, 0)
    expect(total).toBeLessThanOrEqual(504)
    expect(g.coordinates).toHaveLength(2)
  })
})
