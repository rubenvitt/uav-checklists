import { describe, expect, it } from 'vitest'
import {
  BACKOFF_BASE_MS,
  applyOutcome,
  drainOutbox,
  enqueue,
  nextDue,
  MAX_DEFERS,
  sectionErrorText,
  healOutbox,
  sectionsToHeal,
  type OutboxItem,
  type SendOutcome,
} from './suchlageOutbox'

const T0 = 1_000_000

function build(...entries: Parameters<typeof enqueue>[1][]): OutboxItem[] {
  let items: OutboxItem[] = []
  entries.forEach((e, i) => { items = enqueue(items, e, T0 + i, `id${i}`) })
  return items
}

function harness(initial: OutboxItem[], outcomes: SendOutcome[]) {
  let items = initial
  let now = T0
  const sentKinds: string[] = []
  const removed: Array<{ kind: string; sent: boolean }> = []
  const remotes: string[] = []
  return {
    get items() { return items },
    sentKinds,
    removed,
    remotes,
    advance(ms: number) { now += ms },
    run(force = false) {
      return drainOutbox({
        read: () => items,
        write: (next) => { items = next },
        send: async (item) => {
          sentKinds.push(item.kind)
          return outcomes.shift() ?? { ok: true }
        },
        now: () => now,
        force,
        onRemoved: (r) => removed.push({ kind: r.item.kind, sent: r.sent }),
        onRemote: (h) => remotes.push(h),
      })
    },
  }
}

const offline: SendOutcome = { ok: false, kind: 'offline', status: null }

describe('enqueue', () => {
  it('behält die Reihenfolge', () => {
    const items = build(
      { kind: 'section', segmentId: 's2', label: 'Standort 2', location: null },
      { kind: 'photo', segmentId: 's2' },
      { kind: 'close' },
    )
    expect(items.map((i) => i.kind)).toEqual(['section', 'photo', 'close'])
  })

  it('ist idempotent je Abschnitt und Abschluss', () => {
    let items = build({ kind: 'section', segmentId: 's2', label: 'A', location: null }, { kind: 'close' })
    const before = items
    items = enqueue(items, { kind: 'section', segmentId: 's2', label: 'B', location: null }, T0, 'x')
    items = enqueue(items, { kind: 'close' }, T0, 'y')
    expect(items).toBe(before)
  })

  it('ein neues Foto ersetzt kein zweites, setzt aber den Backoff zurück', () => {
    let items = build({ kind: 'photo', segmentId: 's1' })
    items = items.map((i) => ({ ...i, attempts: 3, notBefore: T0 + 99_999, lastError: 'offline' as const }))
    items = enqueue(items, { kind: 'photo', segmentId: 's1' }, T0, 'neu')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'id0', attempts: 0, notBefore: 0, lastError: undefined })
  })
  it('eine Ortsänderung je Abschnitt; eine neue bekommt eine neue ID', () => {
    let items = build(
      { kind: 'section', segmentId: 's2', label: 'Standort 2', location: null },
      { kind: 'sectionUpdate', segmentId: 's2' },
      { kind: 'sectionUpdate', segmentId: 's3' },
    )
    expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual(['section:id0', 'sectionUpdate:id1', 'sectionUpdate:id2'])
    items = items.map((i) => (i.id === 'id1' ? { ...i, attempts: 2, notBefore: T0 + 99_999, lastError: 'offline' as const } : i))
    items = enqueue(items, { kind: 'sectionUpdate', segmentId: 's2' }, T0, 'neu')
    expect(items).toHaveLength(3)
    expect(items[1]).toMatchObject({ kind: 'sectionUpdate', id: 'neu', attempts: 0, notBefore: 0, lastError: undefined })
  })

  it('eine Ortsänderung während des Sendens geht noch einmal hinaus', async () => {
    let items = build({ kind: 'sectionUpdate', segmentId: 's2' })
    let sends = 0
    await drainOutbox({
      read: () => items,
      write: (next) => { items = next },
      send: async () => {
        // Der Truppführer ändert den Ort, während der erste Stand unterwegs ist.
        if (sends++ === 0) items = enqueue(items, { kind: 'sectionUpdate', segmentId: 's2' }, T0, 'neu')
        return { ok: true }
      },
      now: () => T0,
    })
    expect(sends).toBe(2)
    expect(items).toEqual([])
  })
})

describe('nextDue', () => {
  it('liefert nur den vordersten und beachtet den Backoff', () => {
    const items = build({ kind: 'photo', segmentId: 's1' }, { kind: 'close' })
    expect(nextDue(items, T0)?.kind).toBe('photo')
    const waiting = [{ ...items[0], notBefore: T0 + 10 }, items[1]]
    expect(nextDue(waiting, T0)).toBeNull()
    expect(nextDue(waiting, T0, true)?.kind).toBe('photo')
    expect(nextDue([], T0)).toBeNull()
  })
})

describe('applyOutcome', () => {
  const items = build({ kind: 'section', segmentId: 's2', label: 'S', location: null }, { kind: 'close' })

  it('entfernt nach Erfolg; Abschluss meldet closed', () => {
    const a = applyOutcome(items, 'id0', { ok: true }, T0)
    expect(a.items.map((i) => i.id)).toEqual(['id1'])
    expect(a.removed).toEqual({ item: items[0], sent: true })
    const b = applyOutcome(a.items, 'id1', { ok: true }, T0)
    expect(b.items).toEqual([])
    expect(b.remote).toBe('closed')
  })

  it('Netzfehler: bleibt mit wachsendem Backoff', () => {
    const a = applyOutcome(items, 'id0', offline, T0)
    expect(a.effect).toBe('retry')
    expect(a.items[0]).toMatchObject({ attempts: 1, notBefore: T0 + BACKOFF_BASE_MS, lastError: 'offline' })
    const b = applyOutcome(a.items, 'id0', offline, T0)
    expect(b.items[0].notBefore).toBe(T0 + 2 * BACKOFF_BASE_MS)
  })

  it('401/403: nichts ändern, ruhen', () => {
    for (const kind of ['unauthorized', 'forbidden'] as const) {
      const a = applyOutcome(items, 'id0', { ok: false, kind, status: kind === 'unauthorized' ? 401 : 403 }, T0)
      expect(a.effect).toBe('rest')
      expect(a.items).toBe(items)
    }
  })

  it('Abschluss bei 422 (Flug läuft): später erneut', () => {
    const close = build({ kind: 'close' })
    const a = applyOutcome(close, 'id0', { ok: false, kind: 'unprocessable', status: 422 }, T0)
    expect(a.effect).toBe('retry')
    expect(a.items).toHaveLength(1)
  })

  it('409 bei jeder Art: bleibt, Hinweis abgelöst, pausiert', () => {
    const all = build({ kind: 'section', segmentId: 's2', label: 'S', location: null }, { kind: 'photo', segmentId: 's2' }, { kind: 'close' })
    for (const id of ['id0', 'id1', 'id2']) {
      const a = applyOutcome(all, id, { ok: false, kind: 'conflict', status: 409 }, T0)
      expect(a.items).toBe(all)
      expect(a.effect).toBe('pause')
      expect(a.remote).toBe('replaced')
    }
  })

  it('Abschnitt bei 422 wird verworfen und meldet einen abgeschlossenen Einsatz', () => {
    const a = applyOutcome(items, 'id0', { ok: false, kind: 'unprocessable', status: 422 }, T0)
    expect(a.effect).toBe('continue')
    expect(a.items.map((i) => i.id)).toEqual(['id1'])
    expect(a.removed?.sent).toBe(false)
    expect(a.remote).toBe('closed')
  })

  it('404 verwirft den Eintrag, erklärt den Einsatz aber nicht für weg', () => {
    const a = applyOutcome(items, 'id1', { ok: false, kind: 'other', status: 404 }, T0)
    expect(a.remote).toBeUndefined()
    expect(a.items.map((i) => i.id)).toEqual(['id0'])
  })

  it('unbekannte ID ändert nichts', () => {
    expect(applyOutcome(items, 'nope', { ok: true }, T0).items).toBe(items)
  })
})

describe('drainOutbox', () => {
  it('sendet in Reihenfolge und entfernt nach Erfolg', async () => {
    const h = harness(build(
      { kind: 'section', segmentId: 's2', label: 'S', location: null },
      { kind: 'photo', segmentId: 's2' },
      { kind: 'close' },
    ), [])
    const r = await h.run()
    expect(h.sentKinds).toEqual(['section', 'photo', 'close'])
    expect(h.items).toEqual([])
    expect(r).toEqual({ rested: false, sent: 3 })
    expect(h.remotes).toEqual(['closed'])
  })

  it('holt nach einem Netzfehler nach, ohne die Reihenfolge zu ändern', async () => {
    const h = harness(build({ kind: 'photo', segmentId: 's1' }, { kind: 'close' }), [offline])
    await h.run()
    expect(h.sentKinds).toEqual(['photo'])
    expect(h.items.map((i) => i.kind)).toEqual(['photo', 'close'])

    // Vor Ablauf des Backoffs passiert nichts …
    await h.run()
    expect(h.sentKinds).toEqual(['photo'])
    // … danach geht alles raus.
    h.advance(BACKOFF_BASE_MS)
    await h.run()
    expect(h.sentKinds).toEqual(['photo', 'photo', 'close'])
    expect(h.items).toEqual([])
  })

  it('holt einen Abschluss nach, sobald der Flug gelandet ist', async () => {
    const h = harness(build({ kind: 'close' }), [{ ok: false, kind: 'unprocessable', status: 422 }])
    await h.run()
    expect(h.items).toHaveLength(1)
    await h.run(true)
    expect(h.items).toEqual([])
    expect(h.remotes).toEqual(['closed'])
  })

  it('ruht bei 401/403 und lässt alles stehen', async () => {
    const initial = build({ kind: 'photo', segmentId: 's1' }, { kind: 'close' })
    const h = harness(initial, [{ ok: false, kind: 'forbidden', status: 403 }])
    const r = await h.run()
    expect(r.rested).toBe(true)
    expect(h.items).toBe(initial)
    expect(h.sentKinds).toEqual(['photo'])
  })

  it('verwirft Unmögliches und macht weiter', async () => {
    const h = harness(build({ kind: 'photo', segmentId: 's1' }, { kind: 'close' }), [{ ok: false, kind: 'other', status: 413 }])
    await h.run()
    expect(h.sentKinds).toEqual(['photo', 'close'])
    expect(h.removed).toEqual([{ kind: 'photo', sent: false }, { kind: 'close', sent: true }])
  })

  it('hört nach einem 409 auf und behält alles (abgelöst)', async () => {
    const h = harness(build({ kind: 'photo', segmentId: 's1' }, { kind: 'close' }), [{ ok: false, kind: 'conflict', status: 409 }])
    await h.run()
    expect(h.sentKinds).toEqual(['photo'])
    expect(h.remotes).toEqual(['replaced'])
    expect(h.items.map((i) => i.kind)).toEqual(['photo', 'close'])
  })

  it('hört zwischen zwei Einträgen auf, wenn abgebrochen wird', async () => {
    let items = build({ kind: 'photo', segmentId: 's1' }, { kind: 'close' })
    let stop = false
    const sent: string[] = []
    await drainOutbox({
      read: () => items,
      write: (n) => { items = n },
      send: async (i) => { sent.push(i.kind); stop = true; return { ok: true } },
      now: () => T0,
      shouldStop: () => stop,
    })
    expect(sent).toEqual(['photo'])
    expect(items.map((i) => i.kind)).toEqual(['close'])
  })

  it('ein zweiter Durchlauf mit leerer Liste sendet nichts', async () => {
    const h = harness([], [])
    expect(await h.run()).toEqual({ rested: false, sent: 0 })
    expect(h.sentKinds).toEqual([])
  })
})

describe('sectionsToHeal / healOutbox', () => {
  const link = { linkedAt: 1000, sections: { s1: true as const } }
  const segs = [
    { id: 's0', createdAt: 500, label: 'Vorher' },
    { id: 's1', createdAt: 900, label: 'Standort 1' },
    { id: 's3', createdAt: 3000, label: 'Standort 3', locationName: 'Deich' },
    { id: 's2', createdAt: 2000, label: 'Standort 2' },
  ]
  let n = 0
  const newId = () => `h${n++}`

  it('legt fehlende Abschnitte nach dem Verknüpfen nach, in Reihenfolge', () => {
    expect(sectionsToHeal(segs, link, [])).toEqual([
      { kind: 'section', segmentId: 's2', label: 'Standort 2', location: null },
      { kind: 'section', segmentId: 's3', label: 'Standort 3', location: 'Deich' },
    ])
  })

  it('nicht, wenn schon einer wartet oder der Abschnitt einen Fehler hat', () => {
    const items = build({ kind: 'section', segmentId: 's2', label: 'x', location: null })
    expect(sectionsToHeal(segs, { ...link, sectionErrors: { s3: 'abgelehnt' } }, items)).toEqual([])
  })

  it('nie älter als der neueste in Suchlage bekannte Abschnitt', () => {
    // s3 ist schon in Suchlage, s2 fehlt: s2 würde dort sonst zum aktiven.
    expect(sectionsToHeal(segs, { linkedAt: 1000, sections: { s1: true, s3: true } }, [])).toEqual([])
  })

  it('setzt den geheilten Abschnitt vor das wartende Foto desselben Abschnitts und vor den Abschluss', () => {
    const items = build({ kind: 'photo', segmentId: 's1' }, { kind: 'photo', segmentId: 's3' }, { kind: 'close' })
    const healed = healOutbox(segs, link, items, T0, newId)
    expect(healed.map((i) => `${i.kind}:${'segmentId' in i ? i.segmentId : ''}`)).toEqual([
      'photo:s1', 'section:s2', 'section:s3', 'photo:s3', 'close:',
    ])
  })

  it('setzt den geheilten Abschnitt vor die wartende Ortsänderung desselben Abschnitts', () => {
    const items = build({ kind: 'sectionUpdate', segmentId: 's1' }, { kind: 'sectionUpdate', segmentId: 's3' })
    const healed = healOutbox(segs, link, items, T0, newId)
    expect(healed.map((i) => `${i.kind}:${'segmentId' in i ? i.segmentId : ''}`)).toEqual([
      'sectionUpdate:s1', 'section:s2', 'section:s3', 'sectionUpdate:s3',
    ])
  })

  it('vor einen wartenden Abschnitt eines neueren Segments', () => {
    const items = build({ kind: 'section', segmentId: 's3', label: 'S3', location: null })
    const healed = healOutbox(segs, link, items, T0, newId)
    expect(healed.map((i) => (i.kind === 'section' ? i.segmentId : i.kind))).toEqual(['s2', 's3'])
  })

  it('ohne etwas zu heilen dieselbe Liste', () => {
    const items = build({ kind: 'close' })
    expect(healOutbox(segs, { linkedAt: 1000, sections: { s1: true, s2: true, s3: true } }, items, T0, newId)).toBe(items)
  })
})

describe('Foto zurückstellen', () => {
  it('ein zurückgestelltes Foto rückt vor den Abschluss, der Rest läuft weiter', () => {
    const items = build({ kind: 'photo', segmentId: 's2' }, { kind: 'photo', segmentId: 's1' }, { kind: 'close' })
    const a = applyOutcome(items, 'id0', { ok: false, kind: 'other', status: 404, defer: true }, T0)
    expect(a.effect).toBe('continue')
    expect(a.removed).toBeUndefined()
    expect(a.items.map((i) => i.id)).toEqual(['id1', 'id0', 'id2'])
    expect(a.items[1]).toMatchObject({ attempts: 1, notBefore: T0 + BACKOFF_BASE_MS })
  })

  it('kommt in derselben Runde nicht wieder dran, auch mit force', async () => {
    const deferOutcome: SendOutcome = { ok: false, kind: 'other', status: 404, defer: true }
    const h = harness(build({ kind: 'photo', segmentId: 's2' }, { kind: 'close' }), [deferOutcome, deferOutcome])
    await h.run(true)
    expect(h.sentKinds).toEqual(['photo'])
    expect(h.items.map((i) => [i.kind, i.attempts])).toEqual([['photo', 1], ['close', 0]])
  })

  it('eine Ortsänderung wird wie ein Foto zurückgestellt und bei 422 verworfen', () => {
    const items = build({ kind: 'sectionUpdate', segmentId: 's2' }, { kind: 'close' })
    const deferred = applyOutcome(items, 'id0', { ok: false, kind: 'other', status: 404, defer: true }, T0)
    expect(deferred.items.map((i) => i.kind)).toEqual(['sectionUpdate', 'close'])
    expect(deferred.removed).toBeUndefined()
    const closed = applyOutcome(items, 'id0', { ok: false, kind: 'unprocessable', status: 422 }, T0)
    expect(closed.items.map((i) => i.kind)).toEqual(['close'])
    expect(closed.remote).toBe('closed')
  })

  it('nach zu vielen Zurückstellungen verworfen', () => {
    const items = build({ kind: 'photo', segmentId: 's2' }).map((i) => ({ ...i, attempts: MAX_DEFERS }))
    const a = applyOutcome(items, 'id0', { ok: false, kind: 'other', status: 404, defer: true }, T0)
    expect(a.items).toEqual([])
    expect(a.removed?.sent).toBe(false)
  })
})

describe('sectionErrorText', () => {
  it('nur ein 400 ergibt eine dauerhafte Meldung', () => {
    expect(sectionErrorText({ ok: false, kind: 'other', status: 400 })).toMatch(/abgelehnt/)
    expect(sectionErrorText({ ok: false, kind: 'other', status: 404 })).toBeNull()
    expect(sectionErrorText({ ok: false, kind: 'unprocessable', status: 422 })).toBeNull()
    expect(sectionErrorText({ ok: true })).toBeNull()
  })
})
