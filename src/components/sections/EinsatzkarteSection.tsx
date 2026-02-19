import { useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { PiMapTrifold } from 'react-icons/pi'
import ChecklistSection from '../ChecklistSection'
import { useMapData } from '../../hooks/useMapData'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { SHAPE_LABELS, SHAPE_COLORS } from '../../types/mapData'
import type { EinsatzMapHandle } from '../map/EinsatzMap'

const EinsatzMap = lazy(() => import('../map/EinsatzMap'))

/** Geodätische Flächenberechnung (Shoelace auf Sphäre) für ein GeoJSON-Polygon in m² */
function computePolygonArea(coords: number[][]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  let area = 0
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    area += toRad(coords[j][0] - coords[i][0]) *
      (2 + Math.sin(toRad(coords[i][1])) + Math.sin(toRad(coords[j][1])))
  }
  return Math.abs((area * R * R) / 2)
}

function formatArea(sqm: number): string {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(1)} ha`
  return `${Math.round(sqm)} m²`
}

interface EinsatzkarteSectionProps {
  latitude: number | null
  longitude: number | null
  locked: boolean
}

export default function EinsatzkarteSection({ latitude, longitude, locked }: EinsatzkarteSectionProps) {
  const [mapData, setMapData] = useMapData()
  const [, setSnapshot] = useMissionPersistedState<string>('einsatzkarte:snapshot', '')
  const mapRef = useRef<EinsatzMapHandle>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tilesReadyRef = useRef(false)

  const captureSnapshot = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const image = await mapRef.current?.captureImage()
        if (image) setSnapshot(image)
      } catch {
        // Capture can fail if container is hidden / zero-size
      }
    }, 500)
  }, [setSnapshot])

  // Capture when map settles (tile load + moveend after fitBounds/pan)
  const handleMapUpdate = useCallback(() => {
    tilesReadyRef.current = true
    captureSnapshot()
  }, [captureSnapshot])

  // Re-capture when features change, but only after tiles have loaded once
  useEffect(() => {
    if (!tilesReadyRef.current) return
    captureSnapshot()
  }, [mapData, captureSnapshot])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const featureCount = mapData.features.length
  const badge = featureCount > 0
    ? { label: `${featureCount} ${featureCount === 1 ? 'Objekt' : 'Objekte'}`, status: 'good' as const }
    : undefined

  return (
    <ChecklistSection
      title="Einsatzkarte"
      icon={<PiMapTrifold />}
      badge={badge}
      locked={locked}
    >
      {latitude !== null && longitude !== null && (
        <>
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center rounded-lg bg-surface-alt sm:h-80">
                <span className="text-sm text-text-muted">Karte wird geladen...</span>
              </div>
            }
          >
            <EinsatzMap
              ref={mapRef}
              latitude={latitude}
              longitude={longitude}
              mapData={mapData}
              setMapData={setMapData}
              onMapUpdate={handleMapUpdate}
            />
          </Suspense>

          {featureCount > 0 && (
            <ul className="mt-2 space-y-1">
              {mapData.features.map((f) => {
                const isPolygon = f.geometry.type === 'Polygon'
                const area = isPolygon
                  ? computePolygonArea((f.geometry as GeoJSON.Polygon).coordinates[0])
                  : null
                return (
                  <li key={f.properties.createdAt} className="flex items-center gap-2 text-sm text-text-muted">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: SHAPE_COLORS[f.properties.shapeType] }}
                    />
                    <span>{SHAPE_LABELS[f.properties.shapeType]}</span>
                    {area !== null && (
                      <span className="text-xs">({formatArea(area)})</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </ChecklistSection>
  )
}
