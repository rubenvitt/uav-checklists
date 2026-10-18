/**
 * Aufnahmen für Kapitel 03 „Einsatzdaten erfassen".
 *
 *   node tools/screenshots/handbuch.mjs einsatzdaten
 *
 * Teil 1 zeigt einen frisch angelegten Einsatz ohne GPS-Freigabe (Standort
 * fehlt, Einsatzkarte gesperrt). Teil 2 arbeitet mit dem Beispiel-Einsatz aus
 * seed.mjs: ausgefüllte Abschnitte, Standortsuche, Zeichnen auf der
 * Einsatzkarte, Kartenfoto, Missionsbriefing.
 */

const FRESH = 'cccccccc-dddd-4eee-8fff-000000000001'
const FRESH_SEG = 'cccccccc-dddd-4eee-8fff-000000000002'

/** Abschnitt (Paneel) mit dieser Überschrift. */
function section(page, title) {
  return page.locator('section').filter({ has: page.getByText(title, { exact: true }) }).first()
}

/** Klappt einen Abschnitt auf, falls er noch zu ist. */
async function open(page, title) {
  const btn = section(page, title).locator('button[aria-expanded]').first()
  if ((await btn.getAttribute('aria-expanded')) !== 'true') {
    await btn.click()
    await page.waitForTimeout(700)
  }
}

/** Klappt einen Abschnitt zu, falls er offen ist. */
async function close(page, title) {
  const btn = section(page, title).locator('button[aria-expanded]').first()
  if ((await btn.getAttribute('aria-expanded')) === 'true') {
    await btn.click()
    await page.waitForTimeout(500)
  }
}

export default async function ({ makeContext, go, shot: rawShot, crop, scrollTo, clean, seed }) {
  // Später eingeblendete Entwicklungs-Overlays (außerhalb von #root) vor jeder Vollbildaufnahme entfernen.
  const shot = async (page, name) => {
    await clean(page)
    await rawShot(page, name)
  }
  // ── Teil 1: frischer Einsatz, GPS verweigert ─────────────────────────────
  {
    const now = Date.now()
    const tz = { timeZone: 'Europe/Berlin' }
    const label = `Einsatz ${new Date(now).toLocaleDateString('de-DE', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(now).toLocaleTimeString('de-DE', { ...tz, hour: '2-digit', minute: '2-digit' })}`
    const storage = {
      'uav-missions': JSON.stringify([
        {
          id: FRESH,
          createdAt: now,
          label,
          phase: 'einsatzdaten',
          segments: [{ id: FRESH_SEG, createdAt: now, label: 'Standort 1', status: 'active' }],
          activeSegmentId: FRESH_SEG,
        },
      ]),
    }
    const ctx = await makeContext({ storage, reseed: 'once' })
    // Wie ein Gerät, auf dem die Standortfreigabe abgelehnt wurde.
    await ctx.addInitScript(() => {
      const deny = (_ok, err) => setTimeout(() => err?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1 }), 50)
      Object.defineProperty(navigator.geolocation, 'getCurrentPosition', { value: deny, configurable: true })
    })
    const page = await ctx.newPage()
    await go(page, `/mission/${FRESH}/einsatzdaten`, 2500)
    await page.getByText('Kein GPS-Zugriff', { exact: false }).first().waitFor({ timeout: 20000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot(page, 'einsatzdaten-neuer-einsatz')

    // Einsatzauftrag: Vorlage Personensuche, damit man die Felder sieht.
    await close(page, 'Einsatzdetails')
    await open(page, 'Einsatzauftrag')
    await section(page, 'Einsatzauftrag').getByRole('button', { name: 'Personensuche' }).click()
    await page.waitForTimeout(400)
    const fill = async (label, text) => {
      const input = section(page, 'Einsatzauftrag').getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]')
      await input.fill(text)
    }
    await fill('Name / Beschreibung der Person', 'Herbert K., Bewohner Seniorenheim')
    await fill('Alter', 'ca. 82')
    await fill('Geschlecht', 'männlich')
    await fill('Letzte bekannte Position', 'Parkplatz Waldfriedhof, Nordausgang')
    await fill('Kleidung / auffällige Merkmale', 'Beige Jacke, Rollator, Gehstock')
    await fill('Seit wann vermisst', 'seit 14:30 Uhr')
    await fill('Weitere Informationen / Besonderheiten', 'Desorientiert, meidet Ansprache. Wärmebildkamera einsetzen.')
    await page.evaluate(() => document.activeElement?.blur())
    await page.waitForTimeout(300)
    await page.addStyleTag({ content: '.sticky.top-0 { position: static !important; }' })
    await crop(page, section(page, 'Einsatzauftrag'), 'einsatzdaten-auftrag-personensuche')
    await ctx.close()
  }

  // ── Teil 2: Beispiel-Einsatz ─────────────────────────────────────────────
  const store = seed.buildStorage(Date.now())
  // Ein Standort-Punkt wie nach dem ersten Öffnen (die Entwicklungsansicht setzt ihn sonst doppelt).
  const k = (key) => `uav-form:${seed.MID}:${key}`
  store[k('einsatzkarte')] = JSON.stringify({
    value: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [9.6979, 52.3906] }, properties: { shapeType: 'standort', createdAt: 1 } }] },
    timestamp: Date.now(),
  })
  store[k(`seg:${seed.SEG}:einsatzkarte:autoStandort`)] = JSON.stringify({ value: true, timestamp: Date.now() })
  store['uav-crew-roster'] = JSON.stringify({
    names: ['R. Vitt', 'J. Hansen', 'T. Meier', 'A. Schuster', 'L. Petersen', 'K. Albrecht', 'N. Yilmaz', 'P. Wendt'],
  })
  const ctx = await makeContext({ storage: store, reseed: 'once' })
  const page = await ctx.newPage()
  const MID = seed.MID
  await go(page, `/mission/${MID}/einsatzdaten`, 3000)
  await page.getByText('Einsatzdetails', { exact: true }).first().waitFor({ timeout: 20000 })

  // Einsatzdetails ausgefüllt
  await open(page, 'Einsatzdetails')
  await crop(page, section(page, 'Einsatzdetails'), 'einsatzdaten-einsatzdetails')

  // Standortleiste mit gesetztem Ort
  await page.evaluate(() => window.scrollTo(0, 0))
  await crop(page, section(page, 'Einsatzort'), 'einsatzdaten-standort-gesetzt')

  // Standortsuche: Koordinaten (UTM-Ref) und Adresse
  await section(page, 'Einsatzort').getByTitle('Standort ändern').click()
  await page.waitForTimeout(300)
  const search = page.getByPlaceholder('Ort, Adresse oder Koordinaten…')
  await search.evaluate((el) => { el.spellcheck = false })
  await search.fill('32UND 47390 05000')
  await page.waitForTimeout(600)
  await crop(page, section(page, 'Einsatzort'), 'einsatzdaten-standort-koordinaten')
  await search.fill('Wennigsen Deister')
  await page.getByText('Adresssuche').first().waitFor({ timeout: 15000 }).catch(() => console.log('    (keine Adressvorschläge)'))
  await page.waitForTimeout(500)
  await crop(page, section(page, 'Einsatzort'), 'einsatzdaten-standort-adresse')
  await section(page, 'Einsatzort').getByRole('button', { name: 'Abbrechen' }).click()
  await page.waitForTimeout(400)

  // Truppstärke
  await close(page, 'Einsatzdetails')
  await close(page, 'Einsatzauftrag')
  await close(page, 'Einsatzkarte')
  await open(page, 'Truppstärke')
  await crop(page, section(page, 'Truppstärke'), 'einsatzdaten-truppstaerke')

  // Namensvorschläge: neue Zeile Bildauswerter, Feld antippen
  await section(page, 'Truppstärke').getByRole('button', { name: 'Bildauswerter' }).last().click()
  await page.waitForTimeout(400)
  const inputs = section(page, 'Truppstärke').getByPlaceholder('Name eingeben...')
  await inputs.last().click()
  await page.waitForTimeout(300)
  await inputs.last().evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 330))
  await page.waitForTimeout(500)
  await shot(page, 'einsatzdaten-namensvorschlaege')
  // Zeile wieder entfernen
  await page.keyboard.press('Escape')
  await section(page, 'Truppstärke').locator('button.mt-5').last().click().catch(() => {})
  await close(page, 'Truppstärke')

  // Einsatzkarte: Einsatzgebiet zeichnen
  await open(page, 'Einsatzkarte')
  await scrollTo(page, 'Karte zeichnen', 120)
  await page.waitForTimeout(8000) // Kartenkacheln
  const map = section(page, 'Einsatzkarte').locator('.einsatz-map')
  await map.getByTitle('Einsatzgebiet').click()
  await page.waitForTimeout(400)
  const box = await map.boundingBox()
  const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy]
  for (const [fx, fy] of [[0.18, 0.22], [0.62, 0.16], [0.7, 0.68], [0.3, 0.8]]) {
    const [x, y] = at(fx, fy)
    await page.mouse.click(x, y)
    await page.waitForTimeout(450)
  }
  await page.waitForTimeout(600)
  await shot(page, 'einsatzdaten-karte-zeichnen')

  // Abschließen, speichern
  await map.getByTitle('Fertig').click()
  await page.waitForTimeout(2500)
  await section(page, 'Einsatzkarte').getByRole('button', { name: 'Karte speichern' }).click()
  await section(page, 'Einsatzkarte').getByText('Gespeicherte Ansicht').waitFor({ timeout: 30000 })
  await page.waitForTimeout(1200)
  await crop(page, section(page, 'Einsatzkarte'), 'einsatzdaten-karte-gespeichert')

  // Kartenfoto-Modus (leer)
  await section(page, 'Einsatzkarte').getByRole('button', { name: 'Kartenfoto' }).click()
  await page.waitForTimeout(500)
  await crop(page, section(page, 'Einsatzkarte'), 'einsatzdaten-kartenfoto')
  await section(page, 'Einsatzkarte').getByRole('button', { name: 'Karte zeichnen' }).click()
  await page.waitForTimeout(400)
  await close(page, 'Einsatzkarte')

  // Lange Ausschnitte: Kopfleiste nicht mitten ins Bild kleben lassen.
  await page.addStyleTag({ content: '.sticky.top-0 { position: static !important; }' })

  // Missionsbriefing, zwei Punkte abgehakt
  await open(page, 'Missionsbriefing')
  const brief = section(page, 'Missionsbriefing')
  await brief.getByRole('button', { name: 'Einsatzauftrag bekannt' }).click()
  await brief.getByRole('button', { name: 'Priorisierung bei der Ausführung' }).click()
  await page.waitForTimeout(400)
  await crop(page, brief, 'einsatzdaten-missionsbriefing')

  await ctx.close()
}
