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
  hintSuchlageRemoteState,
  updateSuchlageLink,
} from '../utils/suchlageStore'
import { dataUrlToJpegBlob } from '../utils/imageJpeg'

export const SYNC_INTERVAL_MS = 30_000
const LOCK_NAME = 'flugmappe-suchlage-sync'

// Modulweit: nie zwei Durchläufe gleichzeitig (auch nicht bei zwei Effekt-Läufen
// nach einem Token-Wechsel). Zwischen Tabs sperrt `navigator.locks`, wo vorhanden.
let syncRunning = false
let rerunRequested = false

/** Ausgangslisten aller Einsätze einmal abarbeiten. `true` = 401/403, alles ruht. */
async function syncAll(force: boolean, isStopped: () => boolean): Promise<boolean> {
  for (const mission of loadMissions()) {
    if (isStopped()) return false
    const link = getSuchlageLink(mission.id)
    if (!link) continue
    let items = getSuchlageOutbox(mission.id)
    if (items.length === 0) continue
    // Einsatz in Suchlage weg oder von anderer Flugmappe übernommen: nichts mehr senden.
    if (link.remoteState === 'gone' || link.remoteState === 'replaced') {
      setSuchlageOutbox(mission.id, [])
      continue
    }
    // Weich gelöscht: ein ausstehender Abschluss geht trotzdem noch hinaus, der Rest nicht.
    if (mission.deletedAt) {
      const onlyClose = items.filter((i) => i.kind === 'close')
      if (onlyClose.length !== items.length) setSuchlageOutbox(mission.id, onlyClose)
      items = onlyClose
      if (items.length === 0) continue
    }
    const result = await drainOutbox({
      read: () => getSuchlageOutbox(mission.id),
      write: (next) => setSuchlageOutbox(mission.id, next),
      send: (item) => sendItem(mission.id, item),
      now: Date.now,
      force,
      onRemoved: ({ item, sent }) => {
        if (sent && item.kind === 'section') {
          updateSuchlageLink(mission.id, (l) => ({ ...l, sections: { ...l.sections, [item.segmentId]: true } }))
        }
      },
      onRemote: (hint) => hintSuchlageRemoteState(mission.id, hint),
    })
    if (getSuchlageLink(mission.id)?.remoteState === 'replaced') setSuchlageOutbox(mission.id, [])
    if (result.rested) return true
  }
  return false
}

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
    // 401/403: bis zum nächsten Token (neuer Effektlauf) ruhen.
    let rested = false

    const run = async (force: boolean): Promise<void> => {
      if (rested || stopped) return
      if (syncRunning) {
        rerunRequested = true
        return
      }
      syncRunning = true
      try {
        const body = async () => { rested = await syncAll(force, () => stopped) }
        const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
        if (locks?.request) {
          // Läuft gerade ein anderer Tab, übernimmt der: hier nichts tun.
          await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
            if (lock) await body()
          })
        } else {
          await body()
        }
      } finally {
        syncRunning = false
      }
      if (rerunRequested && !stopped) {
        rerunRequested = false
        await run(true)
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

