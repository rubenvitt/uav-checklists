import { useRef, useState, useCallback, lazy, Suspense, type ChangeEvent } from 'react'
import { PiMapTrifold, PiCamera, PiX, PiFloppyDisk } from 'react-icons/pi'
import ChecklistSection from '../ChecklistSection'
import { useMapData } from '../../hooks/useMapData'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { SHAPE_LABELS, SHAPE_COLORS } from '../../types/mapData'
import type { EinsatzMapHandle } from '../map/EinsatzMap'

const EinsatzMap = lazy(() => import('../map/EinsatzMap'))

export type EinsatzkarteMode = 'map' | 'photo'

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

/** Resize image data-URL to max dimension, returns JPEG data-URL */
function resizeImage(dataUrl: string, maxDim: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= maxDim && height <= maxDim) {
        resolve(dataUrl)
        return
      }
      const ratio = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

interface EinsatzkarteSectionProps {
  latitude: number | null
  longitude: number | null
  locked: boolean
}

export default function EinsatzkarteSection({ latitude, longitude, locked }: EinsatzkarteSectionProps) {
  const [mapData, setMapData] = useMapData()
  const [snapshot, setSnapshot] = useMissionPersistedState<string>('einsatzkarte:snapshot', '')
  const [photo, setPhoto] = useMissionPersistedState<string>('einsatzkarte:photo', '')
  const [mode, setMode] = useMissionPersistedState<EinsatzkarteMode>('einsatzkarte:mode', 'map')
  const [capturing, setCapturing] = useState(false)
  const mapRef = useRef<EinsatzMapHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveMap = useCallback(async () => {
    setCapturing(true)
    try {
      const image = await mapRef.current?.captureImage()
      if (image) setSnapshot(image)
    } catch {
      // Capture can fail if container is hidden / zero-size
    } finally {
      setCapturing(false)
    }
  }, [setSnapshot])

  const handleRemoveSnapshot = useCallback(() => {
    setSnapshot('')
  }, [setSnapshot])

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const resized = await resizeImage(dataUrl, 1600)
      setPhoto(resized)
    }
    reader.readAsDataURL(file)
    // Reset input so re-selecting the same file triggers change
    e.target.value = ''
  }, [setPhoto])

  const handleRemovePhoto = useCallback(() => {
    setPhoto('')
  }, [setPhoto])

  const featureCount = mapData.features.length
  const hasSnapshot = snapshot !== ''
  const hasPhoto = photo !== ''
  const badge = mode === 'map' && hasSnapshot
    ? { label: 'Gespeichert', status: 'good' as const }
    : mode === 'photo' && hasPhoto
      ? { label: 'Foto', status: 'good' as const }
      : undefined

  return (
    <ChecklistSection
      title="Einsatzkarte"
      icon={<PiMapTrifold />}
      badge={badge}
      locked={locked}
    >
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg bg-surface-alt p-1">
        <button
          type="button"
          onClick={() => setMode('map')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'map'
              ? 'bg-surface text-text shadow-sm'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Karte zeichnen
        </button>
        <button
          type="button"
          onClick={() => setMode('photo')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'photo'
              ? 'bg-surface text-text shadow-sm'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <PiCamera />
            Kartenfoto
          </span>
        </button>
      </div>

      {/* Map mode */}
      {mode === 'map' && latitude !== null && longitude !== null && (
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

          <button
            type="button"
            onClick={handleSaveMap}
            disabled={capturing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-alt px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-alt/80 disabled:opacity-50"
          >
            {capturing ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Wird gespeichert...
              </>
            ) : (
              <>
                <PiFloppyDisk />
                {hasSnapshot ? 'Karte erneut speichern' : 'Karte speichern'}
              </>
            )}
          </button>

          {hasSnapshot && (
            <div className="relative mt-1">
              <p className="mb-1.5 text-xs text-text-muted">Gespeicherte Ansicht (wird im PDF verwendet):</p>
              <img
                src={snapshot}
                alt="Kartenvorschau"
                className="w-full rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={handleRemoveSnapshot}
                className="absolute top-6 right-2 rounded-full bg-surface/80 p-1.5 text-text-muted backdrop-blur-sm transition-colors hover:bg-surface hover:text-text"
                title="Gespeicherte Ansicht entfernen"
              >
                <PiX className="text-lg" />
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'map' && (latitude === null || longitude === null) && (
        <p className="text-sm text-text-muted">Standort wird benötigt, um die Karte anzuzeigen.</p>
      )}

      {/* Photo mode */}
      {mode === 'photo' && (
        <>
          {!hasPhoto && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 text-text-muted transition-colors hover:border-text-muted hover:text-text"
            >
              <PiCamera className="text-3xl" />
              <span className="text-sm">Foto einer Karte aufnehmen oder hochladen</span>
            </button>
          )}

          {hasPhoto && (
            <div className="relative">
              <img
                src={photo}
                alt="Kartenfoto"
                className="w-full rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 rounded-full bg-surface/80 p-1.5 text-text-muted backdrop-blur-sm transition-colors hover:bg-surface hover:text-text"
                title="Foto entfernen"
              >
                <PiX className="text-lg" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {hasPhoto && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-text-muted underline hover:text-text"
            >
              Anderes Foto wählen
            </button>
          )}
        </>
      )}
    </ChecklistSection>
  )
}
