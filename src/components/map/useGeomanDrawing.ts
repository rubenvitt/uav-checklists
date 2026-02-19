import { useEffect, useRef } from 'react'
import type L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import type { MapData, ShapeType, MapFeatureProperties } from '../../types/mapData'
import { SHAPE_COLORS } from '../../types/mapData'

interface UseGeomanDrawingOptions {
  map: LeafletMap | null
  mapData: MapData
  setMapData: (v: MapData | ((prev: MapData) => MapData)) => void
  activeShape: ShapeType | null
  onDrawEnd: () => void
}

function getStyleForShape(shapeType: ShapeType) {
  return {
    color: SHAPE_COLORS[shapeType],
    fillColor: SHAPE_COLORS[shapeType],
    fillOpacity: 0.2,
    weight: 2,
  }
}

export function useGeomanDrawing({ map, mapData, setMapData, activeShape, onDrawEnd }: UseGeomanDrawingOptions) {
  const layersRef = useRef<Map<string, L.Layer>>(new Map())
  const initializedRef = useRef(false)
  const activeShapeRef = useRef(activeShape)
  activeShapeRef.current = activeShape

  // Initialize geoman controls
  useEffect(() => {
    if (!map || !map.pm || initializedRef.current) return
    initializedRef.current = true

    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: false,
      drawCircle: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    })
    map.pm.setGlobalOptions({ snappable: true })
  }, [map])

  // Restore features from saved data
  useEffect(() => {
    if (!map || !map.pm) return

    const L = (window as unknown as { L: typeof import('leaflet') }).L
    if (!L) return

    layersRef.current.forEach((layer) => map.removeLayer(layer))
    layersRef.current.clear()

    for (const feature of mapData.features) {
      const props = feature.properties
      const style = getStyleForShape(props.shapeType)
      let layer: L.Layer

      if (feature.geometry.type === 'Point') {
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates
        layer = L.circleMarker([lat, lng], {
          radius: 8,
          ...style,
          fillOpacity: 0.8,
        })
      } else {
        layer = L.geoJSON(feature, {
          style: () => style,
        }).getLayers()[0]
      }

      if (layer) {
        const id = `${props.createdAt}`
        ;(layer as L.Layer & { _featureId?: string })._featureId = id
        layer.addTo(map)
        ;(layer as L.Layer & { pm?: { enable: () => void } }).pm?.enable()
        layersRef.current.set(id, layer)
      }
    }
  }, [map, mapData])

  // Handle drawing mode activation
  useEffect(() => {
    if (!map || !map.pm) return

    map.pm.disableDraw()

    if (!activeShape) return

    const style = getStyleForShape(activeShape)

    if (activeShape === 'standort') {
      map.pm.enableDraw('CircleMarker', {
        pathOptions: { ...style, fillOpacity: 0.8 },
        continueDrawing: false,
      })
    } else {
      map.pm.enableDraw('Polygon', {
        pathOptions: style,
        continueDrawing: false,
      })
    }
  }, [map, activeShape])

  // Handle pm:create event
  useEffect(() => {
    if (!map || !map.pm) return

    const onCreate = (e: { layer: L.Layer }) => {
      const shapeType = activeShapeRef.current
      if (!shapeType) return

      const layer = e.layer
      const id = `${Date.now()}`
      ;(layer as L.Layer & { _featureId?: string })._featureId = id
      layersRef.current.set(id, layer)

      let feature: GeoJSON.Feature<GeoJSON.Geometry, MapFeatureProperties>

      if ('getLatLng' in layer && typeof (layer as L.CircleMarker).getLatLng === 'function') {
        const marker = layer as L.CircleMarker
        const pos = marker.getLatLng()
        feature = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] },
          properties: { shapeType, createdAt: Date.now() },
        }
      } else {
        const geoJson = (layer as L.Polyline).toGeoJSON() as GeoJSON.Feature
        feature = {
          ...geoJson,
          properties: { shapeType, createdAt: Date.now() },
        }
      }

      setMapData((prev) => ({
        ...prev,
        features: [...prev.features, feature],
      }))

      ;(layer as L.Layer & { pm?: { enable: () => void } }).pm?.enable()
      onDrawEnd()
    }

    map.on('pm:create', onCreate)
    return () => { map.off('pm:create', onCreate) }
  }, [map, setMapData, onDrawEnd])

  // Handle pm:remove
  useEffect(() => {
    if (!map || !map.pm) return

    const onRemove = (e: { layer: L.Layer & { _featureId?: string } }) => {
      const id = e.layer._featureId
      if (!id) return
      layersRef.current.delete(id)
      setMapData((prev) => ({
        ...prev,
        features: prev.features.filter((f) => `${f.properties.createdAt}` !== id),
      }))
    }

    map.on('pm:remove', onRemove)
    return () => { map.off('pm:remove', onRemove) }
  }, [map, setMapData])

  const clearAll = () => {
    if (!map) return
    layersRef.current.forEach((layer) => map.removeLayer(layer))
    layersRef.current.clear()
    setMapData({ type: 'FeatureCollection', features: [] })
  }

  return { clearAll }
}
