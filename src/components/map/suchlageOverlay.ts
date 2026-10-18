import type * as maplibregl from 'maplibre-gl'
import type { DisplayCollection } from '../../utils/suchlageMap'

export const SUCHLAGE_SOURCE = 'suchlage'

// Auch Multi-Geometrien: je nach Version meldet `geometry-type` sie mit „Multi“.
const geom = (...types: string[]) => ['in', ['geometry-type'], ['literal', types]] as maplibregl.FilterSpecification
const POLYGON = geom('Polygon', 'MultiPolygon')
const POINT = geom('Point', 'MultiPoint')
const LINE = geom('LineString', 'MultiLineString')
const COLOR = ['get', 'color'] as maplibregl.ExpressionSpecification
const TRACK = ['==', ['get', 'kind'], 'flight_track'] as maplibregl.ExpressionSpecification

/**
 * Ebenen für die Karte aus Suchlage (Kartenelemente und Flugspuren). Farben
 * stehen nach `toDisplayCollection` in jeder Form; Flugspuren gestrichelt.
 */
export function addSuchlageOverlay(map: maplibregl.Map, data: DisplayCollection) {
  map.addSource(SUCHLAGE_SOURCE, { type: 'geojson', data })
  map.addLayer({
    id: 'suchlage-fill',
    type: 'fill',
    source: SUCHLAGE_SOURCE,
    filter: POLYGON,
    paint: { 'fill-color': COLOR, 'fill-opacity': 0.18 },
  })
  map.addLayer({
    id: 'suchlage-outline',
    type: 'line',
    source: SUCHLAGE_SOURCE,
    filter: POLYGON,
    paint: { 'line-color': COLOR, 'line-width': 2 },
  })
  map.addLayer({
    id: 'suchlage-line',
    type: 'line',
    source: SUCHLAGE_SOURCE,
    filter: ['all', LINE, ['!', TRACK]] as maplibregl.FilterSpecification,
    paint: { 'line-color': COLOR, 'line-width': 2.5 },
  })
  map.addLayer({
    id: 'suchlage-track',
    type: 'line',
    source: SUCHLAGE_SOURCE,
    filter: ['all', LINE, TRACK] as maplibregl.FilterSpecification,
    paint: { 'line-color': COLOR, 'line-width': 2.5, 'line-dasharray': [2, 1] },
  })
  map.addLayer({
    id: 'suchlage-point',
    type: 'circle',
    source: SUCHLAGE_SOURCE,
    filter: POINT,
    paint: {
      'circle-color': COLOR,
      'circle-radius': 7,
      'circle-opacity': 0.85,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })
}
