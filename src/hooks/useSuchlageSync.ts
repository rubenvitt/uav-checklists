import { useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { isSuchlageConfigured, isSuchlageError, suchlage } from '../services/suchlageApi'
import { generateId, loadMissions } from '../utils/missionStorage'
import { getMissionField } from '../stores/missionFormStore'
import { drainOutbox, healOutbox, isHealable, sectionErrorText, type OutboxItem, type SendOutcome } from '../utils/suchlageOutbox'
import {
  getSuchlageLink,
  getSuchlageOutbox,
  onSuchlageSyncKick,
  setSuchlageOutbox,
  hintSuchlageRemoteState,
  updateSuchlageLink,
  type SuchlageLink,
} from '../utils/suchlageStore'
import { dataUrlToJpegBlob } from '../utils/imageJpeg'

export const SYNC_INTERVAL_MS = 30_000
const LOCK_NAME = 'flugmappe-suchlage-sync'

// Modulweit: nie zwei Durchläufe gleichzeitig (auch nicht bei zwei Effekt-Läufen
// nach einem Token-Wechsel). Zwischen Tabs sperrt `navigator.locks`, wo vorhanden.
let syncRunning = false
/** Während eines Laufs angefordert: `null` = nichts, sonst stärkstes `force`. */
let rerunForce: boolean | null = null
/**
 * Nach dieser Zeit beginnt ein Lauf keinen weiteren Eintrag mehr. Er wird nicht
 * abgebrochen: jeder Aufruf ist selbst zeitbegrenzt, und ein laufender Upload
 * soll nicht parallel ein zweites Mal starten.
 */
export const RUN_LIMIT_MS = 2 * 60_000

/** Ausgangslisten aller Einsätze einmal abarbeiten. `true` = 401/403, alles ruht. */
async function syncAll(force: boolean, isStopped: () => boolean): Promise<boolean> {
  for (const mission of loadMissions()) {
    if (isStopped()) return false
    const link = getSuchlageLink(mission.id)
    if (!link) continue
    // Einsatz in Suchlage weg oder von anderer Flugmappe übernommen: pausieren, nichts
    // verwerfen – löst sich der Zustand auf, geht es weiter.
    if (link.remoteState === 'gone' || link.remoteState === 'replaced') continue
    let items = getSuchlageOutbox(mission.id)
    // Selbstheilung: nach dem Verknüpfen entstandene Abschnitte, die in Suchlage fehlen.
    if (!mission.deletedAt && !link.remoteState) {
      const healed = healOutbox(mission.segments, link, items, Date.now(), generateId)
      if (healed !== items) {
        items = healed
        setSuchlageOutbox(mission.id, items)
      }
    }
    if (items.length === 0) continue
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
      shouldStop: isStopped,
      onRemoved: ({ item, sent }, outcome) => {
        if (item.kind !== 'section') return
        const error = sent ? null : sectionErrorText(outcome)
        updateSuchlageLink(mission.id, (l) => {
          const sectionErrors = { ...l.sectionErrors }
          if (sent) delete sectionErrors[item.segmentId]
          else if (error) sectionErrors[item.segmentId] = error
          return {
            ...l,
            sections: sent ? { ...l.sections, [item.segmentId]: true } : l.sections,
            sectionErrors,
          }
        })
      },
      onRemote: (hint) => hintSuchlageRemoteState(mission.id, hint),
    })
    if (result.rested) return true
  }
  return false
}

/**
 * Abschnitt in Suchlage noch nicht angelegt: zurückstellen, wenn er noch kommt
 * (wartender Eintrag oder Heilung), sonst verwerfen – senden gäbe nur 404.
 */
function sectionNotThere(missionId: string, segmentId: string, link: SuchlageLink): SendOutcome {
  const segments = loadMissions().find((m) => m.id === missionId)?.segments ?? []
  const segment = segments.find((sg) => sg.id === segmentId)
  const waiting = getSuchlageOutbox(missionId).some((i) => i.kind === 'section' && i.segmentId === segmentId)
  const coming = waiting || (!!segment && isHealable(segment, segments, link))
  return coming
    ? { ok: false, kind: 'other', status: 404, defer: true }
    : { ok: false, kind: 'other', status: 404 }
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
      case 'sectionUpdate': {
        if (!link.sections[item.segmentId]) return sectionNotThere(missionId, item.segmentId, link)
        const seg = loadMissions().find((m) => m.id === missionId)?.segments.find((s) => s.id === item.segmentId)
        if (!seg) break // Abschnitt weg: nichts zu senden
        await suchlage.updateSection(id, missionId, item.segmentId, {
          label: seg.label,
          location: seg.locationName || null,
        })
        break
      }
      case 'photo': {
        if (!link.sections[item.segmentId]) return sectionNotThere(missionId, item.segmentId, link)
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
        rerunForce = (rerunForce ?? false) || force
        return
      }
      syncRunning = true
      rerunForce = null
      try {
        const body = async () => {
          // Nach RUN_LIMIT_MS keinen neuen Eintrag mehr beginnen; den laufenden zu Ende
          // bringen (jeder Aufruf hat sein eigenes Zeitlimit).
          let expired = false
          const timer = setTimeout(() => { expired = true }, RUN_LIMIT_MS)
          try {
            rested = await syncAll(force, () => stopped || expired)
          } finally {
            clearTimeout(timer)
          }
        }
        const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
        if (locks?.request) {
          // Läuft gerade ein anderer Tab, übernimmt der: hier nichts tun.
          await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
            if (lock) await body()
          })
        } else {
          await body()
        }
      } catch {
        // Ein Fehler in einem Lauf darf die Abarbeitung nicht dauerhaft anhalten.
      } finally {
        syncRunning = false
      }
      if (rerunForce !== null && !stopped) {
        const nextForce = rerunForce
        rerunForce = null
        await run(nextForce)
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

