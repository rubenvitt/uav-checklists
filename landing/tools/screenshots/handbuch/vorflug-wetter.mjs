/**
 * Aufnahmen für Kapitel 04 „Vorflugkontrolle: Rahmenangaben und Wetter".
 *
 * Zwei Durchgänge:
 * 1. Echtes Wetter am Beispiel-Einsatzort (wie die Startseite): Aufbau der
 *    Phase, Rahmenangaben, Gesamturteil, METAR, Sonnenzeiten, Wind nach Höhe,
 *    Stundenvorhersage.
 * 2. Ein fest hinterlegtes Sturm-Beispiel (Wetter-, DWD- und K-Index-Daten
 *    direkt in den Speicher geschrieben, so wie die App sie selbst ablegt),
 *    damit Warnstufen, amtliche Warnung, DWD-Abweichung, Empfehlungen und die
 *    „Empfehlung gegen Freigabe" reproduzierbar ins Bild kommen.
 */

const LAT = 52.3906
const LON = 9.6979

/** Ortszeit Europe/Berlin als „JJJJ-MM-TTTHH:00" (so liefert Open-Meteo die Stunden). */
function berlinHour(date) {
  const s = date.toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }) // 2026-10-18 14:05:12
  return `${s.slice(0, 10)}T${s.slice(11, 13)}:00`
}

const lerp = (a, b, t) => a + (b - a) * t

/** Wind nach Höhe wie in src/services/weatherApi.ts (Stützstellen 10/80/120/180 m, Böen hochskaliert). */
function windByAltitude(maxAltitude, anchorsIn, gusts10) {
  const gustAt = (alt) => gusts10 * lerp(1.0, 1.5, Math.min(alt, 180) / 180)
  const anchors = anchorsIn.map((a) => ({ ...a, gusts: gustAt(a.altitude) }))
  const steps = [10]
  const interval = maxAltitude <= 50 ? 10 : 30
  for (let alt = interval === 10 ? 20 : 30; alt <= maxAltitude; alt += interval) if (alt !== 10) steps.push(alt)
  if (steps[steps.length - 1] !== maxAltitude) steps.push(maxAltitude)
  steps.push(maxAltitude + interval)
  return steps.map((alt) => {
    if (alt <= anchors[0].altitude) return { altitude: alt, windSpeed: anchors[0].speed, windGusts: anchors[0].gusts, windDirection: anchors[0].direction }
    for (let i = 0; i < anchors.length - 1; i++) {
      const lo = anchors[i]
      const hi = anchors[i + 1]
      if (alt >= lo.altitude && alt <= hi.altitude) {
        const t = (alt - lo.altitude) / (hi.altitude - lo.altitude)
        return { altitude: alt, windSpeed: lerp(lo.speed, hi.speed, t), windGusts: lerp(lo.gusts, hi.gusts, t), windDirection: lerp(lo.direction, hi.direction, t) }
      }
    }
    const a = anchors[anchors.length - 1]
    return { altitude: alt, windSpeed: a.speed, windGusts: a.gusts, windDirection: a.direction }
  })
}

const COORDS = `${Math.round(LAT * 1000) / 1000},${Math.round(LON * 1000) / 1000}`
const METAR_EDDV = { icao: 'EDDV', name: 'Hannover Airport', latitude: 52.466, longitude: 9.68, distanceMeters: 8460, status: 'good' }

/** Stündliche Vorhersage ab zwei Stunden vor jetzt; `at(t)` liefert die Werte für t = 0 (jetzt) … 1 (in 12 h). */
function hourlySeries(now, at) {
  const out = []
  const start = new Date(now - 2 * 3600e3)
  for (let i = 0; i < 34; i++) {
    const t = Math.min(1.4, Math.max(0, (i - 2) / 12))
    out.push({ time: berlinHour(new Date(start.getTime() + i * 3600e3)), ...at(t, i) })
  }
  return out
}

/**
 * Beispiel-Einsatz mit fest hinterlegten Umweltdaten. Die App lädt Wetter,
 * DWD und K-Index je Abschnitt nur einmal und legt sie im Gerät ab; liegen
 * sie für Standort und Flughöhe schon vor, ruft sie nichts neu ab.
 */
function withEnvironment(seed, now, { weather, dwd, kIndex, undecided = false }) {
  const s = seed.buildStorage(now)
  const { MID, SEG } = seed
  const put = (k, v) => { s[`uav-form:${MID}:${k}`] = JSON.stringify({ value: v, timestamp: now }) }
  const seg = (k, v) => put(`seg:${SEG}:${k}`, v)
  if (undecided) {
    // Noch keine Flugentscheidung — dann zeigt „Erster Aufstieg & Freigabe" die Buttons
    delete s[`uav-form:${MID}:seg:${SEG}:flugfreigabe`]
    delete s[`uav-form:${MID}:seg:${SEG}:flugentscheidung`]
  }
  seg('env:weather', weather)
  seg('env:weather:alt', 120)
  seg('env:weather:coords', COORDS)
  seg('env:dwd', dwd)
  seg('env:dwd:coords', COORDS)
  put('env:kindex', { kIndex, timestamp: new Date(now - 90 * 60e3).toISOString() })
  return s
}

function lastHalfHour(now) {
  const d = new Date(now - 20 * 60e3)
  d.setMinutes(d.getMinutes() >= 30 ? 30 : 0, 0, 0)
  return d.toISOString()
}

/** Ruhiger Herbsttag: am Boden schwach, in 120 m spürbar mehr Wind; abends Schauer. */
function calmScenario(seed, now) {
  const weather = {
    current: {
      temperature: 13.2, windSpeed: 12, windGusts: 26, humidity: 62, precipitation: 0,
      precipitationProbability: 0, visibility: 25000, pressure: 1018, dewPoint: 6.1, cloudCover: 40, windDirection: 250,
    },
    sun: { sunrise: '07:51', sunset: '18:20' },
    windByAltitude: windByAltitude(120, [
      { altitude: 10, speed: 12, direction: 245 },
      { altitude: 80, speed: 24, direction: 258 },
      { altitude: 120, speed: 31, direction: 264 },
      { altitude: 180, speed: 35, direction: 270 },
    ], 26),
    hourlyForecast: hourlySeries(now, (t) => {
      const temperature = 13.2 + 1.5 * Math.sin(Math.min(t, 1) * Math.PI) - (t > 0.6 ? (t - 0.6) * 9 : 0)
      return {
        temperature,
        windSpeed: 12 + 8 * Math.min(t, 1),
        windGusts: 26 + 12 * Math.min(t, 1),
        humidity: 62 + 26 * Math.max(0, t - 0.4),
        precipitationProbability: Math.round(t < 0.3 ? 0 : (t - 0.3) * 60),
        visibility: 25000 - 12000 * Math.max(0, t - 0.5),
        pressure: 1018 - 6 * t,
        dewPoint: temperature - Math.max(1.5, 7.1 - 6 * t),
        weatherCode: t < 0.3 ? 2 : t < 0.6 ? 3 : 80,
      }
    }),
    metarStation: METAR_EDDV,
    elevation: 52,
  }
  const dwd = {
    covered: true,
    observation: {
      timestamp: lastHalfHour(now),
      temperature: 12.8, windSpeed: 10.4, windGusts: 24.1, windDirection: 250, humidity: 64, dewPoint: 6.2,
      visibility: 30000, pressureMsl: 1024, precipitation: 0, cloudCover: 50,
      station: { name: 'Hannover', distanceMeters: 8400, observationType: 'synop' },
    },
    alerts: [],
    warnCellName: 'Stadt Hannover',
  }
  return withEnvironment(seed, now, { weather, dwd, kIndex: 2 })
}

/** Sturmtief zieht durch: jetzt kritisch, über den Tag Besserung. */
function stormScenario(seed, now) {
  const weather = {
    current: {
      temperature: 9.4, windSpeed: 35, windGusts: 62, humidity: 78, precipitation: 0.4,
      precipitationProbability: 70, visibility: 6000, pressure: 991, dewPoint: 6.0, cloudCover: 100, windDirection: 240,
    },
    sun: { sunrise: '07:51', sunset: '18:20' },
    windByAltitude: windByAltitude(120, [
      { altitude: 10, speed: 35, direction: 235 },
      { altitude: 80, speed: 44, direction: 242 },
      { altitude: 120, speed: 48, direction: 246 },
      { altitude: 180, speed: 52, direction: 250 },
    ], 62),
    hourlyForecast: hourlySeries(now, (t) => {
      const u = Math.min(t, 1)
      const temperature = lerp(9.4, 11.5, u) - (t > 1 ? (t - 1) * 6 : 0)
      return {
        temperature,
        windSpeed: lerp(35, 14, u),
        windGusts: lerp(62, 26, u),
        humidity: lerp(78, 70, u),
        precipitationProbability: Math.round(lerp(70, 5, u)),
        visibility: lerp(6000, 20000, u),
        pressure: lerp(991, 1004, u),
        dewPoint: temperature - lerp(3.4, 5.5, u),
        weatherCode: u < 0.35 ? 63 : u < 0.7 ? 80 : 3,
      }
    }),
    metarStation: METAR_EDDV,
    elevation: 52,
  }
  const iso = (mins) => new Date(now + mins * 60e3).toISOString()
  const dwd = {
    covered: true,
    observation: {
      timestamp: lastHalfHour(now),
      temperature: 9.1, windSpeed: 38, windGusts: 71, windDirection: 240, humidity: 88, dewPoint: 7.3,
      visibility: 3500, pressureMsl: 993, precipitation: 1.2, cloudCover: 100,
      station: { name: 'Hannover', distanceMeters: 8400, observationType: 'synop' },
    },
    alerts: [
      {
        id: 'beispiel-1',
        severity: 'severe',
        event: 'SCHWERE STURMBÖEN',
        headline: 'Amtliche UNWETTERWARNUNG vor SCHWEREN STURMBÖEN',
        description: 'Es treten schwere Sturmböen mit Geschwindigkeiten um 90 km/h aus südwestlicher Richtung auf.',
        instruction: null,
        onset: iso(-60),
        expires: iso(300),
      },
    ],
    warnCellName: 'Stadt Hannover',
  }
  return withEnvironment(seed, now, { weather, dwd, kIndex: 5, undecided: true })
}

async function collapseAll(page) {
  for (let i = 0; i < 20; i++) {
    const open = page.locator('section > button[aria-expanded="true"]')
    if (!(await open.count())) break
    await open.first().click()
    await page.waitForTimeout(250)
  }
}

/** Abschnitt per Überschrift aufklappen (falls zu). */
async function openSection(page, title) {
  const btn = page.locator('section > button', { hasText: title }).first()
  if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click()
  await page.waitForTimeout(800)
}

/** Kasten innerhalb des Wetter-Abschnitts, der eine bestimmte Überschrift trägt. */
function weatherBox(page, title) {
  return page
    .locator('section', { hasText: 'Wetterbedingungen' })
    .locator('div.rounded-xl, div.border', { has: page.getByText(title, { exact: true }) })
    .last()
}

/** Scrollt das Element `offset` CSS-Pixel unter den oberen Rand (unter die dunkle Kopfleiste). */
async function place(page, locator, offset = 140) {
  const el = locator.first()
  await el.evaluate((node, o) => {
    window.scrollTo(0, Math.max(0, node.getBoundingClientRect().top + window.scrollY - o))
  }, offset)
  await page.waitForTimeout(500)
}

/**
 * Kopfleiste vorübergehend aus dem „Kleben" lösen: Bei Ausschnitten über die
 * ganze Seite legt sie sich sonst mitten ins Bild.
 */
async function setHeaderSticky(page, sticky) {
  await page.evaluate((on) => {
    const bar = document.querySelector('div.sticky.top-0')
    if (bar) bar.style.position = on ? '' : 'relative'
  }, sticky)
}

export default async function ({ makeContext, go, shot, crop: rawCrop, waitForWeather, setAdsb, seed }) {
  const route = `/mission/${seed.MID}/vorflugkontrolle`
  const crop = async (page, locator, name, pad) => {
    await setHeaderSticky(page, false)
    await rawCrop(page, locator, name, pad)
    await setHeaderSticky(page, true)
  }
  const boxShot = async (page, title, name) => {
    const box = weatherBox(page, title)
    await place(page, box)
    await crop(page, box, name)
  }
  setAdsb([]) // kein Tiefflieger → Flugverkehr klappt nicht von selbst auf

  // ── Durchgang 1: ruhiger Tag ───────────────────────────────
  {
    const ctx = await makeContext({ storage: calmScenario(seed, Date.now()) })
    const page = await ctx.newPage()
    await go(page, route, 4000)
    await waitForWeather(page)
    await page.waitForTimeout(800)

    // Aufbau der Phase: alle Abschnitte zugeklappt
    await collapseAll(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(600)
    await crop(page, page.locator('div.mx-auto.max-w-3xl.space-y-4').first(), 'vorflug-wetter-aufbau', 0)

    // Rahmenangaben mit zwei Nutzlasten
    for (const name of ['Zenmuse H30T', 'Zenmuse S1']) {
      await page.locator('button', { hasText: name }).first().click()
      await page.waitForTimeout(300)
    }
    const rahmen = page.locator('div.divide-y', { has: page.locator('#drone-select') }).first()
    await place(page, rahmen)
    await crop(page, rahmen, 'vorflug-wetter-rahmenangaben')

    // Wetter: Kopf, Gesamturteil und Kacheln
    await openSection(page, 'Wetterbedingungen')
    await place(page, page.locator('section > button', { hasText: 'Wetterbedingungen' }), 44)
    await shot(page, 'vorflug-wetter-bewertung')

    const sun = page
      .locator('div.flex.gap-3', { has: page.getByText('Sonnenaufgang', { exact: true }) })
      .filter({ has: page.getByText('Sonnenuntergang', { exact: true }) })
      .last()
    await place(page, sun)
    await crop(page, sun, 'vorflug-wetter-sonnenzeiten')
    await boxShot(page, 'Wind nach Höhe', 'vorflug-wetter-hoehenwind')
    // Vorhersage seitlich weitergewischt: am Abend ziehen Schauer auf
    await page.locator('section', { hasText: 'Wetterbedingungen' }).locator('div.overflow-x-auto').first().evaluate((el) => {
      const cols = el.querySelectorAll('thead th')
      const first = cols[1]
      const target = cols[6]
      if (first && target) el.scrollLeft = target.offsetLeft - first.offsetLeft
    })
    await page.waitForTimeout(400)
    await boxShot(page, '24-Stunden-Vorhersage', 'vorflug-wetter-vorhersage')
    await ctx.close()
  }

  // ── Durchgang 2: Sturm-Beispiel ────────────────────────────
  {
    const ctx = await makeContext({ storage: stormScenario(seed, Date.now()) })
    const page = await ctx.newPage()
    await go(page, route, 4000)
    await waitForWeather(page)
    await page.waitForTimeout(800)
    await openSection(page, 'Wetterbedingungen')
    await place(page, page.locator('section > button', { hasText: 'Wetterbedingungen' }), 44)
    await shot(page, 'vorflug-wetter-warnung')
    await boxShot(page, 'DWD-Abgleich', 'vorflug-wetter-dwd')
    await boxShot(page, 'Empfehlungen', 'vorflug-wetter-empfehlungen')

    // Erster Aufstieg & Freigabe: Empfehlung gegen Freigabe
    await openSection(page, 'Erster Aufstieg & Freigabe')
    const box = page.locator('div.grid', { has: page.getByText('Empfehlung gegen Freigabe') }).first()
    await place(page, box)
    await crop(page, box, 'vorflug-wetter-empfehlung-gegen-freigabe')
    await ctx.close()
  }
}
