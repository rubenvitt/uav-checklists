/**
 * Ausgangsliste für schreibende Aufrufe an Suchlage (je Einsatz unter
 * `suchlage:outbox`). Reine Logik ohne Netz und ohne Speicher: das Senden und
 * Lesen/Schreiben reicht der Aufrufer herein (`useSuchlageSync`).
 *
 * Regeln:
 * - Reihenfolge bleibt: es wird immer nur der vorderste Eintrag gesendet.
 * - Erfolg → Eintrag entfernt.
 * - Netzfehler/Schnittstelle aus → Eintrag bleibt, Backoff, Abbruch der Runde.
 * - 401/403 → nichts ändern, alles ruht bis zur nächsten Anmeldung.
 * - `close` mit 409/422 (z. B. Flug läuft noch) → später erneut.
 * - Andere Ablehnungen (400, 404, 409/422 bei Abschnitt/Foto, 413 …) → Eintrag
 *   verworfen; er kann nie gelingen und darf die Liste nicht blockieren.
 */
import type { SuchlageErrorKind } from '../services/suchlageApi'

export type OutboxKind = 'section' | 'photo' | 'close'

interface OutboxBase {
  id: string
  kind: OutboxKind
  createdAt: number
  attempts: number
  /** Frühester nächster Versuch (ms); 0 = sofort. */
  notBefore: number
  /** Letzter Fehler zur Anzeige, z. B. „offline“. */
  lastError?: SuchlageErrorKind
}

/** Neuer Abschnitt nach einer Verlegung. Bezeichnung/Ort liest der Sender frisch. */
export interface OutboxSection extends OutboxBase {
  kind: 'section'
  segmentId: string
  label: string
  location: string | null
}

/** Kartenfoto eines Abschnitts; das Bild selbst liest der Sender aus dem Abschnitt. */
export interface OutboxPhoto extends OutboxBase {
  kind: 'photo'
  segmentId: string
}

export interface OutboxClose extends OutboxBase {
  kind: 'close'
}

export type OutboxItem = OutboxSection | OutboxPhoto | OutboxClose

export type NewOutboxItem =
  | { kind: 'section'; segmentId: string; label: string; location: string | null }
  | { kind: 'photo'; segmentId: string }
  | { kind: 'close' }

export type SendOutcome =
  | { ok: true }
  | { ok: false; kind: SuchlageErrorKind; status: number | null }

/** Was die Runde nach einem Eintrag tun soll. */
export type OutboxEffect =
  | 'continue'
  /** Später erneut (Backoff), Runde endet. */
  | 'retry'
  /** 401/403: alles ruht bis zur nächsten Anmeldung. */
  | 'rest'

/** Zustand des Einsatzes in Suchlage, den eine Antwort verrät. */
export type RemoteHint = 'closed' | 'gone'

export const BACKOFF_BASE_MS = 30_000
export const BACKOFF_MAX_MS = 10 * 60_000
/** Ein Abschluss wartet meist nur auf die Landung: nicht zu lange warten. */
export const CLOSE_RETRY_MAX_MS = 60_000

export function backoffMs(attempts: number, max = BACKOFF_MAX_MS): number {
  return Math.min(max, BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1))
}

/**
 * Fügt einen Eintrag hinzu – idempotent: je Abschnitt höchstens ein `section`
 * und ein `photo`, je Einsatz höchstens ein `close`. Ein neues Foto für einen
 * Abschnitt mit wartendem Foto setzt nur dessen Versuche zurück (das Bild wird
 * beim Senden frisch gelesen).
 */
export function enqueue(items: OutboxItem[], entry: NewOutboxItem, now: number, id: string): OutboxItem[] {
  const base = { id, createdAt: now, attempts: 0, notBefore: 0 }
  switch (entry.kind) {
    case 'section':
      if (items.some((i) => i.kind === 'section' && i.segmentId === entry.segmentId)) return items
      return [...items, { ...base, ...entry }]
    case 'photo': {
      const existing = items.findIndex((i) => i.kind === 'photo' && i.segmentId === entry.segmentId)
      if (existing >= 0) {
        return items.map((i, idx) => (idx === existing ? { ...i, attempts: 0, notBefore: 0, lastError: undefined } : i))
      }
      return [...items, { ...base, ...entry }]
    }
    case 'close':
      if (items.some((i) => i.kind === 'close')) return items
      return [...items, { ...base, kind: 'close' }]
  }
}

/** Der vorderste Eintrag, falls er jetzt dran ist; `force` ignoriert den Backoff. */
export function nextDue(items: OutboxItem[], now: number, force = false): OutboxItem | null {
  const first = items[0]
  if (!first) return null
  if (!force && first.notBefore > now) return null
  return first
}

export interface AppliedOutcome {
  items: OutboxItem[]
  effect: OutboxEffect
  /** Entfernt, weil gesendet (true) bzw. verworfen (false); `undefined` = bleibt. */
  removed?: { item: OutboxItem; sent: boolean }
  remote?: RemoteHint
}

/** Ergebnis eines Sendeversuchs auf die (frisch gelesene) Liste anwenden. */
export function applyOutcome(items: OutboxItem[], id: string, outcome: SendOutcome, now: number): AppliedOutcome {
  const item = items.find((i) => i.id === id)
  if (!item) return { items, effect: 'continue' }
  const without = items.filter((i) => i.id !== id)

  if (outcome.ok) {
    return {
      items: without,
      effect: 'continue',
      removed: { item, sent: true },
      remote: item.kind === 'close' ? 'closed' : undefined,
    }
  }

  const { kind, status } = outcome
  if (kind === 'unauthorized' || kind === 'forbidden') {
    return { items, effect: 'rest' }
  }

  const retry = (max?: number): AppliedOutcome => {
    const attempts = item.attempts + 1
    return {
      items: items.map((i) => (i.id === id ? { ...i, attempts, notBefore: now + backoffMs(attempts, max), lastError: kind } : i)),
      effect: 'retry',
    }
  }

  if (kind === 'offline' || kind === 'unavailable') return retry()
  // 5xx ohne eigene Klasse: vorübergehend behandeln.
  if (status !== null && status >= 500) return retry()

  if (item.kind === 'close' && (kind === 'conflict' || kind === 'unprocessable')) {
    return retry(CLOSE_RETRY_MAX_MS)
  }

  // Endgültig abgelehnt: verwerfen, damit der Rest weiterläuft.
  let remote: RemoteHint | undefined
  if (status === 404 && item.kind !== 'photo') remote = 'gone'
  if (kind === 'unprocessable' && item.kind === 'section') remote = 'closed'
  return { items: without, effect: 'continue', removed: { item, sent: false }, remote }
}

export interface DrainOptions {
  read: () => OutboxItem[]
  write: (items: OutboxItem[]) => void
  send: (item: OutboxItem) => Promise<SendOutcome>
  now: () => number
  force?: boolean
  /** Rückmeldung je entferntem Eintrag (z. B. Abschnitt als angelegt merken). */
  onRemoved?: (removed: { item: OutboxItem; sent: boolean }) => void
  onRemote?: (hint: RemoteHint) => void
}

/** Arbeitet die Liste ab, bis sie leer ist, ein Eintrag warten muss oder alles ruht. */
export async function drainOutbox(opts: DrainOptions): Promise<{ rested: boolean; sent: number }> {
  let sent = 0
  // Schutz gegen Endlosschleifen, falls während der Runde ständig Neues kommt.
  let budget = opts.read().length + 10
  while (budget-- > 0) {
    const item = nextDue(opts.read(), opts.now(), opts.force)
    if (!item) break
    const outcome = await opts.send(item)
    const applied = applyOutcome(opts.read(), item.id, outcome, opts.now())
    opts.write(applied.items)
    if (applied.removed) {
      if (applied.removed.sent) sent++
      opts.onRemoved?.(applied.removed)
    }
    if (applied.remote) opts.onRemote?.(applied.remote)
    if (applied.effect === 'rest') return { rested: true, sent }
    if (applied.effect === 'retry') break
  }
  return { rested: false, sent }
}
