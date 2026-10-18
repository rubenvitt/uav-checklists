/**
 * Gemeinsame Bausteine für die Screenshot-Skripte (capture.mjs für die
 * Startseite, handbuch.mjs für das Handbuch).
 *
 * Der Browser bekommt vor dem ersten Rendern einen Beispiel-Einsatz in den
 * localStorage geschrieben (seed.mjs). Wetter, K-Index und Kartenkacheln
 * werden tatsächlich abgerufen; Overpass (Umgebungsprüfung) und ADS-B
 * (Flugverkehr) sind fest hinterlegt, damit die Aufnahmen reproduzierbar sind.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

export const BASE = process.env.APP_URL ?? 'http://localhost:5174'

/** Einsatzort der Aufnahmen: Herrenhäuser Gärten, Hannover. */
export const LAT = 52.3906
export const LON = 9.6979

/** Feste Overpass-Antwort, damit die Umgebungsprüfung reproduzierbar bleibt. */
export const OVERPASS = {
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
export const ADSB_TRAFFIC = [
  { hex: '3c4dc4', flight: 'CHX4', r: 'D-HXBC', t: 'EC35', desc: 'EUROCOPTER EC-135', category: 'A7', emergency: 'lifeguard', lat: 52.3778, lon: 9.7228, alt_geom: 1150, gs: 108, track: 292, geom_rate: -320, seen_pos: 1.2 },
  { hex: '3c6589', flight: 'EWG7KN', r: 'D-AEWK', t: 'A320', category: 'A3', lat: 52.4632, lon: 9.6921, alt_geom: 1700, gs: 146, track: 272, geom_rate: -704, seen_pos: 0.4 },
  { hex: '3dd2a1', flight: 'DEFKA', r: 'D-EFKA', t: 'C172', category: 'A1', lat: 52.3934, lon: 9.6247, alt_geom: 2600, gs: 92, track: 85, geom_rate: 0, seen_pos: 2.1 },
  { hex: '4ca7f3', flight: 'RYR8GZ', r: 'EI-DWL', t: 'B738', category: 'A3', lat: 52.4381, lon: 9.7695, alt_geom: 36975, gs: 468, track: 118, geom_rate: 0, seen_pos: 0.8 },
]
/** Taucht für die Banner-Aufnahme neu auf: Hubschrauber im Tiefflug, 1,6 km West. */
export const ADSB_NEWCOMER = { hex: '3d0a52', r: 'D-HNWX', t: 'H145', category: 'A7', lat: 52.3911, lon: 9.6744, alt_geom: 600, gs: 85, track: 70, geom_rate: 0, seen_pos: 0.6 }

/**
 * Startet Chromium und liefert die Werkzeuge für eine Aufnahmeserie.
 * `out` ist das Zielverzeichnis der PNG-Dateien.
 */
export async function createSession({ out }) {
  fs.mkdirSync(out, { recursive: true })

  // Deutsche Oberfläche auch für Datums-/Zeitfelder: `locale` allein reicht
  // dafür unter Linux nicht, Chromium nimmt sie aus Startoption und Umgebung.
  const launchOptions = {
    args: ['--lang=de-DE'],
    env: { ...process.env, LANG: 'de_DE.UTF-8', LANGUAGE: 'de', LC_ALL: 'de_DE.UTF-8' },
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  }
  const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy
  const proxy = proxyUrl ? { server: proxyUrl, bypass: 'localhost,127.0.0.1' } : undefined

  /**
   * Geräteprofil der Aufnahmen: iPhone-Format, dreifache Pixeldichte. Auch auf
   * dem Desktop zeigt die Website Handy-Aufnahmen — Desktop-Aufnahmen wären
   * im Browserrahmen zu klein, um sie zu lesen.
   */
  const device = {
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    permissions: ['geolocation'],
    geolocation: { latitude: LAT, longitude: LON },
    ignoreHTTPSErrors: true,
    ...(proxy ? { proxy } : {}),
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  }

  const browser = await chromium.launch(launchOptions)

  /** Aktuelle ADS-B-Antwort; mit `setAdsb` während einer Aufnahme änderbar. */
  let adsbAircraft = ADSB_TRAFFIC

  /**
   * Neuer Browser-Kontext mit vorbefülltem localStorage.
   * `storage` ist ein Objekt Schlüssel → String (siehe seed.mjs); `null` für
   * einen leeren Speicher (frisch installierte App).
   *
   * `reseed: 'always'` schreibt den Speicher bei jedem Seitenaufruf neu (jede
   * Aufnahme startet vom selben Stand). `'once'` nur beim ersten Aufruf je
   * Tab — dann bleiben Eingaben über Navigationen hinweg erhalten.
   */
  async function makeContext({ colorScheme = 'light', storage = null, reseed = 'always' } = {}) {
    const ctx = await browser.newContext({ ...device, colorScheme })
    await ctx.addInitScript(
      ([store, theme, mode]) => {
        if (mode === 'once') {
          if (sessionStorage.getItem('__seeded')) return
          sessionStorage.setItem('__seeded', '1')
        }
        if (store) for (const [k, v] of Object.entries(store)) localStorage.setItem(k, v)
        localStorage.setItem('theme', theme)
      },
      [storage, colorScheme, reseed],
    )
    // Das TanStack-Devtools-Symbol (nur im Dev-Server) taucht nach clean()
    // wieder auf. Per CSS ausgeblendet, statt es zu löschen — Dialoge und
    // Bottom-Sheets hängen ebenfalls direkt am <body> und müssen bleiben.
    await ctx.addInitScript(() => {
      const style = document.createElement('style')
      style.textContent = '[data-testid="tanstack_devtools"], [data-tsd-control] { display: none !important; }'
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style))
    })
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

  /** Entfernt das TanStack-Devtools-Overlay aus dem Bild (alles neben #root). */
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

  /** Klappt einen Abschnitt über seine Überschrift auf (oder zu). */
  async function expand(pg, text) {
    const heading = pg.getByText(text, { exact: true }).first()
    if (!(await heading.count())) {
      console.log('    (Abschnitt nicht gefunden:', text, ')')
      return
    }
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

  /** Aufnahme des sichtbaren Bildschirms. */
  async function shot(pg, name) {
    await pg.waitForTimeout(250)
    await pg.screenshot({ path: path.join(out, `${name}.png`) })
    console.log('  ->', name)
  }

  /**
   * Aufnahme nur eines Elements (z. B. eines aufgeklappten Abschnitts).
   * `locator` ist ein Playwright-Locator; `pad` gibt Rand in CSS-Pixeln.
   */
  async function crop(pg, locator, name, pad = 8) {
    if (!(await locator.count())) {
      console.log('    (Element für', name, 'nicht gefunden)')
      return
    }
    // Die klebende Kopfleiste würde sonst mitten in hohen Ausschnitten liegen.
    const unstick = await pg.addStyleTag({ content: '.sticky { position: static !important; }' })
    await locator.first().scrollIntoViewIfNeeded().catch(() => {})
    await pg.waitForTimeout(400)
    const box = await locator.first().boundingBox({ timeout: 5000 }).catch(() => null)
    if (!box) {
      await unstick.evaluate((el) => el.remove())
      console.log('    (Element für', name, 'nicht gefunden)')
      return
    }
    const vp = pg.viewportSize()
    // Seitenkoordinaten: fullPage erlaubt auch Elemente, die höher als der Bildschirm sind.
    const scrollY = await pg.evaluate(() => window.scrollY)
    const clip = {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y + scrollY - pad),
      width: Math.min(vp.width, box.width + 2 * pad),
      height: box.height + 2 * pad,
    }
    await pg.waitForTimeout(250)
    await pg.screenshot({ path: path.join(out, `${name}.png`), clip, fullPage: true })
    await unstick.evaluate((el) => el.remove())
    console.log('  ->', name, '(Ausschnitt)')
  }

  function setAdsb(list) {
    adsbAircraft = list
  }

  async function close() {
    await browser.close()
  }

  return { browser, makeContext, clean, go, waitForWeather, expand, scrollTo, shot, crop, setAdsb, close }
}
