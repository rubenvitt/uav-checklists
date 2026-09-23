/**
 * Erzeugt die Screenshots für die Landingpage aus der laufenden PWA.
 *
 * Der Browser bekommt vor dem ersten Rendern einen vollständig ausgefüllten
 * Beispiel-Einsatz in den localStorage geschrieben (siehe seed.mjs). Wetter,
 * K-Index und Kartenkacheln werden dabei tatsächlich abgerufen — nur die
 * Overpass-Antwort ist fest hinterlegt, damit die Umgebungsprüfung
 * reproduzierbar dieselben Objekte zeigt.
 *
 * Voraussetzung: Die PWA läuft (im Projektwurzelverzeichnis `pnpm dev`).
 *
 *   node tools/screenshots/capture.mjs
 *   node tools/screenshots/optimize.mjs
 *
 * Umgebungsvariablen:
 *   APP_URL         Basis-URL der laufenden PWA (Standard http://localhost:5174)
 *   OUT             Zielverzeichnis (Standard ../../public/screenshots)
 *   CHROMIUM_PATH   abweichende Chromium-Binärdatei für Playwright
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildStorage, MID } from './seed.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = process.env.OUT ?? path.resolve(here, '../../public/screenshots')
const BASE = process.env.APP_URL ?? 'http://localhost:5174'
const NOW = Date.now()
const STORE = buildStorage(NOW)

/** Einsatzort der Aufnahmen: Herrenhäuser Gärten, Hannover. */
const LAT = 52.3906
const LON = 9.6979

/** Feste Overpass-Antwort, damit die Umgebungsprüfung reproduzierbar bleibt. */
const OVERPASS = {
  elements: [
    { type: 'way', center: { lat: 52.3845, lon: 9.6902 }, tags: { amenity: 'hospital', name: 'Klinikum Nordstadt' } },
    { type: 'node', lat: 52.3971, lon: 9.7052, tags: { amenity: 'fire_station', name: 'Feuer- und Rettungswache 2' } },
    { type: 'node', lat: 52.3882, lon: 9.7112, tags: { amenity: 'police', name: 'Polizeikommissariat Nordstadt' } },
    { type: 'way', center: { lat: 52.3962, lon: 9.6851 }, tags: { leisure: 'nature_reserve', name: 'Leineaue bei Ricklingen' } },
    { type: 'node', lat: 52.3935, lon: 9.7038, tags: { railway: 'halt', name: 'Hannover Nordstadt' } },
    { type: 'way', center: { lat: 52.3899, lon: 9.7002 }, tags: { railway: 'rail', name: 'Strecke Hannover–Bremen' } },
    { type: 'way', center: { lat: 52.3954, lon: 9.6894 }, tags: { highway: 'motorway', ref: 'A 352' } },
    { type: 'way', center: { lat: 52.3921, lon: 9.6944 }, tags: { waterway: 'canal', ship: 'yes', name: 'Leine-Verbindungskanal' } },
    { type: 'node', lat: 52.3893, lon: 9.6958, tags: { power: 'tower' } },
    { type: 'node', lat: 52.3887, lon: 9.6965, tags: { power: 'tower' } },
    { type: 'way', center: { lat: 52.3838, lon: 9.7085 }, tags: { power: 'substation', name: 'Umspannwerk Herrenhausen' } },
    { type: 'node', lat: 52.3948, lon: 9.7121, tags: { man_made: 'communications_tower', name: 'Funkturm Vinnhorst' } },
    { type: 'way', center: { lat: 52.3812, lon: 9.6931 }, tags: { landuse: 'industrial', name: 'Gewerbegebiet Leinhausen' } },
  ],
}

/**
 * Feste ADS-B-Antwort (readsb-Format wie vom Backend-Proxy): Rettungshubschrauber
 * im Tiefflug, ein Airliner im Anflug auf Hannover-Langenhagen, Kleinflugzeug
 * und ein Überflug in Reiseflughöhe. Die Werte sind erfunden, aber plausibel.
 */
const ADSB_TRAFFIC = [
  { hex: '3c4dc4', flight: 'CHX4', r: 'D-HXBC', t: 'EC35', desc: 'EUROCOPTER EC-135', category: 'A7', emergency: 'lifeguard', lat: 52.3778, lon: 9.7228, alt_geom: 1150, gs: 108, track: 292, geom_rate: -320, seen_pos: 1.2 },
  { hex: '3c6589', flight: 'EWG7KN', r: 'D-AEWK', t: 'A320', category: 'A3', lat: 52.4632, lon: 9.6921, alt_geom: 1700, gs: 146, track: 272, geom_rate: -704, seen_pos: 0.4 },
  { hex: '3dd2a1', flight: 'DEFKA', r: 'D-EFKA', t: 'C172', category: 'A1', lat: 52.3934, lon: 9.6247, alt_geom: 2600, gs: 92, track: 85, geom_rate: 0, seen_pos: 2.1 },
  { hex: '4ca7f3', flight: 'RYR8GZ', r: 'EI-DWL', t: 'B738', category: 'A3', lat: 52.4381, lon: 9.7695, alt_geom: 36975, gs: 468, track: 118, geom_rate: 0, seen_pos: 0.8 },
]
/** Taucht für die Banner-Aufnahme neu auf: Hubschrauber im Tiefflug, 1,6 km West. */
const ADSB_NEWCOMER = { hex: '3d0a52', r: 'D-HNWX', t: 'H145', category: 'A7', lat: 52.3911, lon: 9.6744, alt_geom: 600, gs: 85, track: 70, geom_rate: 0, seen_pos: 0.6 }
let adsbAircraft = ADSB_TRAFFIC

fs.mkdirSync(OUT, { recursive: true })

const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy
const proxy = proxyUrl ? { server: proxyUrl, bypass: 'localhost,127.0.0.1' } : undefined

const common = {
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  permissions: ['geolocation'],
  geolocation: { latitude: LAT, longitude: LON },
  ignoreHTTPSErrors: true,
  ...(proxy ? { proxy } : {}),
}

/**
 * Geräteprofil der Aufnahmen: iPhone-Format, dreifache Pixeldichte. Auch auf
 * dem Desktop zeigt die Landingpage Handy-Aufnahmen — Desktop-Aufnahmen wären
 * im Browserrahmen zu klein, um sie zu lesen.
 */
const device = { ...common, viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }

const browser = await chromium.launch(launchOptions)

async function makeContext(colorScheme) {
  const ctx = await browser.newContext({ ...device, colorScheme })
  await ctx.addInitScript(
    ([store, theme]) => {
      for (const [k, v] of Object.entries(store)) localStorage.setItem(k, v)
      localStorage.setItem('theme', theme)
    },
    [STORE, colorScheme],
  )
  await ctx.route('https://**/api/interpreter*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OVERPASS) }),
  )
  await ctx.route('**/adsb/point/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ source: 'adsb.lol', now: Date.now(), ac: adsbAircraft }),
    }),
  )
  return ctx
}

/** Entfernt das TanStack-Devtools-Overlay aus dem Bild. */
async function clean(pg) {
  await pg.evaluate(() => {
    for (const el of [...document.body.children]) {
      if (el.id !== 'root' && el.tagName !== 'SCRIPT') el.remove()
    }
  })
}

async function go(pg, route, wait = 2500) {
  await pg.goto(BASE + route, { waitUntil: 'domcontentloaded' })
  await pg.waitForTimeout(wait)
  await clean(pg)
}

/**
 * Wartet, bis Wetter- und DWD-Daten geladen sind — sonst landet der
 * Ladezustand im Bild. Bricht nach 45 s mit Fehler ab statt still weiterzumachen.
 */
async function waitForWeather(pg) {
  for (const text of ['Wetterdaten werden geladen', 'DWD-Daten werden geladen']) {
    await pg.getByText(text).first().waitFor({ state: 'hidden', timeout: 45000 })
  }
  await pg.getByText('Wind', { exact: true }).first().waitFor({ timeout: 45000 })
}

async function expand(pg, text) {
  const heading = pg.getByText(text, { exact: true }).first()
  if (!(await heading.count())) return
  await heading.scrollIntoViewIfNeeded().catch(() => {})
  await heading.click().catch(() => {})
  await pg.waitForTimeout(900)
}

/** Scrollt so, dass der Text `offset` CSS-Pixel unter dem oberen Rand steht. */
async function scrollTo(pg, text, offset = 88) {
  const el = pg.getByText(text, { exact: false }).first()
  try {
    await el.evaluate((node, o) => {
      const top = node.getBoundingClientRect().top + window.scrollY - o
      window.scrollTo(0, Math.max(0, top))
    }, offset)
  } catch {
    console.log('    (nicht gefunden:', text, ')')
  }
  await pg.waitForTimeout(700)
}

async function shot(pg, name) {
  await pg.waitForTimeout(250)
  await pg.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log('  ->', name)
}

async function captureAll() {
  const ctx = await makeContext('light')
  const page = await ctx.newPage()

  console.log('* Übersicht')
  await go(page, '/', 1800)
  await shot(page, 'uebersicht')

  console.log('* Einsatzdaten')
  await go(page, `/mission/${MID}/einsatzdaten`)
  await scrollTo(page, 'Einsatzkarte', 40)
  await page.waitForTimeout(9000) // Kartenkacheln
  await shot(page, 'einsatzkarte')

  console.log('* Vorflugkontrolle')
  await go(page, `/mission/${MID}/vorflugkontrolle`, 6000)
  await waitForWeather(page)
  await scrollTo(page, 'Wetterbedingungen')
  await page.waitForTimeout(1500)
  await shot(page, 'wetter')
  await expand(page, 'Umgebungsprüfung')
  await scrollTo(page, 'Umgebungsprüfung')
  await shot(page, 'umgebung')
  await expand(page, 'Umgebungsprüfung')
  // Öffnet sich bei Tiefflug in der Nähe von selbst
  if (!(await page.getByText('nächster Tiefflug').first().isVisible().catch(() => false))) {
    await expand(page, 'Flugverkehr (ADS-B)')
  }
  await scrollTo(page, 'Flugverkehr (ADS-B)', 40)
  await shot(page, 'flugverkehr')
  await expand(page, 'Flugverkehr (ADS-B)')
  await expand(page, 'SORA Risikoklassifizierung')
  await scrollTo(page, 'SAIL-Bestimmung', 260)
  await shot(page, 'sail')
  await expand(page, 'SORA Risikoklassifizierung')
  await scrollTo(page, '24-Stunden-Vorhersage', 40)
  await shot(page, 'vorhersage')
  await expand(page, 'Remote Controller (A und B)')
  await scrollTo(page, 'Remote Controller (A und B)')
  await shot(page, 'technik')

  console.log('* Flüge')
  await go(page, `/mission/${MID}/fluege`, 3000)
  await scrollTo(page, 'Ereignisse (', 520)
  await shot(page, 'flugbuch')
  const procedures = page.locator('button', { hasText: 'Prozeduren' }).first()
  if (await procedures.count()) {
    await procedures.click()
    await page.waitForTimeout(1800)
    await shot(page, 'prozeduren')
  }

  console.log('* Luftraumüberwachung')
  await go(page, `/mission/${MID}/fluege`, 3000)
  adsbAircraft = [...ADSB_TRAFFIC, ADSB_NEWCOMER]
  await page.getByTitle('Jetzt aktualisieren').first().click()
  await page.getByText('als Ereignis protokolliert').first().waitFor({ timeout: 10000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  await shot(page, 'luftraum')
  adsbAircraft = ADSB_TRAFFIC

  console.log('* Nachbereitung')
  await go(page, `/mission/${MID}/nachbereitung`, 3000)
  await shot(page, 'nachbereitung')
  await expand(page, 'Einsatzabschluss')
  await scrollTo(page, 'Einsatzabschluss')
  await shot(page, 'abschluss')
  await ctx.close()

  console.log('* Dunkles Design')
  const darkCtx = await makeContext('dark')
  const darkPage = await darkCtx.newPage()
  await go(darkPage, `/mission/${MID}/fluege`, 3000)
  await shot(darkPage, 'fluege-dark')
  await darkCtx.close()
}

await captureAll()

await browser.close()
console.log('fertig — jetzt tools/screenshots/optimize.mjs ausführen')
