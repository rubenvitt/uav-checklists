/**
 * Aufnahmen für Kapitel 05 „Umgebung und Luftraum prüfen“.
 *
 * Grundlage ist der Beispiel-Einsatz aus seed.mjs (Hannover-Herrenhausen) mit
 * der festen Overpass- und ADS-B-Antwort aus lib.mjs. Für die Aufnahme mit
 * Hubschrauberlandeplatz wird die Overpass-Antwort in diesem Kontext durch
 * eine kleinere Liste ersetzt; für die Offline-Aufnahme wird das Netz des
 * Browsers nach dem ersten Laden abgeschaltet.
 */

/** Kleine Umgebung mit Hubschrauberlandeplatz → Abschnitt zeigt „Achtung“. */
const OVERPASS_HELIPAD = {
  elements: [
    { type: 'way', center: { lat: 52.3845, lon: 9.6902 }, tags: { aeroway: 'helipad', name: 'Hubschrauberlandeplatz Klinikum Nordstadt' } },
    { type: 'way', center: { lat: 52.3845, lon: 9.6905 }, tags: { amenity: 'hospital', name: 'Klinikum Nordstadt' } },
    { type: 'way', center: { lat: 52.3899, lon: 9.7002 }, tags: { railway: 'rail', name: 'Strecke Hannover–Bremen' } },
    { type: 'node', lat: 52.3893, lon: 9.6958, tags: { power: 'tower' } },
  ],
}

export default async function ({ makeContext, go, crop, expand, waitForWeather, seed }) {
  const { buildStorage, MID } = seed
  const route = `/mission/${MID}/vorflugkontrolle`

  /** Alle aufgeklappten Abschnitte schließen. */
  async function closeAll(page) {
    const open = page.locator('section > button[aria-expanded="true"]')
    for (let n = await open.count(); n > 0; n = await open.count()) {
      await open.first().click()
      await page.waitForTimeout(300)
    }
  }

  /** Seite laden und die mitlaufende Kopfleiste lösen, damit sie keine Ausschnitte verdeckt. */
  async function open(page) {
    await go(page, route, 6000)
    await page.addStyleTag({ content: '.sticky { display: none !important; }' })
  }

  /** Abschnitt (ChecklistSection) über seine Überschrift finden. */
  const section = (page, title) =>
    page.locator('section').filter({ has: page.getByText(title, { exact: true }) }).first()

  // 1) Überblick: die vier standortabhängigen Abschnitte zugeklappt mit ihren Statusanzeigen
  {
    const ctx = await makeContext({ storage: buildStorage(Date.now()) })
    const page = await ctx.newPage()
    await open(page)
    await page.getByText('nächster Tiefflug').first().waitFor({ timeout: 20000 }).catch(() => {})
    await closeAll(page)
    // Nur Trennlinie + Externe Prüfungen bis Fluganmeldungen stehen lassen
    await page.evaluate(() => {
      const divider = [...document.querySelectorAll('span')].find((s) => s.textContent === 'Standortabhängige Prüfungen')
      const row = divider?.parentElement
      const container = row?.parentElement
      if (!row || !container) return
      const kids = [...container.children]
      const start = kids.indexOf(row)
      kids.forEach((el, i) => {
        if (i < start || i > start + 4) el.setAttribute('data-hidden-shot', el.style.display || ' '), (el.style.display = 'none')
      })
      container.setAttribute('id', 'shot-range')
      container.style.paddingTop = '12px'
      container.style.paddingBottom = '12px'
    })
    await page.evaluate(() => window.scrollTo(0, 0))
    await crop(page, page.locator('#shot-range'), 'vorflug-umgebung-luftraum-uebersicht', 0)
    await ctx.close()
  }

  // 2) Externe Prüfungen, Manuelle Prüfungen, Flugverkehr, Einzelzeile, Fluganmeldungen
  {
    const ctx = await makeContext({ storage: buildStorage(Date.now()) })
    const page = await ctx.newPage()
    await open(page)
    // Erst mit der Geländehöhe aus den Wetterdaten stehen die Höhen „ü. Grund“ da
    await waitForWeather(page).catch(() => console.log('    (Wetter nicht geladen)'))
    await page.getByText('nächster Tiefflug').first().waitFor({ timeout: 20000 }).catch(() => {})
    await closeAll(page)

    await expand(page, 'Externe Prüfungen')
    await crop(page, section(page, 'Externe Prüfungen'), 'vorflug-umgebung-luftraum-externe-pruefungen')
    await expand(page, 'Externe Prüfungen')

    await expand(page, 'Umgebungsprüfung')
    const manual = page.getByText('Manuelle Prüfungen', { exact: true }).first().locator('xpath=../..')
    // Zwei Beispiel-Haken setzen, damit man sieht, wie ein gesetzter Punkt aussieht
    await page.getByText('WLAN-Netze', { exact: true }).first().click()
    await page.getByText('BOS-Einsatzstelle', { exact: true }).first().click()
    await page.getByText('Manuelle Prüfungen', { exact: true }).first().click()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(400)
    await crop(page, manual, 'vorflug-umgebung-luftraum-manuelle-pruefungen')
    await expand(page, 'Umgebungsprüfung')

    await expand(page, 'Flugverkehr (ADS-B)')
    await crop(page, section(page, 'Flugverkehr (ADS-B)'), 'vorflug-umgebung-luftraum-flugverkehr')
    const row = page.locator('div.rounded-lg.bg-surface-alt').filter({ hasText: 'CHX4' }).last()
    await crop(page, row, 'vorflug-umgebung-luftraum-flugverkehr-zeile', 6)
    await expand(page, 'Flugverkehr (ADS-B)')

    await expand(page, 'Fluganmeldungen')
    await crop(page, section(page, 'Fluganmeldungen'), 'vorflug-umgebung-luftraum-fluganmeldungen')
    await ctx.close()
  }

  // 3) Umgebung mit Hubschrauberlandeplatz → „Achtung“
  {
    const ctx = await makeContext({ storage: buildStorage(Date.now()) })
    await ctx.route('https://**/api/interpreter*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OVERPASS_HELIPAD) }),
    )
    const page = await ctx.newPage()
    await open(page)
    await page.getByText('Hubschrauberlandeplatz Klinikum Nordstadt').first().waitFor({ timeout: 20000 }).catch(() => {})
    await closeAll(page)
    await expand(page, 'Umgebungsprüfung')
    const sec = section(page, 'Umgebungsprüfung')
    // Nur Kopf und Fundliste, ohne die manuellen Prüfungen
    await page.evaluate(() => {
      const label = [...document.querySelectorAll('p')].find((p) => p.textContent?.trim() === 'Manuelle Prüfungen')
      const block = label?.parentElement?.parentElement
      if (block) block.style.display = 'none'
    })
    await crop(page, sec, 'vorflug-umgebung-luftraum-umgebung-achtung')
    await ctx.close()
  }

  // 4) ADS-B-Dienst nicht erreichbar: gespeicherter Stand des Flugverkehrs.
  //    (Meldet das Gerät selbst „offline“, pausiert die App die Abfrage nur und
  //    zeigt den letzten Stand ohne Hinweis — dafür gibt es keine Aufnahme.)
  {
    const ctx = await makeContext({ storage: buildStorage(Date.now()) })
    const page = await ctx.newPage()
    await open(page)
    await page.getByText('nächster Tiefflug').first().waitFor({ timeout: 20000 }).catch(() => {})
    await closeAll(page)
    await expand(page, 'Flugverkehr (ADS-B)')
    // Verbindung bricht ab: Die ADS-B-Abfrage scheitert, das Gerät gilt aber als online
    await ctx.route('**/adsb/point/**', (r) => r.abort('internetdisconnected'))
    const sec = section(page, 'Flugverkehr (ADS-B)')
    await sec.getByText('Aktualisieren', { exact: true }).click()
    await page.getByText('Kein ADS-B-Server verbunden').first().waitFor({ timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(600)
    // Nur der obere Teil: Hinweis, Stand und Kennzahlen
    await page.evaluate(() => {
      const list = [...document.querySelectorAll('section')].find((s) => s.textContent?.includes('Flugverkehr (ADS-B)'))
      if (!list) return
      for (const el of list.querySelectorAll('ul, div.space-y-1\\.5, p.flex.items-start')) el.style.display = 'none'
    })
    await crop(page, sec, 'vorflug-umgebung-luftraum-flugverkehr-keine-verbindung')
    await ctx.close()
  }
}
