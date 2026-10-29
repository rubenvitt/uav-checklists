/**
 * Erzeugt die Abbildungen für das Handbuch (`/handbuch/`) aus der laufenden PWA.
 *
 * Jedes Kapitel hat ein eigenes Aufnahmeskript in `handbuch/<slug>.mjs`. Es
 * exportiert eine Funktion, die die Werkzeuge aus lib.mjs bekommt:
 *
 *   export default async function ({ makeContext, go, shot, crop, expand,
 *     scrollTo, waitForWeather, setAdsb, seed }) { … }
 *
 * `seed` enthält `buildStorage`, `MID`, `SEG`, `MID2`, `SEG2` aus seed.mjs.
 * Die Bilder landen als PNG in public/screenshots/handbuch/ und werden danach
 * in WebP umgewandelt (Breite 860 px, wie die Startseite).
 *
 * Voraussetzung: Die PWA läuft (im Projektwurzelverzeichnis
 * `pnpm dev --mode handbuch`; mit einfachem `pnpm dev` fehlen nur die Bilder
 * zur Verknüpfung mit Suchlage, siehe suchlage.mjs).
 *
 *   node tools/screenshots/handbuch.mjs              # alle Kapitel
 *   node tools/screenshots/handbuch.mjs fluege       # nur handbuch/fluege.mjs
 *
 * Umgebungsvariablen wie capture.mjs (APP_URL, CHROMIUM_PATH); OUT ändert das
 * Zielverzeichnis.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import * as seed from './seed.mjs'
import { createSession } from './lib.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = process.env.OUT ?? path.resolve(here, '../../public/screenshots/handbuch')
const scriptsDir = path.join(here, 'handbuch')

const wanted = process.argv.slice(2)
const scripts = fs
  .readdirSync(scriptsDir)
  .filter((f) => f.endsWith('.mjs'))
  .filter((f) => wanted.length === 0 || wanted.includes(f.replace(/\.mjs$/, '')))
  .sort()

if (scripts.length === 0) {
  console.log('Keine Aufnahmeskripte gefunden für:', wanted.join(', ') || '(alle)')
  process.exit(1)
}

// Jedes Kapitel schreibt erst in ein eigenes Zwischenverzeichnis, damit
// mehrere Läufe gleichzeitig nicht gegenseitig ihre PNG-Dateien umwandeln.
let failed = false
for (const file of scripts) {
  const name = file.replace(/\.mjs$/, '')
  const tmp = path.join(OUT, `.tmp-${name}`)
  fs.mkdirSync(tmp, { recursive: true })
  const session = await createSession({ out: tmp })
  console.log(`# ${name}`)
  try {
    const { default: run } = await import(pathToFileURL(path.join(scriptsDir, file)).href)
    await run({ ...session, seed })
  } catch (err) {
    failed = true
    console.error(`! ${name} fehlgeschlagen:`, err)
  } finally {
    await session.close()
  }

  for (const png of fs.readdirSync(tmp).filter((f) => f.endsWith('.png'))) {
    const input = fs.readFileSync(path.join(tmp, png))
    const output = await sharp(input).resize({ width: 860, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
    fs.writeFileSync(path.join(OUT, png.replace(/\.png$/, '.webp')), output)
  }
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log(failed ? 'fertig, mit Fehlern' : 'fertig')
process.exit(failed ? 1 : 0)
