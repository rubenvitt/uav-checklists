/**
 * Erzeugt public/og-image.png (Vorschaubild beim Teilen),
 * public/apple-touch-icon.png sowie die Raster-Favicons public/favicon.ico
 * (16/32/48 px) und public/favicon-96x96.png aus public/favicon.svg.
 * Die Raster-Favicons brauchen Browser ohne SVG-Favicon-Unterstützung,
 * Suchmaschinen und alles, was blind /favicon.ico abruft.
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
const mono = base64(path.join(modules, '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2'))
const mark = fs.readFileSync(path.join(landing, 'public/favicon.svg'), 'utf8')

const og = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
@font-face{font-family:'A';src:url(data:font/woff2;base64,${archivo}) format('woff2');font-weight:100 900}
@font-face{font-family:'M';src:url(data:font/woff2;base64,${mono}) format('woff2');font-weight:500}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#e9ebee;color:#0c0e11;font-family:'A';position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(to right,rgba(26,95,160,.09) 1px,transparent 1px),linear-gradient(to bottom,rgba(26,95,160,.09) 1px,transparent 1px);background-size:36px 36px}
.wrap{position:relative;padding:58px 72px 74px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:16px}
.top svg{width:52px;height:52px}
.brand{font-family:'A';font-variation-settings:'wdth' 92;font-weight:600;font-size:28px;letter-spacing:-.02em}
h1{font-family:'A';font-variation-settings:'wdth' 92;font-weight:600;font-size:80px;line-height:.95;letter-spacing:-.03em;max-width:16ch;margin-top:44px}
.sig{color:#a8071a}
p{font-size:22px;line-height:1.45;color:#363d45;max-width:52ch;margin-top:24px}
.meta{font-family:'M';font-weight:500;font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:#424a53;display:flex;gap:18px;align-items:center}
.meta .dot{color:#a8071a}
.bar{position:absolute;left:0;right:0;bottom:0;height:10px;background:#0c0e11}
.bar i{display:block;height:100%;width:34%;background:#a8071a}
</style></head><body>
<div class="grid"></div>
<div class="wrap">
  <div>
    <div class="top">${mark}<span class="brand">Flugmappe</span></div>
    <h1>Die Flugmappe<br>hat alles<br><span class="sig">auf dem Schirm.</span></h1>
    <p>Vorflugkontrolle, Wetter- und SORA-Bewertung, Flugtagebuch und PDF-Bericht — offline nutzbar, ohne Konto, ohne Server.</p>
  </div>
  <div class="meta"><span class="dot">◆</span><span>Katastrophenschutz</span><span>/</span><span>Progressive Web App</span><span>/</span><span>Quelloffen</span></div>
</div>
<div class="bar"><i></i></div>
</body></html>`

const icon = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
*{margin:0;padding:0}body{width:180px;height:180px;background:#0c0e11;display:grid;place-items:center}svg{width:180px;height:180px}
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

// Favicons mit transparentem Hintergrund (die Marke ist eckig).
const favicon = (size) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
*{margin:0;padding:0}body{width:${size}px;height:${size}px;background:transparent}svg{display:block;width:${size}px;height:${size}px}
</style></head><body>${mark}</body></html>`

const renderFavicon = async (size) => {
  const ctx = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.setContent(favicon(size), { waitUntil: 'load' })
  const png = await page.screenshot({ omitBackground: true })
  await ctx.close()
  return png
}

fs.writeFileSync(path.join(landing, 'public', 'favicon-96x96.png'), await renderFavicon(96))
console.log('favicon-96x96.png')

// ICO-Container mit eingebetteten PNGs (von allen aktuellen Browsern und
// Windows unterstützt): 6 Byte Kopf, je Bild 16 Byte Verzeichniseintrag.
const icoSizes = [16, 32, 48]
const pngs = []
for (const size of icoSizes) pngs.push(await renderFavicon(size))
const header = Buffer.alloc(6 + 16 * pngs.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(pngs.length, 4)
let offset = header.length
pngs.forEach((png, i) => {
  const entry = 6 + 16 * i
  header.writeUInt8(icoSizes[i], entry)
  header.writeUInt8(icoSizes[i], entry + 1)
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(png.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += png.length
})
fs.writeFileSync(path.join(landing, 'public', 'favicon.ico'), Buffer.concat([header, ...pngs]))
console.log('favicon.ico')

await browser.close()
