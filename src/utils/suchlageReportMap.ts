/**
 * Karte aus Suchlage für den Bericht: beim Erstellen frisch laden und als Bild
 * zeichnen (Zeitlimit 15 s), sonst den zuletzt gespeicherten Stand nehmen.
 * Das Bild liegt danach je Abschnitt unter `seg:<id>:suchlage:mapImage`, wo
 * `generateMissionReport` es synchron liest.
 */
import { getMissionField, setMissionField } from '../stores/missionFormStore'
import { suchlage } from '../services/suchlageApi'
import { getSegments } from './missionStorage'
import { getSuchlageLink } from './suchlageStore'
import { toDisplayCollection } from './suchlageMap'
import type { FmFeatureCollection } from '../types/suchlage'

export const REPORT_MAP_TIMEOUT_MS = 15_000

export interface StoredSuchlageMapImage {
  image: string
  /** Stand der Karte (ms) */
  at: number
}

export const mapKey = (segmentId: string) => `seg:${segmentId}:suchlage:map`
export const mapImageKey = (segmentId: string) => `seg:${segmentId}:suchlage:mapImage`

/**
 * Lädt und zeichnet die Suchlage-Karten aller in Suchlage angelegten
 * Abschnitte. `canFetch` = Suchlage konfiguriert, angemeldet und nicht ruhend;
 * sonst wird nur aus dem gespeicherten Stand gezeichnet (keine Anfrage).
 * Wirft nie; nach spätestens `timeoutMs` geht es mit dem weiter, was da ist.
 */
export async function prepareSuchlageReportMaps(missionId: string, canFetch: boolean, timeoutMs = REPORT_MAP_TIMEOUT_MS): Promise<void> {
  const link = getSuchlageLink(missionId)
  if (!link) return
  const segmentIds = getSegments(missionId).map((s) => s.id).filter((id) => link.sections[id])
  if (segmentIds.length === 0) return
  const fetchAllowed = canFetch && link.remoteState !== 'gone' && link.remoteState !== 'replaced'
  const ctrl = new AbortController()

  const work = async () => {
    const { renderMapImage } = await import('../components/map/renderMapImage')
    for (const segmentId of segmentIds) {
      if (ctrl.signal.aborted) return
      let data: FmFeatureCollection | null = null
      let at = Date.now()
      if (fetchAllowed) {
        try {
          data = await suchlage.map(link.suchlageMissionId, missionId, segmentId, ctrl.signal)
          setMissionField(missionId, mapKey(segmentId), { data, loadedAt: at })
        } catch { /* offline o. Ä.: gespeicherter Stand */ }
      }
      if (!data) {
        const stored = getMissionField<{ data: FmFeatureCollection; loadedAt: number } | null>(missionId, mapKey(segmentId), null)
        if (!stored) continue
        data = stored.data
        at = stored.loadedAt
      }
      const image = await renderMapImage(toDisplayCollection(data), { signal: ctrl.signal })
      if (image) setMissionField(missionId, mapImageKey(segmentId), { image, at } satisfies StoredSuchlageMapImage)
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<void>((resolve) => { timer = setTimeout(resolve, timeoutMs) })
  try {
    await Promise.race([work().catch(() => {}), timeout])
  } finally {
    clearTimeout(timer)
    ctrl.abort()
  }
}
