/**
 * Aufnahmen für Kapitel 07 „Vorflugkontrolle: Kontrollen und Flugfreigabe".
 *
 * Abgewandelter Seed: Der Einsatz steht in der Vorflugkontrolle, eine
 * Flugentscheidung gibt es noch nicht. Aufstiegsort und Flugbriefing sind
 * teilweise abgehakt, die UAV-Kontrolle ist durch, aber mit einem Mangel
 * (Rotoren), die Funktionskontrolle hat erst einen von drei Punkten.
 * Danach wird in der Seite geklickt: Funktionskontrolle vervollständigen,
 * Flug freigeben, Freigabe widerrufen, Flug nicht freigeben.
 */
import { OVERPASS } from '../lib.mjs'

export default async function ({ makeContext, go, crop, waitForWeather, seed }) {
  const { buildStorage, MID, SEG } = seed
  const now = Date.now()
  const s = buildStorage(now)

  const key = (k) => `uav-form:${MID}:${k}`
  const segKey = (k) => key(`seg:${SEG}:${k}`)
  const put = (k, v) => { s[k] = JSON.stringify({ value: v, timestamp: now }) }

  // Einsatz zurück in die Vorflugkontrolle, keine Entscheidung, keine Flüge
  const missions = JSON.parse(s['uav-missions'])
  for (const m of missions) if (m.id === MID) m.phase = 'vorflugkontrolle'
  s['uav-missions'] = JSON.stringify(missions)
  delete s[segKey('flugfreigabe')]
  delete s[segKey('flugentscheidung')]
  delete s[key('flightlog:entries')]
  delete s[key('flightlog:events')]
  delete s[key('fluegeAbgeschlossen')]
  delete s[key('postflight:checked')]
  delete s[key('postflight:remarks')]
  delete s[key('result:outcome')]
  delete s[key('wrapup:checked')]
  delete s[key('wrapup:feedback')]
  delete s[key('disruptions:none')]

  // Aufstiegsort: 3 von 6 positiv
  put(segKey('techcheck:aufstiegsort'), { flaeche: 'positive', homepoint: 'positive', hindernisse: 'positive' })
  // UAV: alles beantwortet, Rotoren negativ (Mangel)
  put(key('techcheck:uav'), {
    gehaeuse: 'positive', klappmechanismus: 'positive', schrauben: 'positive', rotoren: 'negative', anbauteile: 'positive',
    rotorlauf: 'positive', beleuchtung: 'positive', kabel: 'positive', akkus: 'positive', sensoren: 'positive',
  })
  // Flugbriefing: 9 von 16
  put(segKey('flugbriefing:checked'), Object.fromEntries(
    ['aufgaben', 'landeplatz', 'notfallplan', 'fluggebiete', 'notam', 'geozonen', 'wetter', 'stoerquellen', 'kommunikation'].map((k) => [k, 'positive']),
  ))
  // Funktionskontrolle: 1 von 3
  put(segKey('techcheck:funktionstest'), { flugfunktionen: true })

  const ctx = await makeContext({ storage: s, reseed: 'once' })
  const page = await ctx.newPage()

  /** Paneel eines Abschnitts über seinen genauen Titel. */
  const section = (title) =>
    page.locator('section').filter({ has: page.locator(`xpath=./button/span[normalize-space(.)="${title}"]`) }).first()

  async function setOpen(title, wantOpen = true) {
    const btn = section(title).locator('xpath=./button')
    const isOpen = (await btn.getAttribute('aria-expanded')) === 'true'
    if (isOpen !== wantOpen) {
      await btn.scrollIntoViewIfNeeded()
      await btn.click()
      await page.waitForTimeout(500)
    }
  }

  async function closeAllExcept(keep) {
    const titles = await page.locator('section > button > span.flex-1').allInnerTexts()
    for (const t of titles) {
      const title = t.replace(/\s+/g, ' ').trim()
      if (!keep.includes(title)) await setOpen(title, false).catch(() => {})
    }
    for (const title of keep) await setOpen(title, true)
  }

  const stepper = page.locator('nav[aria-label="Einsatzphasen"]')

  await go(page, `/mission/${MID}/vorflugkontrolle`, 5000)
  await waitForWeather(page)
  await page.waitForTimeout(1500)

  // Phasenleiste vor der Entscheidung
  await page.evaluate(() => window.scrollTo(0, 0))
  await crop(page, stepper, 'vorflug-freigabe-phasen-gesperrt', 0)

  // Aufstiegsort (teilweise)
  await closeAllExcept(['Aufstiegsort'])
  await crop(page, section('Aufstiegsort'), 'vorflug-freigabe-aufstiegsort')

  // UAV mit Mangel
  await closeAllExcept(['UAV'])
  await crop(page, section('UAV'), 'vorflug-freigabe-uav-mangel')

  // Kopfleiste nicht über hohe Ausschnitte legen
  await page.addStyleTag({ content: 'header, .sticky { position: static !important; }' })

  // Flugbriefing (teilweise)
  await closeAllExcept(['Flugbriefing'])
  await crop(page, section('Flugbriefing'), 'vorflug-freigabe-briefing')

  // Erster Aufstieg & Freigabe: 1/3, Freigabe gesperrt
  await closeAllExcept(['Erster Aufstieg & Freigabe'])
  const freigabe = section('Erster Aufstieg & Freigabe')
  await crop(page, freigabe, 'vorflug-freigabe-vorher')

  // Restliche Punkte abhaken -> Bereit (das Bild dazu kommt aus dem zweiten Durchlauf)
  await freigabe.getByText('Beleuchtung funktioniert', { exact: true }).click()
  await freigabe.getByText('Bildübertragung funktioniert', { exact: true }).click()
  await page.waitForTimeout(500)

  // Flug freigeben
  await freigabe.getByRole('button', { name: 'Flug freigeben' }).click()
  await page.waitForTimeout(800)
  await crop(page, freigabe, 'vorflug-freigabe-erteilt')
  await page.evaluate(() => window.scrollTo(0, 0))
  await crop(page, stepper, 'vorflug-freigabe-phasen-frei', 0)

  // Widerrufen und ablehnen
  await freigabe.getByRole('button', { name: 'Freigabe widerrufen' }).click()
  await page.waitForTimeout(500)
  await freigabe.getByRole('button', { name: 'Flug nicht freigeben' }).click()
  await page.waitForTimeout(800)
  await crop(page, freigabe, 'vorflug-freigabe-abgelehnt')
  await page.evaluate(() => window.scrollTo(0, 0))
  await crop(page, stepper, 'vorflug-freigabe-phasen-abgelehnt', 0)

  await ctx.close()

  // Zweiter Durchlauf: Hubschrauberlandeplatz in der Umgebung -> Empfehlung gegen Freigabe
  put(segKey('techcheck:funktionstest'), { flugfunktionen: true, beleuchtung: true, bilduebertragung: true })
  const ctx2 = await makeContext({ storage: s, reseed: 'once' })
  const withHelipad = {
    elements: [
      ...OVERPASS.elements,
      { type: 'node', lat: 52.3849, lon: 9.6911, tags: { aeroway: 'helipad', name: 'Hubschrauberlandeplatz Klinikum Nordstadt' } },
    ],
  }
  await ctx2.route('https://**/api/interpreter*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(withHelipad) }),
  )
  const page2 = await ctx2.newPage()
  await go(page2, `/mission/${MID}/vorflugkontrolle`, 5000)
  await page2.getByText('Wetterdaten werden geladen').first().waitFor({ state: 'hidden', timeout: 45000 })
  const sec2 = page2.locator('section').filter({ has: page2.locator('xpath=./button/span[normalize-space(.)="Erster Aufstieg & Freigabe"]') }).first()
  const btn2 = sec2.locator('xpath=./button')
  if ((await btn2.getAttribute('aria-expanded')) !== 'true') await btn2.click()
  await page2.waitForTimeout(500)
  await page2.getByText('Empfehlung gegen Freigabe').first().waitFor({ timeout: 30000 }).catch(() => console.log('    (keine Empfehlung erschienen)'))
  await page2.waitForTimeout(800)
  await crop(page2, sec2, 'vorflug-freigabe-empfehlung')
  await ctx2.close()
}
