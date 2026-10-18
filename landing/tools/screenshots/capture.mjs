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
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildStorage, MID } from './seed.mjs'
import { createSession, ADSB_TRAFFIC, ADSB_NEWCOMER } from './lib.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = process.env.OUT ?? path.resolve(here, '../../public/screenshots')
const STORE = buildStorage(Date.now())

const { makeContext: newContext, go, waitForWeather, expand, scrollTo, shot, setAdsb, close } = await createSession({ out: OUT })
const makeContext = (colorScheme) => newContext({ colorScheme, storage: STORE })

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
  await scrollTo(page, 'Ereignisse', 520)
  await shot(page, 'flugbuch')
  const procedures = page.locator('button', { hasText: 'Prozeduren' }).first()
  if (await procedures.count()) {
    await procedures.click()
    await page.waitForTimeout(1800)
    await shot(page, 'prozeduren')
  }

  console.log('* Luftraumüberwachung')
  await go(page, `/mission/${MID}/fluege`, 3000)
  setAdsb([...ADSB_TRAFFIC, ADSB_NEWCOMER])
  await page.getByTitle('Jetzt aktualisieren').first().click()
  await page.getByText('als Ereignis protokolliert').first().waitFor({ timeout: 10000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  await shot(page, 'luftraum')
  setAdsb(ADSB_TRAFFIC)

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

await close()
console.log('fertig — jetzt tools/screenshots/optimize.mjs ausführen')
