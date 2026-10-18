import { forwardRef, useEffect, useEffectEvent, useImperativeHandle, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './maplibreWorker'
import type { MapData, ShapeType } from '../../types/mapData'
import { SHAPE_COLORS } from '../../types/mapData'
import MapToolbar from './MapToolbar'
import { basemapStyle } from './basemapStyle'
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

  const clicked = useEffectEvent((p: [number, number], clickCount: number) => {
    if (!draft) return
    // Der zweite Klick eines Doppelklicks setzt keinen Eckpunkt mehr; der Doppelklick schließt ab.
    if (clickCount > 1 && draft.shape === 'einsatzgebiet') return
    const next = addPoint(draft, p)
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
    map.on('click', (e) => clicked([e.lngLat.lng, e.lngLat.lat], e.originalEvent.detail))
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
      // Das Bild im Bericht ist immer hell, auch wenn die Seite dunkel ist.
      let shown = theme.current
      capturing.current = true
      try {
        if (shown === 'dark') {
          shown = 'light'
          setStyle(map, shown)
          await map.once('idle')
        }
        return map.getCanvas().toDataURL('image/jpeg', 0.85)
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

  const selectShape = (shape: ShapeType | null) => setDraft(shape ? { shape, points: [] } : null)

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
      />
    </div>
  )
})

export default EinsatzMap
