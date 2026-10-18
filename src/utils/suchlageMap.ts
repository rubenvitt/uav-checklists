/**
 * Reine Helfer für Karten zwischen Flugmappe und Suchlage: Übernahme der
 * gezeichneten Formen beim Verknüpfen und Aufbereitung der GeoJSON-Karte aus
 * Suchlage für die Anzeige.
 */
import type { MapData } from '../types/mapData'
import type { FmFeatureCollection, FmImportFeature, FmMapImport, GeoPoint } from '../types/suchlage'

/** Farben, falls Suchlage keine mitschickt. */
export const SUCHLAGE_DEFAULT_COLORS = {
  map_element: '#3b82f6',
  flight_track: '#d97706',
} as const

const toPoint = ([lon, lat]: number[]): GeoPoint => ({ lat, lon })

/**
 * Formen der Einsatzkarte → „Kartenelemente übernehmen“. Flächen ohne den
 * schließenden Wiederholungspunkt, der erste Standort-Punkt als `standort`
 * (sonst der Standort des Abschnitts), weitere Punkte als Kartenelemente.
 */
export function buildMapImport(mapData: MapData, fallbackStandort: GeoPoint | null): FmMapImport {
  const features: FmImportFeature[] = []
  let standort: GeoPoint | null = null
  for (const f of mapData.features) {
    const g = f.geometry
    if (g.type === 'Point') {
      const p = toPoint(g.coordinates)
      if (f.properties.shapeType === 'standort' && !standort) standort = p
      else features.push({ name: f.properties.shapeType === 'standort' ? 'Standort' : 'Punkt', kind: 'point', points: [p] })
    } else if (g.type === 'Polygon') {
      const ring = g.coordinates[0] ?? []
      const open = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring
      if (open.length >= 3) features.push({ name: 'Einsatzgebiet', kind: 'polygon', points: open.map(toPoint) })
    } else if (g.type === 'LineString') {
      if (g.coordinates.length >= 2) features.push({ name: 'Linie', kind: 'line', points: g.coordinates.map(toPoint) })
    }
  }
  return { features, standort: standort ?? fallbackStandort }
}

const COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export type DisplayFeature = GeoJSON.Feature<GeoJSON.Geometry, { kind: string; name: string | null; color: string }>
export type DisplayCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, DisplayFeature['properties']>

/** Jede Form bekommt eine gültige Farbe, damit die Kartenebenen nur `['get', 'color']` brauchen. */
export function toDisplayCollection(fc: FmFeatureCollection | null | undefined): DisplayCollection {
  const features: DisplayFeature[] = []
  for (const f of fc?.features ?? []) {
    if (!f || !f.geometry) continue
    const kind = f.properties?.kind === 'flight_track' ? 'flight_track' : 'map_element'
    const raw = f.properties?.color
    const color = typeof raw === 'string' && COLOR_RE.test(raw) ? raw : SUCHLAGE_DEFAULT_COLORS[kind]
    features.push({ type: 'Feature', geometry: f.geometry, properties: { kind, name: f.properties?.name ?? null, color } })
  }
  return { type: 'FeatureCollection', features }
}

/** Umgebendes Rechteck aller Koordinaten (auch Multi-Geometrien), sonst `null`. */
export function collectionBounds(features: ReadonlyArray<{ geometry: GeoJSON.Geometry | null }>): [[number, number], [number, number]] | null {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
  const add = (c: number[]) => {
    if (c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return
    w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1])
  }
  const walk = (g: GeoJSON.Geometry | null) => {
    if (!g) return
    switch (g.type) {
      case 'Point': add(g.coordinates); break
      case 'MultiPoint': case 'LineString': g.coordinates.forEach(add); break
      case 'MultiLineString': case 'Polygon': g.coordinates.forEach((r) => r.forEach(add)); break
      case 'MultiPolygon': g.coordinates.forEach((p) => p.forEach((r) => r.forEach(add))); break
      case 'GeometryCollection': g.geometries.forEach(walk); break
    }
  }
  features.forEach((f) => walk(f.geometry))
  if (!Number.isFinite(w)) return null
  return [[w, s], [e, n]]
}

/** Höchstzahl Punkte je Flugspur im gespeicherten Offline-Stand. */
export const MAX_TRACK_POINTS = 500

function thinLine(line: number[][], step: number): number[][] {
  if (step <= 1 || line.length <= 2) return line
  const out = line.filter((_, i) => i % step === 0)
  const last = line[line.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

/**
 * Für den Offline-Stand auf dem Gerät: Flugspuren auf höchstens
 * `maxPoints` Punkte ausdünnen (jeder n-te Punkt, Anfang und Ende jedes Teils
 * bleiben). Kartenelemente bleiben unverändert. Liefert dieselbe Sammlung,
 * wenn nichts zu kürzen ist.
 */
export function thinForStorage(fc: FmFeatureCollection, maxPoints = MAX_TRACK_POINTS): FmFeatureCollection {
  let changed = false
  const features = fc.features.map((f) => {
    if (f.properties.kind !== 'flight_track') return f
    const g = f.geometry
    const parts = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : null
    if (!parts) return f
    const total = parts.reduce((n, p) => n + p.length, 0)
    if (total <= maxPoints) return f
    const step = Math.ceil(total / maxPoints)
    changed = true
    const thinned = parts.map((p) => thinLine(p, step) as [number, number][])
    const geometry = g.type === 'LineString'
      ? { type: 'LineString' as const, coordinates: thinned[0] }
      : { type: 'MultiLineString' as const, coordinates: thinned }
    return { ...f, geometry }
  })
  return changed ? { ...fc, features } : fc
}
