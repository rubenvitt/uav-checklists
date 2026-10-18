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
 * - 409 (andere Flugmappe hat übernommen) → bleibt, Hinweis „abgelöst“, Senden pausiert.
 * - `close` mit 422 (Flug läuft noch) → später erneut.
 * - Andere Ablehnungen (400, 404, 422 bei Abschnitt/Foto, 413 …) → Eintrag
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
  /** Dieser Einsatz pausiert (abgelöst), andere Einsätze laufen weiter. */
  | 'pause'

/** Zustand des Einsatzes in Suchlage, den eine Antwort verrät. */
export type RemoteHint = 'closed' | 'replaced'

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

  // 409 heißt bei allen schreibenden Aufrufen: eine andere Flugmappe hat den Einsatz
  // übernommen. Nichts verwerfen, sondern pausieren: Stellt GET /missions/{id} die
  // Bindung wieder fest, geht es weiter.
  if (kind === 'conflict') {
    return { items, effect: 'pause', remote: 'replaced' }
  }

  // Abschluss bei 422: es läuft noch ein Flug – später erneut.
  if (item.kind === 'close' && kind === 'unprocessable') {
    return retry(CLOSE_RETRY_MAX_MS)
  }

  // Endgültig abgelehnt: verwerfen, damit der Rest weiterläuft. Ein 404 ist nur ein
  // Hinweis; ob der Einsatz weg ist, entscheidet allein GET /missions/{id}.
  const remote: RemoteHint | undefined = kind === 'unprocessable' ? 'closed' : undefined
  return { items: without, effect: 'continue', removed: { item, sent: false }, remote }
}

export interface DrainOptions {
  read: () => OutboxItem[]
  write: (items: OutboxItem[]) => void
  send: (item: OutboxItem) => Promise<SendOutcome>
  now: () => number
  force?: boolean
  /** Rückmeldung je entferntem Eintrag (z. B. Abschnitt als angelegt merken). */
  onRemoved?: (removed: { item: OutboxItem; sent: boolean }, outcome: SendOutcome) => void
  onRemote?: (hint: RemoteHint) => void
  /** Abbruch zwischen zwei Einträgen (z. B. Watchdog abgelaufen) */
  shouldStop?: () => boolean
}

/** Arbeitet die Liste ab, bis sie leer ist, ein Eintrag warten muss oder alles ruht. */
export async function drainOutbox(opts: DrainOptions): Promise<{ rested: boolean; sent: number }> {
  let sent = 0
  // Schutz gegen Endlosschleifen, falls während der Runde ständig Neues kommt.
  let budget = opts.read().length + 10
  while (budget-- > 0) {
    if (opts.shouldStop?.()) break
    const item = nextDue(opts.read(), opts.now(), opts.force)
    if (!item) break
    const outcome = await opts.send(item)
    const applied = applyOutcome(opts.read(), item.id, outcome, opts.now())
    opts.write(applied.items)
    if (applied.removed) {
      if (applied.removed.sent) sent++
      opts.onRemoved?.(applied.removed, outcome)
    }
    if (applied.remote) opts.onRemote?.(applied.remote)
    if (applied.effect === 'rest') return { rested: true, sent }
    if (applied.effect === 'pause') break
    if (applied.effect === 'retry') break
  }
  return { rested: false, sent }
}

export interface HealSegment {
  id: string
  createdAt: number
  label: string
  locationName?: string
}

/**
 * Selbstheilung: Abschnitte, die nach dem Verknüpfen entstanden sind, in
 * Suchlage aber fehlen und für die nichts wartet (z. B. weil ein Eintrag
 * verloren ging). Ältere Abschnitte nicht – sonst würde ein alter Abschnitt
 * in Suchlage zum aktiven. Abschnitte mit Fehler (400) auch nicht, sonst
 * entstünde eine Schleife. Reihenfolge wie angelegt.
 */
export function sectionsToHeal(
  segments: readonly HealSegment[],
  link: { linkedAt: number; sections: Record<string, true>; sectionErrors?: Record<string, string> },
  items: readonly OutboxItem[],
): NewOutboxItem[] {
  const waiting = new Set(items.flatMap((i) => (i.kind === 'section' ? [i.segmentId] : [])))
  return segments
    .filter((s) => s.createdAt >= link.linkedAt && !link.sections[s.id] && !waiting.has(s.id) && !link.sectionErrors?.[s.id])
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((s) => ({ kind: 'section' as const, segmentId: s.id, label: s.label, location: s.locationName ?? null }))
}
