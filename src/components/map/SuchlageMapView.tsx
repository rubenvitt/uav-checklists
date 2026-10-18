import { useEffect, useEffectEvent, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './maplibreWorker'
import { basemapStyle } from './basemapStyle'
import { SUCHLAGE_SOURCE, addSuchlageOverlay } from './suchlageOverlay'
import { collectionBounds, type DisplayCollection } from '../../utils/suchlageMap'

interface SuchlageMapViewProps {
  data: DisplayCollection
  /** Mitte, falls die Karte noch leer ist (Standort des Abschnitts) */
  latitude: number | null
  longitude: number | null
}

type Theme = 'light' | 'dark'

const FIT = { padding: 40, maxZoom: 15 }
const LOCALE = {
  'Map.Title': 'Karte',
  'AttributionControl.ToggleAttribution': 'Quellenangabe ein- oder ausblenden',
  'AttributionControl.MapFeedback': 'Rückmeldung zur Karte',
}

function supportsWebGL2(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    // Den Probe-Kontext gleich freigeben: Browser erlauben nur wenige gleichzeitig.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}

const currentTheme = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')

/**
 * Karte des Abschnitts aus Suchlage, nur zum Ansehen: Verschieben und Zoomen
 * gehen, Zeichnen nicht (gezeichnet wird in Suchlage).
 */
export default function SuchlageMapView({ data, latitude, longitude }: SuchlageMapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const theme = useRef<Theme>(currentTheme())
  // Ohne WebGL 2 steht ein Hinweis statt der Karte.
  const [unavailable] = useState(() => !supportsWebGL2())

  const styleLoaded = useEffectEvent((map: maplibregl.Map) => addSuchlageOverlay(map, data))
  const fit = useEffectEvent((map: maplibregl.Map) => {
    const bounds = collectionBounds(data.features)
    if (bounds) map.fitBounds(bounds, { ...FIT, animate: false })
  })
  const initialCenter = useEffectEvent((): [number, number] => [longitude ?? 10.45, latitude ?? 51.16])
  const initialZoom = useEffectEvent(() => (latitude !== null && longitude !== null ? 14 : 5))

  useEffect(() => {
    if (unavailable) return
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: container.current!,
        style: basemapStyle(theme.current),
        center: initialCenter(),
        zoom: initialZoom(),
        attributionControl: { compact: true },
        locale: LOCALE,
        dragRotate: false,
        touchPitch: false,
        maxPitch: 0,
      })
    } catch (e) {
      if (!(e instanceof maplibregl.GPUInitializationError)) throw e
      return
    }
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    mapRef.current = map
    map.on('style.load', () => styleLoaded(map))

    const themeObserver = new MutationObserver(() => {
      const next = currentTheme()
      if (next === theme.current) return
      theme.current = next
      map.setStyle(basemapStyle(next), { diff: false })
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    let framed = false
    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return
      map.resize()
      if (framed) return
      framed = true
      fit(map)
    })
    resizeObserver.observe(container.current!)

    return () => {
      themeObserver.disconnect()
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [unavailable])

  // Neuer Stand aus Suchlage: Daten tauschen, Ausschnitt bleibt.
  useEffect(() => {
    mapRef.current?.getSource<maplibregl.GeoJSONSource>(SUCHLAGE_SOURCE)?.setData(data)
  }, [data])

  if (unavailable) {
    return (
      <div className="flex h-64 items-center justify-center bg-surface-alt p-4 text-center text-sm text-text-muted sm:h-80">
        Karte nicht verfügbar: Dieser Browser bietet kein WebGL 2.
      </div>
    )
  }

  return (
    <div className="einsatz-map relative h-64 w-full overflow-hidden sm:h-80">
      <div ref={container} className="h-full w-full" aria-label="Karte aus Suchlage, nur zum Ansehen" />
    </div>
  )
}
