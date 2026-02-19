import { forwardRef, useImperativeHandle, useState, useCallback, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import type { MapData, ShapeType } from '../../types/mapData'
import MapToolbar from './MapToolbar'
import { useGeomanDrawing } from './useGeomanDrawing'
import { captureMapImage } from './mapExport'

// Fix Leaflet default icon paths (known bundler issue)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export interface EinsatzMapHandle {
  captureImage: () => Promise<string>
}

interface EinsatzMapProps {
  latitude: number
  longitude: number
  mapData: MapData
  setMapData: (v: MapData | ((prev: MapData) => MapData)) => void
}

function boundsFromFeatures(features: MapData['features']): L.LatLngBounds | null {
  const allCoords: [number, number][] = []
  for (const feature of features) {
    const geom = feature.geometry
    if (geom.type === 'Point') {
      const [lng, lat] = geom.coordinates
      allCoords.push([lat, lng])
    } else if (geom.type === 'Polygon') {
      for (const ring of geom.coordinates) {
        for (const [lng, lat] of ring) {
          allCoords.push([lat, lng])
        }
      }
    } else if (geom.type === 'LineString') {
      for (const [lng, lat] of geom.coordinates) {
        allCoords.push([lat, lng])
      }
    }
  }
  if (allCoords.length === 0) return null
  const bounds = L.latLngBounds(allCoords)
  return bounds.isValid() ? bounds : null
}

function MapSizeInvalidator({ mapData }: { mapData: MapData }) {
  const map = useMap()
  const hasResizedRef = useRef(false)

  useEffect(() => {
    const container = map.getContainer()

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width === 0 || height === 0) return

      map.invalidateSize()

      // After first real resize (section opened), fit bounds if we have features
      if (!hasResizedRef.current) {
        hasResizedRef.current = true
        const bounds = boundsFromFeatures(mapData.features)
        if (bounds) {
          // Small delay so Leaflet can recalculate container size first
          requestAnimationFrame(() => {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
          })
        }
      }
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [map, mapData])

  return null
}

function MapInner({ mapData, setMapData }: { mapData: MapData; setMapData: EinsatzMapProps['setMapData'] }) {
  const map = useMap()
  const [activeShape, setActiveShape] = useState<ShapeType | null>(null)
  const prevFeatureCountRef = useRef(mapData.features.length)

  const handleDrawEnd = useCallback(() => {
    setActiveShape(null)
  }, [])

  const { clearAll } = useGeomanDrawing({
    map,
    mapData,
    setMapData,
    activeShape,
    onDrawEnd: handleDrawEnd,
  })

  // Fit bounds when features are added (not on initial load — that's handled by MapSizeInvalidator)
  useEffect(() => {
    const prevCount = prevFeatureCountRef.current
    prevFeatureCountRef.current = mapData.features.length

    // Only fit on new features added, not on initial mount or deletion
    if (mapData.features.length === 0 || mapData.features.length <= prevCount) return

    const container = map.getContainer()
    if (container.clientWidth === 0 || container.clientHeight === 0) return

    const bounds = boundsFromFeatures(mapData.features)
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }, [map, mapData])

  return (
    <MapToolbar
      activeShape={activeShape}
      onSelectShape={setActiveShape}
      onClear={clearAll}
      featureCount={mapData.features.length}
    />
  )
}

function MapCenterUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }
    map.setView([latitude, longitude], map.getZoom())
  }, [map, latitude, longitude])

  return null
}

const EinsatzMap = forwardRef<EinsatzMapHandle, EinsatzMapProps>(function EinsatzMap(
  { latitude, longitude, mapData, setMapData },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    captureImage: async () => {
      if (!containerRef.current) throw new Error('Map container not mounted')
      return captureMapImage(containerRef.current)
    },
  }))

  return (
    <div ref={containerRef} className="relative h-64 w-full overflow-hidden rounded-lg sm:h-80">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />
        <MapSizeInvalidator mapData={mapData} />
        <MapCenterUpdater latitude={latitude} longitude={longitude} />
        <MapInner mapData={mapData} setMapData={setMapData} />
      </MapContainer>
    </div>
  )
})

export default EinsatzMap
