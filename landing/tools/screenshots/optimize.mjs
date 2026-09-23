/**
 * Wandelt die PNG-Aufnahmen aus capture.mjs in die WebP-Dateien um, die von
 * der Landingpage eingebunden werden, und entfernt die Zwischenstände.
 *
 *   node tools/screenshots/optimize.mjs
 *
 * Nicht mehr verwendete Aufnahmen bleiben liegen — vor einem Commit kurz
 * prüfen, ob sie noch in src/components/ referenziert werden.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const dir = process.env.OUT ?? path.resolve(here, '../../public/screenshots')

/** Die Bilder werden nie breiter als ~300 CSS-Pixel dargestellt. */
const TARGET_WIDTH = 860

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'))
if (files.length === 0) {
  console.log('Keine PNG-Dateien gefunden — erst capture.mjs ausführen.')
  process.exit(0)
}

for (const file of files) {
  const source = path.join(dir, file)
  const target = path.join(dir, file.replace(/\.png$/, '.webp'))
  const input = fs.readFileSync(source)
  const output = await sharp(input).resize({ width: TARGET_WIDTH }).webp({ quality: 82 }).toBuffer()
  fs.writeFileSync(target, output)
  fs.unlinkSync(source)
  console.log(`${file}  ${Math.round(input.length / 1024)} kB → ${Math.round(output.length / 1024)} kB`)
}
