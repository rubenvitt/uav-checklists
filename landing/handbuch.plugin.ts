/**
 * Vite-Plugin für das Handbuch (`/handbuch/`).
 *
 * Die Kapitel liegen als Markdown unter `src/handbuch/kapitel/NN-slug.md` —
 * so lassen sie sich ohne React-Kenntnisse pflegen. Das Plugin wandelt sie zur
 * Build-Zeit in HTML um und stellt sie als virtuelles Modul `virtual:handbuch`
 * bereit; im Browser kommt also kein Markdown-Parser an.
 *
 * Zusätzlich legt der Build die Markdown-Fassung als `handbuch/index.md` ab
 * (für Agenten, wie `index.md` für die Startseite).
 *
 * Schreibregeln für die Kapitel: siehe `src/handbuch/README.md`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { Marked, type Tokens } from 'marked'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:handbuch'
const RESOLVED_ID = '\0' + VIRTUAL_ID

/** Bilder liegen unter public/screenshots/; Pfade im Markdown sind relativ dazu. */
const IMAGE_BASE_HTML = '../screenshots/'
const IMAGE_BASE_MD = '/screenshots/'

const CALLOUTS: Record<string, string> = {
  TIPP: 'Tipp',
  WICHTIG: 'Wichtig',
  ACHTUNG: 'Achtung',
  HINTERGRUND: 'Hintergrund',
  'IM EINSATZ': 'Im Einsatz',
}

export interface Abschnitt {
  id: string
  titel: string
}

export interface Kapitel {
  slug: string
  nummer: string
  titel: string
  kurz: string
  html: string
  abschnitte: Abschnitt[]
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Liest `key: value`-Zeilen zwischen `---` am Dateianfang. */
function frontmatter(source: string): { meta: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source)
  if (!match) return { meta: {}, body: source }
  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return { meta, body: source.slice(match[0].length) }
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function renderChapter(slug: string, body: string): { html: string; abschnitte: Abschnitt[] } {
  const abschnitte: Abschnitt[] = []
  const used = new Set<string>()
  const marked = new Marked({ gfm: true })

  marked.use({
    renderer: {
      // `##` im Kapitel wird zu <h3>: <h1> ist der Seitentitel, <h2> der Kapiteltitel.
      heading({ tokens, depth, text }) {
        const inner = this.parser.parseInline(tokens)
        let id = `${slug}-${slugify(text)}`
        for (let n = 2; used.has(id); n++) id = `${slug}-${slugify(text)}-${n}`
        used.add(id)
        if (depth === 2) abschnitte.push({ id, titel: inner.replace(/<[^>]+>/g, '') })
        const level = Math.min(depth + 1, 6)
        return `<h${level} id="${id}"><a class="hb-anker" href="#${id}" aria-hidden="true">#</a>${inner}</h${level}>\n`
      },

      // Ein Absatz, der nur aus Bildern besteht, wird zur Abbildung (mehrere nebeneinander).
      paragraph({ tokens }) {
        const images = tokens.filter((t): t is Tokens.Image => t.type === 'image')
        const onlyImages =
          images.length > 0 &&
          tokens.every((t) => t.type === 'image' || (t.type === 'text' && !t.raw.trim()) || t.type === 'br')
        if (!onlyImages) return `<p>${this.parser.parseInline(tokens)}</p>\n`
        const figures = images
          .map((img) => {
            const src = IMAGE_BASE_HTML + img.href
            const caption = img.title ? `<figcaption>${img.title}</figcaption>` : ''
            return `<figure class="hb-bild"><a href="${escapeAttr(src)}" target="_blank" rel="noreferrer"><img src="${escapeAttr(src)}" alt="${escapeAttr(img.text)}" loading="lazy" decoding="async"></a>${caption}</figure>`
          })
          .join('')
        return `<div class="hb-bilder" data-anzahl="${images.length}">${figures}</div>\n`
      },

      // `> [!TIPP]` usw. am Anfang eines Zitats wird zum Hinweiskasten.
      blockquote({ tokens }) {
        const first = tokens[0]
        if (first?.type === 'paragraph') {
          const m = /^\[!([A-ZÄÖÜ ]+)\]\s*/.exec(first.raw)
          const kind = m?.[1].trim()
          if (kind && CALLOUTS[kind]) {
            const rest = first.raw.slice(m![0].length)
            const restTokens = rest.trim() ? this.parser.parse(new Marked({ gfm: true }).lexer(rest)) : ''
            const others = this.parser.parse(tokens.slice(1))
            return `<aside class="hb-hinweis" data-art="${slugify(kind)}"><p class="hb-hinweis-titel">${CALLOUTS[kind]}</p>${restTokens}${others}</aside>\n`
          }
        }
        return `<blockquote>${this.parser.parse(tokens)}</blockquote>\n`
      },

      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens)
        const external = /^https?:\/\//.test(href)
        const t = title ? ` title="${escapeAttr(title)}"` : ''
        return external
          ? `<a href="${escapeAttr(href)}"${t} target="_blank" rel="noreferrer">${inner}</a>`
          : `<a href="${escapeAttr(href)}"${t}>${inner}</a>`
      },

      table(token) {
        const head = token.header
          .map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`)
          .join('')
        const rows = token.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`)
          .join('\n')
        return `<div class="hb-tabelle"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`
      },
    },
  })

  const html = marked.parse(body, { async: false })
  return { html, abschnitte }
}

function readChapters(dir: string): Array<Kapitel & { markdown: string }> {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d+-[a-z0-9-]+\.md$/.test(f))
    .sort()
    .map((file) => {
      const [, nummer, slug] = /^(\d+)-([a-z0-9-]+)\.md$/.exec(file)!
      const source = fs.readFileSync(path.join(dir, file), 'utf8')
      const { meta, body } = frontmatter(source)
      const { html, abschnitte } = renderChapter(slug, body)
      return { slug, nummer, titel: meta.titel ?? slug, kurz: meta.kurz ?? '', html, abschnitte, markdown: body }
    })
}

export default function handbuch(options: { dir: string }): Plugin {
  const dir = path.resolve(options.dir)

  return {
    name: 'flugmappe-handbuch',

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },

    load(id) {
      if (id !== RESOLVED_ID) return undefined
      const chapters = readChapters(dir)
      if (fs.existsSync(dir)) for (const file of fs.readdirSync(dir)) this.addWatchFile(path.join(dir, file))
      const data = chapters.map(({ markdown: _, ...rest }) => rest)
      return `export const kapitel = ${JSON.stringify(data)}`
    },

    configureServer(server) {
      server.watcher.add(dir)
      const reload = (file: string) => {
        if (!file.startsWith(dir)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reload)
      server.watcher.on('change', reload)
      server.watcher.on('unlink', reload)
    },

    generateBundle() {
      const chapters = readChapters(dir)
      const parts = chapters.map((k) => {
        const body = k.markdown
          .replace(/\]\((?!https?:|#|\/)([^)\s]+)/g, (_, p: string) => `](${IMAGE_BASE_MD}${p}`)
          .replace(/^(#{1,5}) /gm, '#$1 ')
        return `## ${k.nummer}. ${k.titel}\n\n${k.kurz ? `_${k.kurz}_\n\n` : ''}${body.trim()}\n`
      })
      const markdown = [
        '---',
        'title: Flugmappe — Handbuch für Einsatzkräfte',
        'description: Schritt-für-Schritt-Anleitung für die Flugmappe-App, von der Einsatzanlage bis zum PDF-Bericht.',
        'url: https://flugmappe.de/handbuch/',
        'language: de',
        '---',
        '',
        '# Flugmappe — Handbuch für Einsatzkräfte',
        '',
        ...parts,
      ].join('\n')
      this.emitFile({ type: 'asset', fileName: 'handbuch/index.md', source: markdown })
    },
  }
}
