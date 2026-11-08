/**
 * Verknüpfung und Ausgangsliste eines Einsatzes mit Suchlage, gespeichert wie
 * alle Formulardaten im Einsatzspeicher (`uav-form:<missionId>:suchlage:*`).
 * Ohne Verknüpfung steht dort nichts.
 */
import { getMissionField, setMissionField } from '../stores/missionFormStore'
import { generateId } from './missionStorage'
import { enqueue, type NewOutboxItem, type OutboxItem } from './suchlageOutbox'
import type { LogbookState } from './suchlageLogbook'
import type { FmMission } from '../types/suchlage'
import { sameMissionId } from '../services/suchlageApi'

export const LINK_KEY = 'suchlage:link'
export const OUTBOX_KEY = 'suchlage:outbox'
/** Revisionen der an Suchlage gemeldeten Flugbucheinträge (`suchlageLogbook.ts`). */
export const LOGBOOK_KEY = 'suchlage:logbook'

/** Zustand des verknüpften Einsatzes in Suchlage, soweit die Flugmappe ihn kennt. */
export type SuchlageRemoteState =
  | 'closed'
  /** gelöscht oder nicht mehr auffindbar (404) */
  | 'gone'
  /** Verknüpfung in Suchlage gelöst (409 Bindung); neu verknüpfen geht */
  | 'released'

/** Eine andere Flugmappe am selben Suchlage-Einsatz (nicht gelöst). */
export interface SuchlagePeer {
  aircraftLabel: string
  linkedBy: string
  linkedAt: number
  /** Hat ihren Teil abgeschlossen. */
  doneAt: number | null
}

/** Hinweis zu einem Flugbucheintrag, z. B. Bestätigung von einem anderen Trupp abgelehnt. */
export interface SuchlageLogbookNotice {
  entryId: string
  text: string
  at: number
}

export interface SuchlageLink {
  suchlageMissionId: number
  missionName: string
  linkedAt: number
  /** Abschnitte (Segment-IDs), die in Suchlage angelegt sind */
  sections: Record<string, true>
  remoteState?: SuchlageRemoteState
  /** Ergebnis von „Kartenelemente übernehmen“ beim Verknüpfen */
  mapImport?: 'ok' | 'failed'
  /** Abschnitte, die Suchlage abgelehnt hat (z. B. 400), mit Meldung */
  sectionErrors?: Record<string, string>
  /** Die anderen verknüpften Flugmappen, letzter bekannter Stand */
  peers?: SuchlagePeer[]
  /** Eigener Teil in Suchlage als fertig gemeldet (Abschluss) */
  doneAt?: number
  /** Hinweise zum Flugbuch, bis sie weggetippt werden */
  logbookNotices?: SuchlageLogbookNotice[]
  /** Flüge, deren Bestätigung Suchlage abgelehnt hat (409): hier kein Vorschlag mehr */
  takenFlightIds?: number[]
}

/** Vor SUL-114 hieß „gelöst“ noch „abgelöst“ (`replaced`). */
export function migrateLink(link: SuchlageLink | null): SuchlageLink | null {
  if (!link || (link.remoteState as string) !== 'replaced') return link
  return { ...link, remoteState: 'released' }
}

export function getSuchlageLink(missionId: string): SuchlageLink | null {
  return migrateLink(getMissionField<SuchlageLink | null>(missionId, LINK_KEY, null))
}

export function updateSuchlageLink(missionId: string, update: (link: SuchlageLink) => SuchlageLink): void {
  const stored = getMissionField<SuchlageLink | null>(missionId, LINK_KEY, null)
  const link = migrateLink(stored)
  if (!link || !stored) return
  const next = update(link)
  // Nur bei echter Änderung schreiben: sonst weckt jede Prüfung alle Abonnenten.
  if (JSON.stringify(next) === JSON.stringify(stored)) return
  setMissionField(missionId, LINK_KEY, next)
}

/** Die anderen, nicht gelösten Flugmappen und der eigene Abschluss aus einer Antwort von Suchlage. */
export function linkInfoFromMission(missionId: string, mission: FmMission): Pick<SuchlageLink, 'peers' | 'doneAt'> {
  const own = mission.links.find((l) => sameMissionId(l.flugmappe_mission_id, missionId))
  const peers = mission.links
    .filter((l) => l !== own && l.released_at_ms === null)
    .map((l) => ({ aircraftLabel: l.aircraft_label, linkedBy: l.linked_by, linkedAt: l.linked_at_ms, doneAt: l.done_at_ms }))
  return { peers, doneAt: own?.done_at_ms ?? undefined }
}

/** Andere Flugmappen und eigenen Abschluss aus einer Antwort von Suchlage übernehmen. */
export function applySuchlageMissionInfo(missionId: string, mission: FmMission): void {
  const info = linkInfoFromMission(missionId, mission)
  updateSuchlageLink(missionId, (l) => {
    const next = { ...l, peers: info.peers }
    if (info.doneAt !== undefined) next.doneAt = info.doneAt
    else delete next.doneAt
    return next
  })
}

/** Andere Flugmappen, die ihren Teil noch nicht abgeschlossen haben. */
export function openPeers(link: SuchlageLink | null): SuchlagePeer[] {
  return (link?.peers ?? []).filter((p) => p.doneAt === null)
}

/**
 * Zustand aus `GET /missions/{id}` (maßgeblich): 200 offen → `undefined`,
 * 200 abgeschlossen → `closed`, 404 → `gone`, 409 → `released`. So löst sich
 * „weg“ oder „gelöst“ auch wieder auf.
 */
export function setSuchlageRemoteState(missionId: string, state: SuchlageRemoteState | undefined): void {
  const before = getSuchlageLink(missionId)?.remoteState
  // Löst sich „weg“/„gelöst“ auf, gleich weitersenden (auch nachgelegte Abschnitte).
  if (before && before !== 'closed' && !state) queueMicrotask(kickSuchlageSync)
  updateSuchlageLink(missionId, (l) => {
    if (l.remoteState === state) return l
    const next = { ...l }
    if (state) next.remoteState = state
    else delete next.remoteState
    return next
  })
}

/** Hinweis aus einer anderen Antwort; „abgeschlossen“ überschreibt „weg“/„gelöst“ nicht. */
export function hintSuchlageRemoteState(missionId: string, hint: 'closed' | 'released'): void {
  updateSuchlageLink(missionId, (l) => {
    if (l.remoteState === hint) return l
    if (hint === 'closed' && l.remoteState) return l
    return { ...l, remoteState: hint }
  })
}

export function getSuchlageOutbox(missionId: string): OutboxItem[] {
  return getMissionField<OutboxItem[]>(missionId, OUTBOX_KEY, [])
}

export function setSuchlageOutbox(missionId: string, items: OutboxItem[]): void {
  setMissionField(missionId, OUTBOX_KEY, items)
}

export function getSuchlageLogbook(missionId: string): LogbookState | null {
  return getMissionField<LogbookState | null>(missionId, LOGBOOK_KEY, null)
}

export function setSuchlageLogbook(missionId: string, state: LogbookState): void {
  setMissionField(missionId, LOGBOOK_KEY, state)
}

/**
 * 409 auf eine Bestätigung: Hinweis merken (je Eintrag nur der neueste) und
 * den Flug nicht mehr vorschlagen – auch bevor Suchlage ihn als fremd bestätigt meldet.
 */
export function addSuchlageLogbookNotice(missionId: string, notice: SuchlageLogbookNotice, takenFlightId?: number): void {
  updateSuchlageLink(missionId, (l) => ({
    ...l,
    logbookNotices: [...(l.logbookNotices ?? []).filter((n) => n.entryId !== notice.entryId), notice],
    takenFlightIds: takenFlightId === undefined || l.takenFlightIds?.includes(takenFlightId)
      ? l.takenFlightIds
      : [...(l.takenFlightIds ?? []), takenFlightId],
  }))
}

export function dismissSuchlageLogbookNotice(missionId: string, entryId: string): void {
  updateSuchlageLink(missionId, (l) => ({
    ...l,
    logbookNotices: (l.logbookNotices ?? []).filter((n) => n.entryId !== entryId),
  }))
}

/* ── Anstoß für die Abarbeitung ──────────────────────────────── */

const kickListeners = new Set<() => void>()

export function onSuchlageSyncKick(listener: () => void): () => void {
  kickListeners.add(listener)
  return () => { kickListeners.delete(listener) }
}

export function kickSuchlageSync(): void {
  for (const l of kickListeners) l()
}

/**
 * Legt einen Eintrag in die Ausgangsliste, **nur** wenn der Einsatz verknüpft
 * ist, und stößt die Abarbeitung an. Gesendet wird erst, wenn Suchlage
 * konfiguriert und der Nutzer angemeldet ist und der Einsatz in Suchlage nicht
 * „weg“ oder „gelöst“ ist (dann wartet der Eintrag, statt verloren zu gehen).
 */
export function enqueueSuchlage(missionId: string, entry: NewOutboxItem): boolean {
  const link = getSuchlageLink(missionId)
  if (!link) return false
  const before = getSuchlageOutbox(missionId)
  const after = enqueue(before, entry, Date.now(), generateId())
  if (after !== before) setSuchlageOutbox(missionId, after)
  kickSuchlageSync()
  return true
}
