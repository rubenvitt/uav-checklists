export type ShapeType = 'einsatzgebiet' | 'standort'

export interface MapFeatureProperties {
  shapeType: ShapeType
  createdAt: number
}

export interface MapData {
  type: 'FeatureCollection'
  features: GeoJSON.Feature<GeoJSON.Geometry, MapFeatureProperties>[]
}

export const EMPTY_MAP_DATA: MapData = {
  type: 'FeatureCollection',
  features: [],
}

export const SHAPE_LABELS: Record<ShapeType, string> = {
  einsatzgebiet: 'Einsatzgebiet',
  standort: 'Standort',
}

export const SHAPE_COLORS: Record<ShapeType, string> = {
  einsatzgebiet: '#3b82f6',
  standort: '#ef4444',
}
