import type { MapData, ShapeType } from '../../types/mapData'

/** Eine Form im Entstehen; Punkte als `[lng, lat]`. */
export type Draft = { shape: ShapeType; points: [number, number][] }

type Feature = MapData['features'][number]

const MIN_POINTS: Record<ShapeType, number> = { standort: 1, einsatzgebiet: 3 }

/** Ein Standort hat nur eine Koordinate: Ein weiterer Klick ersetzt sie. */
export function addPoint(d: Draft, p: [number, number]): Draft {
  return { ...d, points: d.shape === 'standort' ? [p] : [...d.points, p] }
}

export function removeLastPoint(d: Draft): Draft {
  return { ...d, points: d.points.slice(0, -1) }
}

export function canFinish(d: Draft): boolean {
  return d.points.length >= MIN_POINTS[d.shape]
}

/** Standort → Point, Einsatzgebiet → Polygon mit geschlossenem Ring. */
export function toFeature(d: Draft, createdAt: number): Feature {
  const geometry: GeoJSON.Geometry = d.shape === 'standort'
    ? { type: 'Point', coordinates: d.points[0] }
    : { type: 'Polygon', coordinates: [[...d.points, d.points[0]]] }
  return { type: 'Feature', geometry, properties: { shapeType: d.shape, createdAt } }
}

/** Vorschau: die Eckpunkte und, ab zwei Punkten, die Form (Linie bzw. Fläche). */
export function draftCollection(d: Draft | null): GeoJSON.FeatureCollection {
  if (!d) return { type: 'FeatureCollection', features: [] }
  const vertices: GeoJSON.Feature[] = d.points.map((p) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: p },
    properties: {},
  }))
  const n = d.points.length
  const shape: GeoJSON.Feature[] = d.shape === 'einsatzgebiet' && n >= 2
    ? [{
        type: 'Feature',
        geometry: n >= 3
          ? { type: 'Polygon', coordinates: [[...d.points, d.points[0]]] }
          : { type: 'LineString', coordinates: d.points },
        properties: {},
      }]
    : []
  return { type: 'FeatureCollection', features: [...shape, ...vertices] }
}

/** Umgebendes Rechteck aller Koordinaten als `[[west, süd], [ost, nord]]`, ohne Elemente `null`. */
export function boundsOf(features: MapData['features']): [[number, number], [number, number]] | null {
  const coords: number[][] = []
  for (const { geometry: g } of features) {
    if (g.type === 'Point') coords.push(g.coordinates)
    else if (g.type === 'LineString') coords.push(...g.coordinates)
    else if (g.type === 'Polygon') for (const ring of g.coordinates) coords.push(...ring)
  }
  if (coords.length === 0) return null
  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}
