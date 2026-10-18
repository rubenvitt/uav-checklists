import { describe, expect, it } from 'vitest'
import type { MapData } from '../types/mapData'
import { SUCHLAGE_DEFAULT_COLORS, buildMapImport, collectionBounds, toDisplayCollection } from './suchlageMap'

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
  it('ergänzt fehlende oder ungültige Farben je Art', () => {
    const r = toDisplayCollection({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: { kind: 'flight_track', name: null, color: null, flight_id: 1 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { kind: 'map_element', name: 'P', color: 'url(evil)', flight_id: null } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { kind: 'map_element', name: 'Q', color: '#ff0000', flight_id: null } },
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
  it('umfasst alle Geometrien', () => {
    expect(collectionBounds(mapData.features)).toEqual([[9, 52], [9.3, 52.3]])
    expect(collectionBounds([])).toBeNull()
  })
})
