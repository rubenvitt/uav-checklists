import { useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { isSuchlageConfigured, isSuchlageError, suchlage } from '../services/suchlageApi'
import { loadMissions } from '../utils/missionStorage'
import { getMissionField } from '../stores/missionFormStore'
import { drainOutbox, type OutboxItem, type SendOutcome } from '../utils/suchlageOutbox'
import {
  getSuchlageLink,
  getSuchlageOutbox,
  onSuchlageSyncKick,
  setSuchlageOutbox,
  setSuchlageRemoteState,
  updateSuchlageLink,
} from '../utils/suchlageStore'
import { dataUrlToJpegBlob } from '../utils/imageJpeg'

export const SYNC_INTERVAL_MS = 30_000

async function sendItem(missionId: string, item: OutboxItem): Promise<SendOutcome> {
  const link = getSuchlageLink(missionId)
  if (!link) return { ok: true }
  const id = link.suchlageMissionId
  try {
    switch (item.kind) {
      case 'section': {
        // Bezeichnung und Ort frisch lesen: der Ort steht oft erst nach der Verlegung fest.
        const seg = loadMissions().find((m) => m.id === missionId)?.segments.find((s) => s.id === item.segmentId)
        await suchlage.createSection(id, missionId, {
          flugmappe_section_id: item.segmentId,
          label: seg?.label ?? item.label,
          location: seg?.locationName ?? item.location,
        })
        break
      }
      case 'photo': {
        const photo = getMissionField<string>(missionId, `seg:${item.segmentId}:einsatzkarte:photo`, '')
        if (!photo) break // inzwischen entfernt: nichts zu senden
        const jpeg = await dataUrlToJpegBlob(photo)
        await suchlage.uploadPhoto(id, missionId, item.segmentId, jpeg)
        break
      }
      case 'close':
        await suchlage.closeMission(id, missionId)
        break
    }
    return { ok: true }
  } catch (e) {
    if (isSuchlageError(e)) return { ok: false, kind: e.kind, status: e.status }
    // Bild nicht lesbar o. Ä.: kann nie gelingen.
    return { ok: false, kind: 'other', status: null }
  }
}

/**
 * Arbeitet die Ausgangslisten aller verknüpften Einsätze ab – auch nach dem
 * Abschluss, solange der Einsatz in der Flugmappe existiert. Läuft beim Start,
 * alle 30 s, bei `online`, bei Fokus und auf Anstoß. Ohne Adresse oder ohne
 * Anmeldung tut der Hook nichts.
 */
export function useSuchlageSync(): void {
  const { isAuthenticated, user } = useAuth()
  const enabled = isSuchlageConfigured() && isAuthenticated
  const token = user?.access_token ?? null

  useEffect(() => {
    if (!enabled || !token) return
    let stopped = false
    let running = false
    // 401/403: bis zum nächsten Token (neuer Effektlauf) ruhen.
    let rested = false

    const run = async (force: boolean) => {
      if (running || rested || stopped) return
      running = true
      try {
        for (const mission of loadMissions()) {
          if (stopped || mission.deletedAt) continue
          if (!getSuchlageLink(mission.id) || getSuchlageOutbox(mission.id).length === 0) continue
          const result = await drainOutbox({
            read: () => getSuchlageOutbox(mission.id),
            write: (items) => setSuchlageOutbox(mission.id, items),
            send: (item) => sendItem(mission.id, item),
            now: Date.now,
            force,
            onRemoved: ({ item, sent }) => {
              if (sent && item.kind === 'section') {
                updateSuchlageLink(mission.id, (l) => ({ ...l, sections: { ...l.sections, [item.segmentId]: true } }))
              }
            },
            onRemote: (hint) => setSuchlageRemoteState(mission.id, hint),
          })
          if (result.rested) {
            rested = true
            break
          }
        }
      } finally {
        running = false
      }
    }

    void run(true)
    const interval = setInterval(() => void run(false), SYNC_INTERVAL_MS)
    const onOnline = () => void run(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run(true)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    const unsubscribe = onSuchlageSyncKick(() => void run(true))
    return () => {
      stopped = true
      clearInterval(interval)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      unsubscribe()
    }
  }, [enabled, token])
}

