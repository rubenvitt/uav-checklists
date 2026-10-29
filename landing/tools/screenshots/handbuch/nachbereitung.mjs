/**
 * Aufnahmen für Kapitel 09 „Nachbereitung“.
 *
 * Der Beispiel-Einsatz wird für die Nachbereitung abgewandelt: Ein Akku ist bei
 * der Nachflugkontrolle negativ aufgefallen (mit Bemerkung), es sind zwei
 * Störungsbereiche gemeldet (Luftverkehr, Technik), eine eigene Wartungsaufgabe
 * steht auf der Liste, und die Unterschriften fehlen noch. Im Lauf der Aufnahmen
 * wird eine Unterschrift gezeichnet und eine getippt; daraus entsteht das PDF,
 * dessen Seiten zusätzlich als Bild abgelegt werden (braucht `pdftoppm` aus
 * poppler-utils; fehlt es, werden nur diese Bilder übersprungen).
 *
 * Teil 10 erzeugt den Bericht eines mit Suchlage verknüpften Einsatzes
 * (Suchlage nachgebildet, siehe suchlage.mjs; braucht `pnpm dev --mode
 * handbuch`): Einsatzkarte aus Suchlage und Flugtagebuch mit Suchlage-Werten.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildSuchlage, linkFlightLog, linkStorage, loginStorage, routeSuchlage } from '../suchlage.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
// Gleiches Zwischenverzeichnis wie handbuch.mjs — PNGs darin werden danach in WebP umgewandelt.
const OUT = process.env.OUT ?? path.resolve(here, '../../../public/screenshots/handbuch')
const TMP = path.join(OUT, '.tmp-nachbereitung')

export default async function ({ makeContext, go, shot, crop, expand, scrollTo, seed }) {
  const { buildStorage, MID, MID2 } = seed

  function storage() {
    const now = Date.now()
    const s = buildStorage(now)
    const put = (k, v) => { s[`uav-form:${MID}:${k}`] = JSON.stringify({ value: v, timestamp: now }) }
    const del = (k) => { delete s[`uav-form:${MID}:${k}`] }

    // Seed steht in Phase „Flüge“ — für diese Aufnahmen in der Nachbereitung.
    const missions = JSON.parse(s['uav-missions'])
    for (const m of missions) if (m.id === MID) m.phase = 'nachbereitung'
    s['uav-missions'] = JSON.stringify(missions)

    put('postflight:checked', Object.fromEntries(
      ['motoren', 'uav_beschaedigung', 'ueberwarmung', 'akkus', 'rotoren', 'payload', 'fernbedienung', 'kabel']
        .map((k) => [k, k === 'akkus' ? 'negative' : 'positive']),
    ))
    put('postflight:notes', { akkus: 'Akku Nr. 3 leicht aufgebläht — ausgesondert, nicht mehr laden' })
    put('postflight:remarks', 'Akkutemperatur nach dem dritten Flug erhöht. Übrige Technik ohne Befund.')

    put('disruptions:none', false)
    put('disruptions:categories', ['luftverkehr', 'technik'])
    put('disruptions:notes', {
      luftverkehr: 'Rettungshubschrauber im Tiefflug, UAV auf 30 m abgesunken, Flug 2 kurz unterbrochen.',
      technik: 'Akku Nr. 3 nach Flug 3 aufgebläht (siehe Nachflugkontrolle).',
    })
    put('followup:custom', [{ id: 'custom_1', label: 'Ersatzakku über die Materialverwaltung anfordern', isCustom: true }])

    del('result:outcome')
    for (const k of ['signature:fk', 'signature:el', 'signature:fk:mode', 'signature:el:mode', 'signature:fk:typed', 'signature:el:typed']) del(k)
    return s
  }

  const section = (page, title) =>
    page.locator('section', { has: page.getByText(title, { exact: true }) }).first()

  /** Aufnahme eines Bereichs von der Oberkante von `top` bis zur Unterkante von `bottom`. */
  async function cropBetween(page, top, bottom, name, pad = 8) {
    await top.first().scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(400)
    const a = await top.first().boundingBox()
    const b = await bottom.first().boundingBox()
    if (!a || !b) {
      console.log('    (Bereich für', name, 'nicht gefunden)')
      return
    }
    const scrollY = await page.evaluate(() => window.scrollY)
    const vp = page.viewportSize()
    const x = Math.max(0, Math.min(a.x, b.x) - pad)
    const clip = {
      x,
      y: Math.max(0, a.y + scrollY - pad),
      width: Math.min(vp.width - x, Math.max(a.x + a.width, b.x + b.width) - x + pad),
      height: b.y + b.height - a.y + 2 * pad,
    }
    await page.screenshot({ path: path.join(TMP, `${name}.png`), clip, fullPage: true })
    console.log('  ->', name, '(Bereich)')
  }

  /**
   * Holt das PDF aus der offenen Dokument-Vorschau und legt ausgewählte Seiten
   * als Bild ab. `pick(pdf, pages, pageText)` liefert Seitenindex → Bildname
   * (Objekt) oder Paare `[index, name]`, wenn eine Seite mehrere Bilder ergibt.
   */
  async function capturePdf(page, pick) {
    const src = await page.locator('iframe[title="PDF-Vorschau"]').getAttribute('src').catch(() => null)
    if (!src) {
      console.log('    (keine PDF-Vorschau)')
      return
    }
    const b64 = await page.evaluate(async (u) => {
      const buf = new Uint8Array(await (await fetch(u)).arrayBuffer())
      let s = ''
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
      return btoa(s)
    }, src)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flugmappe-pdf-'))
    const pdf = path.join(dir, 'bericht.pdf')
    fs.writeFileSync(pdf, Buffer.from(b64, 'base64'))
    try {
      execFileSync('pdftoppm', ['-png', '-r', '110', pdf, path.join(dir, 'seite')])
      const pages = fs.readdirSync(dir).filter((f) => f.startsWith('seite') && f.endsWith('.png')).sort()
      console.log('    PDF:', pages.length, 'Seiten')
      const pageText = (i) => execFileSync('pdftotext', ['-f', String(i + 1), '-l', String(i + 1), pdf, '-']).toString()
      const picked = pick(pdf, pages, pageText)
      for (const [i, name] of Array.isArray(picked) ? picked : Object.entries(picked)) {
        fs.copyFileSync(path.join(dir, pages[i]), path.join(TMP, `${name}.png`))
        console.log('  ->', name, '(PDF-Seite', Number(i) + 1, ')')
      }
    } catch (err) {
      console.log('    (PDF-Seiten übersprungen:', err.message, ')')
    }
    fs.rmSync(dir, { recursive: true, force: true })
  }

  const ctx = await makeContext({ storage: storage(), reseed: 'once' })
  const page = await ctx.newPage()
  await go(page, `/mission/${MID}/nachbereitung`, 3500)
  // Kopfleiste nicht mitlaufen lassen — sonst liegt sie über den Ausschnitten
  const unstick = (pg) => pg.evaluate(() => {
    for (const el of document.querySelectorAll('.sticky')) el.style.position = 'static'
  })
  await unstick(page)

  // Alle Abschnitte zu → Überblick über die Phase
  for (const title of ['Nachflugkontrolle', 'Störungen & Vorfälle', 'Einsatzabschluss', 'Wartung & Pflege', 'Ergebnis']) {
    const sec = section(page, title)
    if (await sec.locator('> div:not(.hidden)').count()) await expand(page, title)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
  await shot(page, 'nachbereitung-ueberblick')

  // 1) Nachflugkontrolle mit negativ bewertetem Akku und offener Bemerkung
  await expand(page, 'Nachflugkontrolle')
  await page.locator('button[title="Bemerkung hinzufügen"]').nth(3).click()
  await page.waitForTimeout(400)
  await page.locator('textarea').first().blur()
  await crop(page, section(page, 'Nachflugkontrolle'), 'nachbereitung-nachflugkontrolle')
  await expand(page, 'Nachflugkontrolle')

  // 2) Störungen & Vorfälle mit Hinweisen aus dem Flugbetrieb
  await expand(page, 'Störungen & Vorfälle')
  await crop(page, section(page, 'Störungen & Vorfälle'), 'nachbereitung-stoerungen')
  await expand(page, 'Störungen & Vorfälle')

  // 3) Einsatzabschluss: Checkliste (bis Feedback)
  await expand(page, 'Einsatzabschluss')
  const abschluss = section(page, 'Einsatzabschluss')
  await cropBetween(page, abschluss.locator('> button').first(), abschluss.getByText('Team-Feedback / Nachbesprechung').locator('xpath=../..'), 'nachbereitung-einsatzabschluss')

  // 4) Unterschriften: Führungskraft zeichnet, Einsatzleitung tippt
  const pad = abschluss.locator('canvas').first()
  await pad.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  const box = await pad.boundingBox()
  if (box) {
    // Handschriftliches „R. Vitt“ aus einzelnen Zügen (Koordinaten relativ zum Feld)
    const strokes = [
      [[0.14, 0.78], [0.15, 0.5], [0.16, 0.24], [0.22, 0.2], [0.27, 0.27], [0.26, 0.38], [0.2, 0.46], [0.16, 0.48], [0.22, 0.6], [0.3, 0.78]],
      [[0.335, 0.77], [0.34, 0.78]],
      [[0.4, 0.28], [0.44, 0.55], [0.47, 0.78], [0.51, 0.52], [0.56, 0.26]],
      [[0.57, 0.52], [0.585, 0.78], [0.61, 0.6]],
      [[0.65, 0.24], [0.655, 0.55], [0.67, 0.78], [0.7, 0.62]],
      [[0.73, 0.24], [0.735, 0.55], [0.75, 0.78], [0.8, 0.6], [0.88, 0.5]],
      [[0.62, 0.42], [0.7, 0.4], [0.79, 0.38]],
      [[0.11, 0.88], [0.4, 0.86], [0.7, 0.87], [0.86, 0.84]],
    ]
    for (const stroke of strokes) {
      const at = ([px, py]) => [box.x + px * box.width, box.y + py * box.height]
      await page.mouse.move(...at(stroke[0]))
      await page.mouse.down()
      for (const p of stroke.slice(1)) await page.mouse.move(...at(p), { steps: 6 })
      await page.mouse.up()
      await page.waitForTimeout(120)
    }
  }
  // Einsatzleitung: „Tippen“ (zweiter Umschalter) — Name kommt aus den Einsatzdetails
  await abschluss.getByRole('button', { name: 'Tippen' }).nth(1).click()
  await page.waitForTimeout(1200)
  await cropBetween(page, abschluss.getByText('Unterschriften', { exact: true }), abschluss.getByText('Der Name wird in Schreibschrift als Unterschrift gesetzt'), 'nachbereitung-unterschriften')

  // 5) Ergebnis: Abbruch mit Grund (danach wieder „erfolgreich“)
  await expand(page, 'Einsatzabschluss')
  await expand(page, 'Ergebnis')
  await page.getByRole('button', { name: 'Einsatz abgebrochen' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Wetter', exact: true }).click()
  await page.locator('textarea[placeholder="Weitere Details zum Abbruch..."]').fill('Gewitterzelle zog auf, Böen über 12 m/s. Lageerkundung nach Rücksprache mit EL abgebrochen.')
  await page.locator('textarea[placeholder="Weitere Details zum Abbruch..."]').blur()
  await crop(page, section(page, 'Ergebnis'), 'nachbereitung-ergebnis')
  await page.getByRole('button', { name: 'Einsatz erfolgreich beendet' }).click()
  await page.waitForTimeout(300)
  await expand(page, 'Ergebnis')

  // 6) Wartung & Pflege mit Vorschlägen aus Nachflugkontrolle und Störungen
  await expand(page, 'Wartung & Pflege')
  await crop(page, section(page, 'Wartung & Pflege'), 'nachbereitung-wartung')
  await expand(page, 'Wartung & Pflege')

  // 7) Abschließen: Sicherheitsabfrage
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Einsatz abschliessen' }).click()
  await page.waitForTimeout(400)
  await cropBetween(page, page.getByText('Einsatz wirklich abschliessen?').locator('xpath=../..'), page.getByRole('button', { name: 'Bestätigen: Einsatz abschliessen' }), 'nachbereitung-abschliessen')

  // 8) Dokument-Vorschau + PDF-Seiten
  await expand(page, 'Einsatzabschluss')
  // Im Entwicklungsmodus gibt React die Vorschau-Adresse sofort wieder frei
  // (doppelte Effekte); im Betrieb nicht. Für die Aufnahme abschalten.
  await page.evaluate(() => { URL.revokeObjectURL = () => {} })
  await page.getByRole('button', { name: 'Dokument prüfen' }).click()
  await page.waitForTimeout(3000)
  // Nur die Leiste der Vorschau: Das eingebettete PDF zeigt der Aufnahme-Browser nicht an.
  // Die Vorschau liegt fest über der Seite — daher Ausschnitt in Bildschirmkoordinaten.
  const bar = await page.getByRole('heading', { name: 'Dokument-Vorschau' }).locator('xpath=..').boundingBox()
  if (bar) {
    await page.screenshot({ path: path.join(TMP, 'nachbereitung-vorschau-leiste.png'), clip: bar })
    console.log('  -> nachbereitung-vorschau-leiste (Bereich)')
  }

  await capturePdf(page, (pdf, pages, pageText) => {
    // Seite mit Abschnitt 4.2 „Nachflugkontrolle“ suchen (Kapitel 4 „Nachbereitung“)
    const nb = pages.findIndex((_, i) => /4\.2\s+Nachflugkontrolle/.test(pageText(i)))
    const wanted = { 0: 'nachbereitung-pdf-deckblatt', 1: 'nachbereitung-pdf-einsatzuebersicht' }
    if (nb >= 0) wanted[nb] = 'nachbereitung-pdf-nachbereitung'
    wanted[pages.length - 1] = 'nachbereitung-pdf-unterschriften'
    return wanted
  })
  await ctx.close()

  // 9) Abgeschlossener Einsatz (zweiter Einsatz im Seed)
  const ctx2 = await makeContext({ storage: buildStorage(Date.now()) })
  const page2 = await ctx2.newPage()
  await go(page2, `/mission/${MID2}/nachbereitung`, 3000)
  const foot = await page2.getByText('Alle Daten bleiben lokal', { exact: false }).first().boundingBox()
  const vp2 = page2.viewportSize()
  await page2.screenshot({
    path: path.join(TMP, 'nachbereitung-abgeschlossen.png'),
    clip: { x: 0, y: 0, width: vp2.width, height: foot ? Math.min(vp2.height, foot.y + foot.height + 20) : vp2.height },
  })
  console.log('  -> nachbereitung-abgeschlossen (Bereich)')
  await ctx2.close()

  // 10) Bericht eines mit Suchlage verknüpften Einsatzes
  {
    const now = Date.now()
    const sl = buildSuchlage(now, seed)
    const s = { ...storage(), ...loginStorage(now), ...linkStorage(sl, now - 80 * 60e3) }
    linkFlightLog(s, sl, { confirmed: ['f1', 'f2', 'f3'] })
    const ctx3 = await makeContext({ storage: s, reseed: 'once' })
    await routeSuchlage(ctx3, sl)
    const page3 = await ctx3.newPage()
    await go(page3, `/mission/${MID}/nachbereitung`, 3500)
    await page3.evaluate(() => { URL.revokeObjectURL = () => {} })
    await expand(page3, 'Einsatzabschluss')
    // „Dokument prüfen“ lädt die Karte aus Suchlage nicht (nur Herunterladen/Teilen
    // tun das); daher hier vorab, im selben Modul wie die App (Vite-Dev, bis 15 s).
    await page3.evaluate(async (mid) => {
      const { prepareSuchlageReportMaps } = await import('/src/utils/suchlageReportMap.ts')
      await prepareSuchlageReportMaps(mid, true)
    }, MID)
    await page3.getByRole('button', { name: 'Dokument prüfen' }).click()
    await page3.locator('iframe[title="PDF-Vorschau"]').waitFor({ timeout: 45000 }).catch(() => {})
    await page3.waitForTimeout(1500)
    await capturePdf(page3, (pdf, pages, pageText) => {
      const wanted = []
      const map = pages.findIndex((_, i) => /Karte aus Suchlage/.test(pageText(i)))
      const log = pages.findIndex((_, i) => /Fotos und Video zu diesem Flug liegen/.test(pageText(i)))
      if (map < 0) console.log('    (keine Seite mit „Karte aus Suchlage“ — Kartenkacheln nicht erreichbar, oder PWA nicht mit `pnpm dev --mode handbuch` gestartet)')
      else wanted.push([map, 'nachbereitung-pdf-suchlage-karte'])
      if (log >= 0) wanted.push([log, 'nachbereitung-pdf-suchlage-flugtagebuch'])
      return wanted
    })
    await ctx3.close()
  }
}
