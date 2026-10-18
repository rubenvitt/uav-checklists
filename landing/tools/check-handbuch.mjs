/**
 * Prüft das Handbuch auf kaputte Querverweise und fehlende Bilder.
 *
 *   node tools/check-handbuch.mjs
 *
 * Anker werden nach derselben Regel gebildet wie in handbuch.plugin.ts
 * (`<slug>-<überschrift>`); Bilder müssen unter public/screenshots/ liegen.
 * Beendet sich mit Code 1, wenn etwas fehlt.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'src/handbuch/kapitel')
const shots = path.join(root, 'public/screenshots')

const slugify = (t) =>
  t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
// Markdown-Auszeichnung grob entfernen, wie plainText() im Plugin.
const plain = (t) => t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '')

const files = fs.readdirSync(dir).filter((f) => /^\d+-[a-z0-9-]+\.md$/.test(f)).sort()
const ids = new Set()
const chapters = files.map((f) => {
  const slug = f.replace(/^\d+-|\.md$/g, '')
  const text = fs.readFileSync(path.join(dir, f), 'utf8')
  ids.add(slug)
  const used = new Set()
  for (const line of text.split('\n')) {
    const m = /^(#{2,5}) (.+)$/.exec(line)
    if (!m) continue
    const base = `${slug}-${slugify(plain(m[2]))}`
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    ids.add(id)
  }
  return { f, text }
})

let problems = 0
for (const { f, text } of chapters) {
  const body = text.replace(/```[\s\S]*?```/g, '')
  for (const [, href] of body.matchAll(/\]\(#([^)\s]+)\)/g)) {
    if (!ids.has(href)) { problems++; console.log(`${f}: Anker fehlt  #${href}`) }
  }
  for (const [, src] of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    if (!fs.existsSync(path.join(shots, src))) { problems++; console.log(`${f}: Bild fehlt   ${src}`) }
  }
}
console.log(problems ? `${problems} Probleme` : 'Keine Probleme gefunden.')
process.exit(problems ? 1 : 0)
