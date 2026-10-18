/**
 * Aufnahmen für Kapitel 06 „SORA-Risikoklassifizierung“.
 *
 * Jede Aufnahme bekommt einen eigenen SORA-Stand (GRC-/ARC-Antworten im
 * Abschnitt des Beispiel-Einsatzes), damit die Bilder die Beispiele im Text
 * zeigen: Brand im Wohngebiet (GRC 3), Deich auf dem Land (ARC-a),
 * Flugplatznähe ohne Absprache (ARC-c/d) usw.
 */

const SORA_KEYS = [
  'grc:controlledGround', 'grc:flightType', 'grc:areaType', 'grc:strategicMitigation', 'grc:emergencyPlan',
  'arc:reservedAirspace', 'arc:riskFlight', 'arc:nearAirfield', 'arc:under150m', 'arc:uncontrolledAirspace',
  'arc:areaType', 'arc:adsbMonitoring', 'arc:coordination',
]

/** Brand im Wohngebiet: VLOS, dicht besiedelt, Notfallplan (GRC 3) + städtisch (ARC-b) → SAIL II */
const SAIL2 = {
  'grc:controlledGround': false,
  'grc:flightType': 'vlos',
  'grc:areaType': 'dense',
  'grc:emergencyPlan': true,
  'arc:reservedAirspace': false,
  'arc:nearAirfield': 'no',
  'arc:under150m': true,
  'arc:uncontrolledAirspace': true,
  'arc:areaType': 'urban',
}

export default async function ({ makeContext, go, shot, crop, expand, scrollTo, seed }) {
  const { buildStorage, MID, SEG } = seed

  /** Beispiel-Einsatz mit eigenen SORA-Antworten (nicht genannte Fragen bleiben offen). */
  function storageWith(answers) {
    const now = Date.now()
    const s = buildStorage(now)
    for (const k of SORA_KEYS) delete s[`uav-form:${MID}:seg:${SEG}:${k}`]
    for (const [k, v] of Object.entries(answers)) {
      s[`uav-form:${MID}:seg:${SEG}:${k}`] = JSON.stringify({ value: v, timestamp: now })
    }
    return s
  }

  /** Kopfleiste und Phasenleiste nicht mitscrollen lassen, damit sie Ausschnitte nicht überdecken. */
  const unstick = (page) => page.addStyleTag({ content: '.sticky { position: static !important; }' })

  async function openSora(answers, { forCrop = true } = {}) {
    const ctx = await makeContext({ storage: storageWith(answers) })
    const page = await ctx.newPage()
    await go(page, `/mission/${MID}/vorflugkontrolle`, 3500)
    if (forCrop) await unstick(page)
    await expand(page, 'SORA Risikoklassifizierung')
    // expand() schaltet nur um: Hatte die App den Abschnitt schon geöffnet,
    // ist er jetzt zu — dann noch einmal tippen.
    if (!(await page.locator('h3', { hasText: 'Ground Risk Class (GRC)' }).first().isVisible().catch(() => false))) {
      await expand(page, 'SORA Risikoklassifizierung')
    }
    return { ctx, page }
  }

  /** Block unter einer Zwischenüberschrift (GRC, ARC, SAIL) der Risikoklassifizierung. */
  const block = (page, title) => page.locator('h3', { hasText: title }).first().locator('xpath=../..')

  // 1) GRC: Brand im Wohngebiet — VLOS, dicht besiedelt, Notfallplan → 4 − 1 = 3
  {
    const { ctx, page } = await openSora({
      'grc:controlledGround': false,
      'grc:flightType': 'vlos',
      'grc:areaType': 'dense',
      'grc:strategicMitigation': false,
      'grc:emergencyPlan': true,
    })
    await crop(page, block(page, 'Ground Risk Class (GRC)'), 'vorflug-sora-grc')
    await ctx.close()
  }

  // 2) ARC: Deich auf dem Land — unter 150 m, unkontrolliert, ländlich → ARC-a
  {
    const { ctx, page } = await openSora({
      'arc:reservedAirspace': false,
      'arc:nearAirfield': 'no',
      'arc:under150m': true,
      'arc:uncontrolledAirspace': true,
      'arc:areaType': 'rural',
      'arc:adsbMonitoring': true,
      'arc:coordination': false,
    })
    await crop(page, block(page, 'Air Risk Class (ARC)'), 'vorflug-sora-arc')
    await ctx.close()
  }

  // 3) ARC-c/d: Flugplatz in der Nähe, keine Absprache
  {
    const { ctx, page } = await openSora({
      'arc:reservedAirspace': false,
      'arc:nearAirfield': 'yes_without',
    })
    await crop(page, block(page, 'Air Risk Class (ARC)'), 'vorflug-sora-arc-cd')
    await ctx.close()
  }

  // 4) ARC-c*: reservierter Luftraum, Risikoflug mit Absprache
  {
    const { ctx, page } = await openSora({
      'arc:reservedAirspace': true,
      'arc:riskFlight': true,
    })
    await crop(page, block(page, 'Air Risk Class (ARC)'), 'vorflug-sora-arc-cstern')
    await ctx.close()
  }

  // 5) SAIL II: GRC 3 (Brand im Wohngebiet) + ARC-b (städtisch)
  //    und 6) SAIL III mit Risikoflug-Hinweis: GRC 4 + ARC-b
  {
    const { ctx, page } = await openSora(SAIL2)
    await crop(page, block(page, 'SAIL-Bestimmung'), 'vorflug-sora-sail')
    await ctx.close()
  }
  {
    const { ctx, page } = await openSora({
      'grc:controlledGround': false,
      'grc:flightType': 'vlos',
      'grc:areaType': 'dense',
      'arc:reservedAirspace': false,
      'arc:nearAirfield': 'no',
      'arc:under150m': true,
      'arc:uncontrolledAirspace': true,
      'arc:areaType': 'urban',
    })
    await crop(page, block(page, 'SAIL-Bestimmung'), 'vorflug-sora-sail-risikoflug')
    await ctx.close()
  }

  // 7) Kopf des Abschnitts mit SAIL-Kennzeichen (Seed-Stand: SAIL I)
  {
    const ctx = await makeContext({ storage: buildStorage(Date.now()) })
    const page = await ctx.newPage()
    await go(page, `/mission/${MID}/vorflugkontrolle`, 3500)
    await unstick(page)
    const section = page.locator('section', { hasText: 'SORA Risikoklassifizierung' }).first()
    await crop(page, section.locator('button').first(), 'vorflug-sora-kopf', 6)
    await ctx.close()
  }

  // 8) Anhänge OSO (oberer Teil) und TMPR aufgeklappt — Stand SAIL II, VLOS
  {
    const { ctx, page } = await openSora(SAIL2)
    const oso = page.locator('[id$="-sora-annex-oso"]').first()
    await oso.locator('button').first().click()
    await page.waitForTimeout(700)
    // Die OSO-Tabelle ist sehr lang: nur Kopf, Zusammenfassung und erste Zeilen zeigen.
    await oso.evaluate((el) => { el.style.maxHeight = '614px'; el.style.overflow = 'hidden' })
    await crop(page, oso, 'vorflug-sora-anhang-oso')
    await oso.evaluate((el) => { el.style.maxHeight = ''; el.style.overflow = '' })
    await oso.locator('button').first().click()
    const tmpr = page.locator('[id$="-sora-annex-tmpr"]').first()
    await tmpr.locator('button').first().click()
    await page.waitForTimeout(700)
    await crop(page, tmpr, 'vorflug-sora-anhang-tmpr')
    await ctx.close()
  }

  // 9) Ganzer Bildschirm: Anfang des aufgeklappten Abschnitts, noch nichts beantwortet
  {
    const { ctx, page } = await openSora({}, { forCrop: false })
    await scrollTo(page, 'SORA Risikoklassifizierung', 70)
    await shot(page, 'vorflug-sora-start')
    await ctx.close()
  }
}
