import * as maplibregl from 'maplibre-gl'
import './maplibreWorker'
import { basemapStyle } from './basemapStyle'
import { addSuchlageOverlay } from './suchlageOverlay'
import { collectionBounds, type DisplayCollection } from '../../utils/suchlageMap'

export interface RenderMapImageOptions {
  /** Mitte, falls die Sammlung leer ist ([lon, lat]) */
  center?: [number, number] | null
  width?: number
  height?: number
  /** Abbruch, z. B. bei Zeitlimit */
  signal?: AbortSignal
}

/**
 * Zeichnet eine GeoJSON-Karte ohne sichtbare Karte (für den Bericht): eine
 * unsichtbare MapLibre-Karte im hellen Stil, eingepasst auf alle Formen, als
 * JPEG-Data-URL. Seitenverhältnis wie im Bericht (5:3). `null`, wenn es nichts
 * zu zeigen gibt oder WebGL fehlt.
 */
export async function renderMapImage(data: DisplayCollection, opts: RenderMapImageOptions = {}): Promise<string | null> {
  const bounds = collectionBounds(data.features)
  if (!bounds && !opts.center) return null
  const width = opts.width ?? 1000
  const height = opts.height ?? 600

  const host = document.createElement('div')
  // Im Dokument, aber außerhalb des Bildes: MapLibre braucht eine echte Größe.
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`
  host.setAttribute('aria-hidden', 'true')
  document.body.appendChild(host)

  let map: maplibregl.Map | null = null
  try {
    try {
      map = new maplibregl.Map({
        container: host,
        style: basemapStyle('light'),
        center: opts.center ?? [0, 0],
        zoom: 14,
        interactive: false,
        attributionControl: false,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        fadeDuration: 0,
        pixelRatio: 1,
      })
    } catch (e) {
      if (e instanceof maplibregl.GPUInitializationError) return null
      throw e
    }
    const m = map
    await new Promise<void>((resolve, reject) => {
      const abort = () => reject(new DOMException('abgebrochen', 'AbortError'))
      if (opts.signal?.aborted) return abort()
      opts.signal?.addEventListener('abort', abort, { once: true })
      m.once('style.load', () => {
        addSuchlageOverlay(m, data)
        if (bounds) m.fitBounds(bounds, { padding: 50, maxZoom: 16, animate: false })
        m.once('idle', () => resolve())
      })
      m.once('error', (ev) => {
        // Einzelne Kachelfehler sind kein Abbruch; nur der Stil ist Pflicht.
        if (!m.isStyleLoaded()) reject(ev.error ?? new Error('Karte nicht geladen'))
      })
    })
    return m.getCanvas().toDataURL('image/jpeg', 0.85)
  } finally {
    map?.remove()
    host.remove()
  }
}
