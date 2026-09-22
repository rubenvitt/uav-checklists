/**
 * Erzeugt public/og-image.png (Vorschaubild beim Teilen) und
 * public/apple-touch-icon.png aus public/favicon.svg.
 *
 *   node tools/screenshots/social.mjs
 *
 * Die Schriften werden als Base64 eingebettet, damit die Grafik ohne Zugriff
 * auf fremde Server entsteht.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const landing = path.resolve(here, '../..')
const modules = path.join(landing, 'node_modules')

const base64 = (p) => fs.readFileSync(p).toString('base64')
const archivo = base64(path.join(modules, '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'))
const mono = base64(path.join(modules, '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2'))
const sans = base64(path.join(modules, '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2'))
const mark = fs.readFileSync(path.join(landing, 'public/favicon.svg'), 'utf8')

const og = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
@font-face{font-family:'A';src:url(data:font/woff2;base64,${archivo}) format('woff2');font-weight:100 900}
@font-face{font-family:'M';src:url(data:font/woff2;base64,${mono}) format('woff2');font-weight:500}
@font-face{font-family:'S';src:url(data:font/woff2;base64,${sans}) format('woff2');font-weight:100 700}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#f4f2ed;color:#10161c;font-family:'S';position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(to right,rgba(210,204,190,.6) 1px,transparent 1px),linear-gradient(to bottom,rgba(210,204,190,.6) 1px,transparent 1px);background-size:36px 36px}
.wrap{position:relative;padding:58px 72px 74px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:16px}
.top svg{width:52px;height:52px}
.brand{font-family:'A';font-variation-settings:'wdth' 92;font-weight:700;font-size:28px;letter-spacing:-.02em}
h1{font-family:'A';font-variation-settings:'wdth' 92;font-weight:700;font-size:80px;line-height:.95;letter-spacing:-.03em;max-width:16ch;margin-top:44px}
.sig{color:#d9451f}
p{font-size:22px;line-height:1.45;color:#3c4956;max-width:52ch;margin-top:24px}
.meta{font-family:'M';font-weight:500;font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:#6b7681;display:flex;gap:18px;align-items:center}
.meta .dot{color:#d9451f}
.bar{position:absolute;left:0;right:0;bottom:0;height:10px;background:#10161c}
.bar i{display:block;height:100%;width:34%;background:#d9451f}
</style></head><body>
<div class="grid"></div>
<div class="wrap">
  <div>
    <div class="top">${mark}<span class="brand">UAV Einsatzverwaltung</span></div>
    <h1>Das Einsatztagebuch<br>für den Trupp,<br><span class="sig">nicht fürs Büro.</span></h1>
    <p>Vorflugkontrolle, Wetter- und SORA-Bewertung, Flugtagebuch und PDF-Bericht — offline nutzbar, ohne Konto, ohne Server.</p>
  </div>
  <div class="meta"><span class="dot">◆</span><span>Katastrophenschutz</span><span>/</span><span>Progressive Web App</span><span>/</span><span>Quelloffen</span></div>
</div>
<div class="bar"><i></i></div>
</body></html>`

const icon = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
*{margin:0;padding:0}body{width:180px;height:180px;background:#10161c;display:grid;place-items:center}svg{width:180px;height:180px}
</style></head><body>${mark}</body></html>`

const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
const browser = await chromium.launch(launchOptions)

for (const [html, size, file] of [
  [og, { width: 1200, height: 630 }, 'og-image.png'],
  [icon, { width: 180, height: 180 }, 'apple-touch-icon.png'],
]) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(landing, 'public', file) })
  console.log(file)
}

await browser.close()
