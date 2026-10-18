/**
 * Verknüpfung und Ausgangsliste eines Einsatzes mit Suchlage, gespeichert wie
 * alle Formulardaten im Einsatzspeicher (`uav-form:<missionId>:suchlage:*`).
 * Ohne Verknüpfung steht dort nichts.
 */
import { getMissionField, setMissionField } from '../stores/missionFormStore'
import { generateId } from './missionStorage'
import { enqueue, type NewOutboxItem, type OutboxItem } from './suchlageOutbox'

export const LINK_KEY = 'suchlage:link'
export const OUTBOX_KEY = 'suchlage:outbox'

/** Zustand des verknüpften Einsatzes in Suchlage, soweit die Flugmappe ihn kennt. */
export type SuchlageRemoteState =
  | 'closed'
  /** gelöscht oder nicht mehr auffindbar (404) */
  | 'gone'
  /** in Suchlage mit einer anderen Flugmappe verknüpft (409 Bindung) */
  | 'replaced'

export interface SuchlageLink {
  suchlageMissionId: number
  missionName: string
  linkedAt: number
  /** Abschnitte (Segment-IDs), die in Suchlage angelegt sind */
  sections: Record<string, true>
  remoteState?: SuchlageRemoteState
  /** Ergebnis von „Kartenelemente übernehmen“ beim Verknüpfen */
  mapImport?: 'ok' | 'failed'
}

export function getSuchlageLink(missionId: string): SuchlageLink | null {
  return getMissionField<SuchlageLink | null>(missionId, LINK_KEY, null)
}

export function updateSuchlageLink(missionId: string, update: (link: SuchlageLink) => SuchlageLink): void {
  const link = getSuchlageLink(missionId)
  if (!link) return
  setMissionField(missionId, LINK_KEY, update(link))
}

/**
 * Zustand aus `GET /missions/{id}` (maßgeblich): 200 offen → `undefined`,
 * 200 abgeschlossen → `closed`, 404 → `gone`, 409 → `replaced`. So löst sich
 * „weg“ oder „abgelöst“ auch wieder auf.
 */
export function setSuchlageRemoteState(missionId: string, state: SuchlageRemoteState | undefined): void {
  updateSuchlageLink(missionId, (l) => {
    if (l.remoteState === state) return l
    const next = { ...l }
    if (state) next.remoteState = state
    else delete next.remoteState
    return next
  })
}

/** Hinweis aus einer anderen Antwort; „abgeschlossen“ überschreibt „weg“/„abgelöst“ nicht. */
export function hintSuchlageRemoteState(missionId: string, hint: 'closed' | 'replaced'): void {
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
 * konfiguriert und der Nutzer angemeldet ist.
 */
export function enqueueSuchlage(missionId: string, entry: NewOutboxItem): boolean {
  const link = getSuchlageLink(missionId)
  if (!link || link.remoteState === 'gone' || link.remoteState === 'replaced') return false
  const before = getSuchlageOutbox(missionId)
  const after = enqueue(before, entry, Date.now(), generateId())
  if (after !== before) setSuchlageOutbox(missionId, after)
  kickSuchlageSync()
  return true
}
