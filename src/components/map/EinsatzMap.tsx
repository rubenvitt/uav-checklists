import { forwardRef, useEffect, useEffectEvent, useImperativeHandle, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './maplibreWorker'
import type { MapData, ShapeType } from '../../types/mapData'
import { SHAPE_COLORS } from '../../types/mapData'
import MapToolbar from './MapToolbar'
import { mapCanvasToJpeg } from './attribution'
import { BASEMAP_ATTRIBUTION, basemapStyle } from './basemapStyle'
import { addPoint, boundsOf, canFinish, draftCollection, removeLastPoint, toFeature, type Draft } from './draft'

export interface EinsatzMapHandle {
  captureImage: () => Promise<string>
}

interface EinsatzMapProps {
  latitude: number
  longitude: number
  mapData: MapData
  setMapData: (v: MapData | ((prev: MapData) => MapData)) => void
}

type Theme = 'light' | 'dark'

const FIT = { padding: 40, maxZoom: 15 }
/** Ein Tipp so nah an der ersten Ecke schließt die Fläche, statt eine fast doppelte Ecke zu setzen. */
const CLOSE_PX = 10
const POLYGON = ['==', ['geometry-type'], 'Polygon'] as maplibregl.FilterSpecification
const POINT = ['==', ['geometry-type'], 'Point'] as maplibregl.FilterSpecification
const NOT_POINT = ['!=', ['geometry-type'], 'Point'] as maplibregl.FilterSpecification
const SHAPE_COLOR = [
  'match', ['get', 'shapeType'], 'standort', SHAPE_COLORS.standort, SHAPE_COLORS.einsatzgebiet,
] as maplibregl.ExpressionSpecification
const DRAFT_COLOR = SHAPE_COLORS.einsatzgebiet
/** MapLibres Bedienhilfen sind englisch; ohne eigene Steuerelemente erscheinen nur diese drei. */
const LOCALE = {
  'Map.Title': 'Karte',
  'AttributionControl.ToggleAttribution': 'Quellenangabe ein- oder ausblenden',
  'AttributionControl.MapFeedback': 'Rückmeldung zur Karte',
}

const currentTheme = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')

/** Wartet, bis Kacheln, Daten und Kamera zur Ruhe gekommen sind. */
async function settled(map: maplibregl.Map) {
  // `idle` feuert nur nach einem Renderdurchlauf: Auf einer schon ruhenden Karte käme es nie.
  if (map.loaded() && !map.isMoving()) return
  await Promise.race([map.once('idle'), map.once('remove')])
}

function setStyle(map: maplibregl.Map, theme: Theme) {
  // Ohne `diff: false` gleicht MapLibre die Stile nur ab, `style.load` bleibt aus und die eigenen Ebenen fehlen.
  map.setStyle(basemapStyle(theme), { diff: false })
}

/** Quellen und Ebenen über der Basiskarte; nach jedem Stilwechsel neu, weil `setStyle` sie verwirft. */
function addOverlay(map: maplibregl.Map, data: MapData, draft: Draft | null) {
  map.addSource('einsatzkarte', { type: 'geojson', data })
  map.addSource('entwurf', { type: 'geojson', data: draftCollection(draft) })
  map.addLayer({
    id: 'einsatzkarte-fill',
    type: 'fill',
    source: 'einsatzkarte',
    filter: POLYGON,
    paint: { 'fill-color': SHAPE_COLOR, 'fill-opacity': 0.2 },
  })
  map.addLayer({
    id: 'einsatzkarte-line',
    type: 'line',
    source: 'einsatzkarte',
    filter: NOT_POINT,
    paint: { 'line-color': SHAPE_COLOR, 'line-width': 2 },
  })
  map.addLayer({
    id: 'einsatzkarte-point',
    type: 'circle',
    source: 'einsatzkarte',
    filter: POINT,
    paint: {
      'circle-color': SHAPE_COLOR,
      'circle-radius': 8,
      'circle-opacity': 0.8,
      'circle-stroke-color': SHAPE_COLOR,
      'circle-stroke-width': 2,
    },
  })
  map.addLayer({
    id: 'entwurf-fill',
    type: 'fill',
    source: 'entwurf',
    filter: POLYGON,
    paint: { 'fill-color': DRAFT_COLOR, 'fill-opacity': 0.1 },
  })
  map.addLayer({
    id: 'entwurf-line',
    type: 'line',
    source: 'entwurf',
    filter: NOT_POINT,
    paint: { 'line-color': DRAFT_COLOR, 'line-width': 2, 'line-dasharray': [2, 1.5] },
  })
  map.addLayer({
    id: 'entwurf-vertex',
    type: 'circle',
    source: 'entwurf',
    filter: POINT,
    paint: {
      'circle-radius': 5,
      'circle-color': '#ffffff',
      'circle-stroke-color': DRAFT_COLOR,
      'circle-stroke-width': 2,
    },
  })
}

const EinsatzMap = forwardRef<EinsatzMapHandle, EinsatzMapProps>(function EinsatzMap(
  { latitude, longitude, mapData, setMapData },
  ref,
) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  // Das Thema der Seite, dem die Karte folgt; beim Speichern zeigt sie kurz das helle.
  const theme = useRef<Theme>(currentTheme())
  const capturing = useRef(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  const finish = (d: Draft) => {
    if (!canFinish(d)) return
    setMapData((prev) => ({ ...prev, features: [...prev.features, toFeature(d, Date.now())] }))
    setDraft(null)
  }

  const fitToFeatures = useEffectEvent((map: maplibregl.Map) => {
    const bounds = boundsOf(mapData.features)
    if (bounds) map.fitBounds(bounds, FIT)
  })
  const styleLoaded = useEffectEvent((map: maplibregl.Map) => addOverlay(map, mapData, draft))
  const initialCenter = useEffectEvent((): [number, number] => [longitude, latitude])

  const clicked = useEffectEvent((e: maplibregl.MapMouseEvent) => {
    if (!draft) return
    if (draft.shape === 'einsatzgebiet') {
      // Der zweite Klick eines Doppelklicks setzt keinen Eckpunkt mehr; der Doppelklick schließt ab.
      if (e.originalEvent.detail > 1) return
      if (canFinish(draft) && e.target.project(draft.points[0]).dist(e.point) <= CLOSE_PX) return finish(draft)
    }
    const next = addPoint(draft, [e.lngLat.lng, e.lngLat.lat])
    if (next.shape === 'standort') finish(next)
    else setDraft(next)
  })
  const doubleClicked = useEffectEvent(() => {
    if (draft?.shape === 'einsatzgebiet') finish(draft)
  })

  useEffect(() => {
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: container.current!,
        style: basemapStyle(theme.current),
        center: initialCenter(),
        zoom: 15,
        attributionControl: { compact: true },
        locale: LOCALE,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        // Norden bleibt oben wie bei der alten Karte: Das Bild im Bericht ist nie gedreht.
        dragRotate: false,
        touchPitch: false,
        maxPitch: 0,
      })
    } catch (e) {
      // Ohne WebGL 2 steht ein Hinweis statt der Karte; der Rest des Einsatzes bleibt bedienbar.
      if (!(e instanceof maplibregl.GPUInitializationError)) throw e
      setUnavailable(true)
      return
    }
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    mapRef.current = map
    map.on('style.load', () => styleLoaded(map))
    map.on('click', (e) => clicked(e))
    map.on('dblclick', () => doubleClicked())

    const themeObserver = new MutationObserver(() => {
      const next = currentTheme()
      if (capturing.current || next === theme.current) return
      theme.current = next
      setStyle(map, next)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    // Im zugeklappten Abschnitt hat die Karte keine Größe; eingepasst wird beim ersten Aufklappen.
    let framed = false
    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return
      map.resize()
      if (framed) return
      framed = true
      fitToFeatures(map)
    })
    resizeObserver.observe(container.current!)

    return () => {
      themeObserver.disconnect()
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    mapRef.current?.getSource<maplibregl.GeoJSONSource>('einsatzkarte')?.setData(mapData)
  }, [mapData])

  // Ein neues Element holt alle ins Bild; Löschen verschiebt nichts.
  const featureCount = useRef(mapData.features.length)
  useEffect(() => {
    const previous = featureCount.current
    featureCount.current = mapData.features.length
    const map = mapRef.current
    if (!map || mapData.features.length <= previous || !container.current?.clientWidth) return
    fitToFeatures(map)
  }, [mapData])

  const drafting = draft !== null
  useEffect(() => {
    mapRef.current?.getSource<maplibregl.GeoJSONSource>('entwurf')?.setData(draftCollection(draft))
  }, [draft])

  useEffect(() => {
    const zoom = mapRef.current?.doubleClickZoom
    if (drafting) zoom?.disable()
    else zoom?.enable()
  }, [drafting])

  // Escape bricht ab, Eingabe schließt ab, Rücktaste nimmt den letzten Eckpunkt zurück.
  const keyPressed = useEffectEvent((e: KeyboardEvent) => {
    if (!draft || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (e.key === 'Escape') setDraft(null)
    else if (e.key === 'Enter') finish(draft)
    else if (e.key === 'Backspace') setDraft(removeLastPoint(draft))
    else return
    // Sonst löst Eingabe auch den fokussierten Werkzeugknopf aus und beendet das Zeichnen.
    e.preventDefault()
  })
  useEffect(() => {
    if (!drafting) return
    const listener = (e: KeyboardEvent) => keyPressed(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [drafting])

  // Neuer Standort: Mitte verschieben, Maßstab behalten. Beim ersten Rendern steht sie schon.
  const centered = useRef(false)
  useEffect(() => {
    if (!centered.current) {
      centered.current = true
      return
    }
    mapRef.current?.setCenter([longitude, latitude])
  }, [latitude, longitude])

  useImperativeHandle(ref, () => ({
    captureImage: async () => {
      const map = mapRef.current
      if (!map || map.getCanvas().width === 0) throw new Error('Map not visible')
      // Bild und Daten sollen übereinstimmen: Ein Entwurf wird abgeschlossen, wenn er reicht, sonst verworfen.
      if (draft) {
        if (canFinish(draft)) finish(draft)
        else setDraft(null)
        // React schreibt die neuen Daten im nächsten Durchlauf in die Quellen.
        await new Promise(requestAnimationFrame)
      }
      // Das Bild im Bericht ist immer hell, auch wenn die Seite dunkel ist.
      let shown = theme.current
      capturing.current = true
      try {
        if (shown === 'dark') {
          shown = 'light'
          setStyle(map, shown)
        }
        await settled(map)
        return mapCanvasToJpeg(map.getCanvas(), BASEMAP_ATTRIBUTION)
      } finally {
        capturing.current = false
        theme.current = currentTheme()
        if (theme.current !== shown) setStyle(map, theme.current)
      }
    },
  }))

  if (unavailable) {
    return (
      <div className="flex h-64 items-center justify-center bg-surface-alt p-4 text-center text-sm text-text-muted sm:h-80">
        Karte nicht verfügbar: Dieser Browser bietet kein WebGL 2.
      </div>
    )
  }

  const selectShape = (shape: ShapeType | null) => {
    // Eine Fläche mit Ecken geht nicht durch einen Werkzeugtipp verloren: erneuter Tipp schließt ab, sonst bleibt sie.
    if (draft && draft.points.length > 0) {
      if (shape === null) finish(draft)
      return
    }
    setDraft(shape ? { shape, points: [] } : null)
  }

  return (
    <div className="einsatz-map relative h-64 w-full overflow-hidden rounded-lg sm:h-80" data-drawing={drafting}>
      <div ref={container} className="h-full w-full" />
      <MapToolbar
        activeShape={draft?.shape ?? null}
        onSelectShape={selectShape}
        onClear={() => setMapData({ type: 'FeatureCollection', features: [] })}
        featureCount={mapData.features.length}
        onFinish={draft?.shape === 'einsatzgebiet' ? () => finish(draft) : null}
        canFinish={draft !== null && canFinish(draft)}
        onUndo={() => draft && setDraft(removeLastPoint(draft))}
        canUndo={(draft?.points.length ?? 0) > 0}
      />
      {draft && (
        <p className="pointer-events-none absolute bottom-2 left-2 z-[1000] max-w-[calc(100%-4.5rem)] border border-line bg-surface/90 px-2 py-1 text-xs text-text">
          {draft.shape === 'standort' ? 'Standort antippen' : 'Ecken antippen, mit ✓ abschließen'}
        </p>
      )}
    </div>
  )
})

export default EinsatzMap
