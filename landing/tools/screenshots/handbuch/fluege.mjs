/**
 * Aufnahmen für Kapitel 08 „Flüge" (handbuch/08-fluege.md).
 *
 *   node tools/screenshots/handbuch.mjs fluege
 */

/** Liest/schreibt ein Formularfeld im Seed (Schlüssel wie seed.mjs). */
function field(storage, mid, key) {
  const k = `uav-form:${mid}:${key}`
  return {
    get: () => (storage[k] ? JSON.parse(storage[k]).value : undefined),
    set: (value) => {
      storage[k] = JSON.stringify({ value, timestamp: Date.now() })
    },
  }
}

export default async function ({ makeContext, go, shot, crop, scrollTo, seed }) {
  const { MID, SEG } = seed
  const now = Date.now()
  const iso = (minsAgo) => new Date(now - minsAgo * 60e3).toISOString()

  /** Grundstand: Seed mit montierter Wärmebildkamera und einer auffälligen Landung. */
  function baseStorage() {
    const s = seed.buildStorage(now)
    field(s, MID, 'selectedPayloads').set(['zenmuse-h30t'])
    const entries = field(s, MID, 'flightlog:entries')
    entries.set(
      entries.get().map((e) => ({
        ...e,
        payloads: ['zenmuse-h30t'],
        ...(e.id === 'f2'
          ? { landungStatus: 'auffaellig', bemerkung: 'Detailaufnahmen Sickerstelle km 5,1 — harte Landung durch Böe, Sichtprüfung ohne Befund' }
          : {}),
      })),
    )
    // Weiter-Knopf zur Nachbereitung soll nicht schon „abgeschlossen" sein
    field(s, MID, 'fluegeAbgeschlossen').set(false)
    return s
  }

  // ── 1. Laufender Flug ────────────────────────────────────
  {
    const s = baseStorage()
    const entries = field(s, MID, 'flightlog:entries')
    entries.set([
      ...entries.get(),
      { id: 'f4', blockOff: iso(6), blockOn: null, fernpilot: 'J. Hansen', lrb: 'T. Meier', landungStatus: 'ok', bemerkung: '', segmentId: SEG, payloads: ['zenmuse-h30t'] },
    ])
    const ctx = await makeContext({ storage: s })
    const page = await ctx.newPage()
    await go(page, `/mission/${MID}/fluege`, 3500)
    await scrollTo(page, 'Flug aktiv', 110)
    await shot(page, 'fluege-flug-aktiv')
    await ctx.close()
  }

  // ── 2. Zwischen den Flügen ───────────────────────────────
  {
    const ctx = await makeContext({ storage: baseStorage(), reseed: 'once' })
    const page = await ctx.newPage()
    await go(page, `/mission/${MID}/fluege`, 3500)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)
    await shot(page, 'fluege-start')

    // Nutzlast wechseln
    await page.getByText('Wechseln', { exact: true }).first().click()
    await page.waitForTimeout(600)
    await crop(page, page.locator('div.overflow-hidden', { hasText: 'Montierte Nutzlast' }).first(), 'fluege-nutzlast')
    await page.getByText('Fertig', { exact: true }).first().click()
    await page.waitForTimeout(400)

    // Flugtagebuch zugeklappt
    const logbook = page.locator('section', { hasText: 'Flugtagebuch' }).first()
    await crop(page, logbook, 'fluege-flugtagebuch')

    // Flug 02 aufklappen → Landungsstatus
    await logbook.locator('button', { hasText: 'L. Petersen' }).first().click()
    await page.waitForTimeout(600)
    await crop(page, logbook, 'fluege-landungsstatus')
    await logbook.locator('button', { hasText: 'L. Petersen' }).first().click()
    await page.waitForTimeout(400)

    // Ereignis erfassen
    await page.locator('button', { hasText: 'Ereignis' }).first().click()
    await page.waitForTimeout(500)
    await page.locator('textarea').first().fill('Zweite Sickerstelle bei km 6,3 entdeckt — Foto an EL übermittelt, Deichverband informiert.')
    await page.waitForTimeout(300)
    await crop(page, page.locator('section', { hasText: 'Ereignisse' }).first(), 'fluege-ereignis')
    // Fokus lösen, damit das Ereignis gespeichert und geschlossen wird
    await page.locator('[title="Fertig"]').first().dispatchEvent('mousedown').catch(() => {})
    await page.waitForTimeout(400)

    // Verlegen-Dialog
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.locator('button', { hasText: 'Verlegen' }).first().click()
    await page.waitForTimeout(700)
    await shot(page, 'fluege-verlegen')
    await page.getByText('Abbrechen', { exact: true }).first().click()
    await page.waitForTimeout(400)

    // Prozeduren: C4.2 aufgeklappt
    await page.locator('button', { hasText: 'Prozeduren' }).first().click()
    await page.waitForTimeout(1500)
    const c42 = page.locator('[data-procedure-id="C4.2"] button').first()
    await c42.click()
    await page.waitForTimeout(600)
    await page.locator('[data-procedure-id="C4.2"]').first().evaluate((el) => el.scrollIntoView({ block: 'start' }))
    await page.waitForTimeout(700)
    await shot(page, 'fluege-prozedur')
    await ctx.close()
  }

  // ── 3. Notfall-Ansicht (SOS) ─────────────────────────────
  {
    const ctx = await makeContext({ storage: baseStorage() })
    const page = await ctx.newPage()
    await go(page, `/mission/${MID}/fluege`, 3000)
    await page.locator('[title="Notfall-Prozeduren"]').first().click()
    await page.waitForTimeout(1200)
    await shot(page, 'fluege-notfall')
    await ctx.close()
  }

  // ── 4. Zweiter Standort nach dem Verlegen ────────────────
  {
    const SEG_B = 'cccccccc-dddd-4eee-8fff-000000000000'
    const s = baseStorage()
    const missions = JSON.parse(s['uav-missions'])
    const m = missions.find((x) => x.id === MID)
    m.segments = [
      { ...m.segments[0], status: 'completed' },
      { id: SEG_B, createdAt: now - 12 * 60e3, label: 'Standort 2', locationName: 'Hannover-Leinhausen', status: 'active' },
    ]
    m.activeSegmentId = SEG_B
    s['uav-missions'] = JSON.stringify(missions)
    const loc = { latitude: 52.3962, longitude: 9.6851, name: 'Leineaue, Hannover-Leinhausen' }
    s[`uav-manual-location:${MID}:seg:${SEG_B}`] = JSON.stringify(loc)
    const freigabe = iso(8)
    field(s, MID, `seg:${SEG_B}:flugfreigabe`).set(freigabe)
    field(s, MID, `seg:${SEG_B}:flugentscheidung`).set({ status: 'granted', timestamp: freigabe })
    // Verkehr am neuen Standort schon gemeldet — kein Banner im Bild
    field(s, MID, `seg:${SEG_B}:traffic:monitor`).set({
      lastProcessedAt: iso(1),
      tracked: Object.fromEntries(['3c4dc4', '3c6589', '3dd2a1'].map((hex) => [hex, { lastSeen: iso(1), alertedStatus: 'warning' }])),
    })
    const entries = field(s, MID, 'flightlog:entries')
    entries.set([
      ...entries.get().filter((e) => e.id !== 'f3'),
      { id: 'f3', blockOff: iso(6), blockOn: iso(1), fernpilot: 'R. Vitt', lrb: 'T. Meier', landungStatus: 'ok', bemerkung: 'Übersicht Leineaue', segmentId: SEG_B, payloads: ['zenmuse-h30t'] },
    ])
    const ctx = await makeContext({ storage: s })
    const page = await ctx.newPage()
    await go(page, `/mission/${MID}/fluege`, 3500)
    await page.getByText('von 2', { exact: false }).first().click().catch(() => {})
    await page.waitForTimeout(600)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    await shot(page, 'fluege-standort-2')
    await crop(page, page.locator('section', { hasText: 'Flugtagebuch' }).first(), 'fluege-standorte-flugtagebuch')
    await ctx.close()
  }
}
