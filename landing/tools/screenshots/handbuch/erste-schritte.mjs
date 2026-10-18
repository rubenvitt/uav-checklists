/**
 * Aufnahmen für die Kapitel „Erste Schritte" (01) und „Einsatzübersicht" (02).
 *
 * Bildnamen: `erste-schritte-…` bzw. `einsatzuebersicht-…`.
 */
import path from 'node:path'

/** Weitere Beispiel-Einsätze für die Übersicht. */
const MID3 = '33333333-4444-4555-8666-777777777777'
const SEG3 = 'cccccccc-dddd-4eee-8fff-000000000000'
const MID4 = '44444444-5555-4666-8777-888888888888'
const SEG4 = 'dddddddd-eeee-4fff-8000-111111111111'
/** Frisch angelegter Einsatz (nur Phase 1/2, nichts freigegeben). */
const MID5 = '55555555-6666-4777-8888-999999999999'
const SEG5 = 'eeeeeeee-ffff-4000-8111-222222222222'

function field(now, mid, key, value) {
  return [`uav-form:${mid}:${key}`, JSON.stringify({ value, timestamp: now })]
}

/** Seed aus seed.mjs plus eine Übung (Vorflugkontrolle) und ein kürzlich gelöschter Einsatz. */
function overviewStorage(seed, now) {
  const s = seed.buildStorage(now)
  const missions = JSON.parse(s['uav-missions'])
  missions.push(
    {
      id: MID3,
      createdAt: now - 20 * 60e3,
      label: 'Einsatz 22.09.2026 09:50',
      phase: 'vorflugkontrolle',
      segments: [{ id: SEG3, createdAt: now - 20 * 60e3, label: 'Standort 1', status: 'active' }],
      activeSegmentId: SEG3,
    },
    {
      id: MID4,
      createdAt: now - 5 * 3600e3,
      deletedAt: now - 7 * 60e3,
      label: 'Einsatz 22.09.2026 05:10',
      phase: 'einsatzdaten',
      segments: [{ id: SEG4, createdAt: now - 5 * 3600e3, label: 'Standort 1', status: 'active' }],
      activeSegmentId: SEG4,
    },
  )
  s['uav-missions'] = JSON.stringify(missions)
  for (const [k, v] of [
    field(now, MID3, 'flugAnlass', 'uebung'),
    field(now, MID3, 'einsatzstichwort', 'Personensuche Waldgebiet'),
    field(now, MID4, 'flugAnlass', 'testflug'),
  ]) s[k] = v
  s[`uav-manual-location:${MID3}`] = JSON.stringify({ latitude: 52.2786, longitude: 9.6014, name: 'Gehrden, Niedersachsen, Deutschland' })
  return s
}

/** Nur ein frisch angelegter Einsatz in der Vorflugkontrolle, ohne Freigabe. */
function freshStorage(now, { withLocation = true } = {}) {
  const s = {}
  s['uav-missions'] = JSON.stringify([
    {
      id: MID5,
      createdAt: now - 4 * 60e3,
      label: 'Einsatz 22.09.2026 10:05',
      phase: 'vorflugkontrolle',
      segments: [{ id: SEG5, createdAt: now - 4 * 60e3, label: 'Standort 1', status: 'active' }],
      activeSegmentId: SEG5,
    },
  ])
  const put = (k, v) => { const [a, b] = field(now, MID5, k, v); s[a] = b }
  put('flugAnlass', 'einsatz')
  put('einsatzstichwort', 'Vermisste Person')
  put('selectedDrone', 'matrice-350-rtk')
  // UAV-Kontrolle angefangen: drei in Ordnung, einer mit Mangel
  put('techcheck:uav', { gehaeuse: 'positive', klappmechanismus: 'positive', schrauben: 'positive', rotoren: 'negative' })
  if (withLocation) {
    const loc = { latitude: 52.3906, longitude: 9.6979, name: 'Herrenhäuser Gärten, Hannover' }
    s[`uav-manual-location:${MID5}`] = JSON.stringify(loc)
    s[`uav-manual-location:${MID5}:seg:${SEG5}`] = JSON.stringify(loc)
  }
  return s
}

/** Klappt alle offenen Abschnitte (ChecklistSection) zu. */
async function collapseAll(page) {
  const open = page.locator('section > button[aria-expanded="true"]')
  for (let i = (await open.count()) - 1; i >= 0; i--) {
    await open.nth(i).click().catch(() => {})
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(500)
}

/** Ausschnitt von der Oberkante von `a` bis zur Unterkante von `b` (ganze Seite). */
async function clipBetween(page, a, b, out, name, pad = 10) {
  await a.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  const scrollY = await page.evaluate(() => window.scrollY)
  const ba = await a.boundingBox()
  const bb = await b.boundingBox()
  const vp = page.viewportSize()
  const y = ba.y + scrollY - pad
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true, clip: { x: 0, y, width: vp.width, height: bb.y + bb.height + scrollY + pad - y } })
  console.log('  ->', name, '(Ausschnitt)')
}

/** Ausschnitt vom oberen Seitenrand bis zur Unterkante von `locator`. */
async function clipTop(page, locator, out, name, pad = 10) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const box = await locator.first().boundingBox()
  const vp = page.viewportSize()
  await page.screenshot({ path: path.join(out, `${name}.png`), clip: { x: 0, y: 0, width: vp.width, height: box.y + box.height + pad } })
  console.log('  ->', name, '(Ausschnitt oben)')
}

export default async function ({ makeContext, go, shot: rawShot, crop: rawCrop, clean, scrollTo, seed }) {
  // Devtools-Overlay kann nachträglich wieder eingehängt werden: vor jeder Aufnahme entfernen
  const shot = async (pg, name) => { await clean(pg); await rawShot(pg, name) }
  const crop = async (pg, loc, name, pad) => { await clean(pg); await rawCrop(pg, loc, name, pad) }
  const out = path.join(process.env.OUT ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../public/screenshots/handbuch'), '.tmp-erste-schritte')
  const now = Date.now()

  console.log('* Leere Startseite')
  {
    const ctx = await makeContext({ storage: null })
    const page = await ctx.newPage()
    await go(page, '/', 1500)
    await shot(page, 'erste-schritte-start-leer')
    await ctx.close()
  }

  console.log('* Übersicht mit Einsätzen')
  {
    const ctx = await makeContext({ storage: overviewStorage(seed, now), reseed: 'once' })
    const page = await ctx.newPage()
    await go(page, '/', 1800)
    await shot(page, 'einsatzuebersicht-liste')
    // Kürzlich gelöscht aufklappen
    await page.getByText('Kürzlich gelöscht', { exact: false }).first().click()
    await page.waitForTimeout(600)
    await crop(page, page.locator('div.space-y-3').filter({ hasText: 'Kürzlich gelöscht' }).last(), 'einsatzuebersicht-geloescht')
    // Abgeschlossenen Einsatz öffnen
    await page.getByText('Vegetationsbrand', { exact: false }).first().click()
    await page.waitForTimeout(2000)
    await shot(page, 'einsatzuebersicht-abgeschlossen')
    await ctx.close()
  }

  console.log('* Neuer Einsatz')
  {
    const ctx = await makeContext({ storage: null })
    const page = await ctx.newPage()
    await go(page, '/', 1200)
    await page.getByText('Ersten Einsatz anlegen', { exact: true }).click()
    await page.waitForTimeout(3000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot(page, 'einsatzuebersicht-neu')
    await ctx.close()
  }

  console.log('* Kopfleiste und Phasenleiste (frischer Einsatz)')
  {
    const ctx = await makeContext({ storage: freshStorage(now), reseed: 'once' })
    const page = await ctx.newPage()
    await go(page, `/mission/${MID5}/vorflugkontrolle`, 4000)
    await clean(page)
    await clipTop(page, page.locator('nav[aria-label="Einsatzphasen"]'), out, 'erste-schritte-kopfleiste')
    // Angefangene UAV-Kontrolle
    await collapseAll(page)
    const uav = page.locator('section').filter({ has: page.getByText('UAV', { exact: true }) }).first()
    await uav.locator(':scope > button').click()
    await page.mouse.move(1, 1)
    await page.waitForTimeout(800)
    await crop(page, uav, 'erste-schritte-abschnitt-offen')
    await ctx.close()
  }

  console.log('* Abschnitte mit Status (hell/dunkel)')
  for (const scheme of ['light', 'dark']) {
    const ctx = await makeContext({ colorScheme: scheme, storage: seed.buildStorage(now) })
    const page = await ctx.newPage()
    await go(page, `/mission/${seed.MID}/vorflugkontrolle`, 5000)
    // Wetter-Abschnitt kann zugeklappt sein: nur auf das Ende des Ladens warten
    for (const text of ['Wetterdaten werden geladen', 'DWD-Daten werden geladen']) {
      await page.getByText(text).first().waitFor({ state: 'hidden', timeout: 45000 })
    }
    const wetter = page.locator('section').filter({ has: page.getByText('Wetterbedingungen', { exact: true }) }).first()
    await wetter.locator(':scope > button').getByText(/^(Gut|Achtung|Warnung)$/).waitFor({ timeout: 60000 })
    await page.waitForTimeout(1500)
    await collapseAll(page)
    await scrollTo(page, 'Standortabhängige Prüfungen', 16)
    await shot(page, scheme === 'light' ? 'erste-schritte-abschnitte' : 'erste-schritte-dunkel')
    await ctx.close()
  }

  console.log('* Standort fehlt')
  {
    const ctx = await makeContext({ storage: freshStorage(now, { withLocation: false }) })
    await ctx.clearPermissions()
    const page = await ctx.newPage()
    await go(page, `/mission/${MID5}/vorflugkontrolle`, 4000)
    await collapseAll(page)
    await page.mouse.move(1, 1)
    await crop(page, page.locator('section').filter({ hasText: 'Einsatzort festlegen' }).first(), 'erste-schritte-standort-fehlt')
    await clean(page)
    await clipBetween(page, page.getByText('Standortabhängige Prüfungen').first(), page.locator('section').filter({ hasText: 'SORA Risikoklassifizierung' }).first(), out, 'erste-schritte-standort-gesperrt')
    await ctx.close()
  }
}
