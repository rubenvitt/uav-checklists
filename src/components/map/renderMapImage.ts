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
  // Im Dokument und unsichtbar: MapLibre braucht eine echte Größe.
  host.style.cssText = `position:fixed;left:0;top:0;opacity:0;z-index:-1;width:${width}px;height:${height}px;pointer-events:none;`
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
      // Nach dem Bild (oder Abbruch/Fehler/Entfernen) keine Prüfungen mehr einplanen.
      let done = false
      const abort = () => {
        done = true
        reject(new DOMException('abgebrochen', 'AbortError'))
      }
      if (opts.signal?.aborted) return abort()
      opts.signal?.addEventListener('abort', abort, { once: true })
      let styleReady = false
      const finish = () => {
        if (done) return
        done = true
        resolve()
      }
      m.once('remove', () => { done = true })
      m.once('style.load', () => {
        styleReady = true
        addSuchlageOverlay(m, data)
        if (bounds) m.fitBounds(bounds, { padding: 50, maxZoom: 16, animate: false })
        m.once('idle', finish)
        // Schlagen Kacheln fehl (offline), plant MapLibre keinen weiteren Frame und
        // `idle` bleibt aus: sobald alles geladen oder gescheitert ist, selbst zeichnen.
        const poll = () => {
          if (done || opts.signal?.aborted) return
          if (m.loaded() && m.areTilesLoaded() && !m.isMoving()) {
            m.once('render', finish)
            m.triggerRepaint()
          } else {
            setTimeout(poll, 150)
          }
        }
        // Erst nach dem ersten Frame prüfen, sonst gilt die Karte vor der ersten Kachelanfrage als geladen.
        m.once('render', () => setTimeout(poll, 400))
      })
      m.on('error', (ev) => {
        // Kachelfehler (offline) sind kein Abbruch: die Formen stehen dann auf leerem Grund.
        // Nur ohne Stil gibt es kein Bild.
        if (styleReady) return
        done = true
        reject(ev.error ?? new Error('Karte nicht geladen'))
      })
    })
    return m.getCanvas().toDataURL('image/jpeg', 0.85)
  } finally {
    map?.remove()
    host.remove()
  }
}
