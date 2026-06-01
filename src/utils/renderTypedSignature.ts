import { trimCanvasToPng } from './trimCanvasToPng'

/**
 * Renders a typed name in a handwriting font (Caveat) to a tightly-cropped PNG
 * data-URL — the SAME format the drawn signature pad produces. This lets a typed
 * signature flow through the existing report pipeline (storage, PDF embedding,
 * stored-signature reuse) without any changes to the PDF module.
 *
 * The font MUST be loaded before drawing: canvas `fillText` neither triggers nor
 * waits for font loading, so rendering too early silently falls back to a default
 * font and produces a wrong PNG with no error. We await {@link ensureFontLoaded}
 * first. The Caveat web font is bundled locally via `@fontsource/caveat`
 * (imported once in `main.tsx`); we only wait for it to be parsed/ready here.
 */

const FONT_FAMILY = 'Caveat'
/** Render size in CSS px — large enough to stay crisp when scaled into the
 *  ~16 mm PDF signature block. */
const FONT_PX = 96
/** Matches the drawn pen ink (`SignaturePad` penColor / PDF embedding). */
const INK_COLOR = '#111827'

let fontPromise: Promise<unknown> | null = null

/** Loads (and caches) the Caveat font face at the render size. Resolves even if
 *  the Font Loading API is unavailable so rendering still proceeds. */
export function ensureFontLoaded(): Promise<unknown> {
  if (!fontPromise) {
    fontPromise = document.fonts?.load(`${FONT_PX}px "${FONT_FAMILY}"`) ?? Promise.resolve()
  }
  return fontPromise
}

/**
 * @param name Free-text name to render as a signature.
 * @returns A trimmed PNG data-URL, or '' for an empty/whitespace name.
 */
export async function renderTypedSignature(name: string): Promise<string> {
  const text = name.trim()
  if (!text) return ''

  await ensureFontLoaded()

  // Crisp output: render at >= 2× device density regardless of screen DPR.
  const ratio = Math.max(window.devicePixelRatio || 1, 2)
  const font = `${FONT_PX}px "${FONT_FAMILY}"`

  // Measure on a throwaway context to size the drawing canvas.
  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) return ''
  measure.font = font
  const textWidth = Math.ceil(measure.measureText(text).width)

  // Generous margins so a cursive font's slant and descenders are never clipped
  // before the trim pass crops the PNG tight to the actual ink.
  const marginX = FONT_PX
  const cssW = textWidth + marginX * 2
  const cssH = FONT_PX * 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cssW * ratio)
  canvas.height = Math.round(cssH * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.scale(ratio, ratio)
  ctx.font = font
  ctx.fillStyle = INK_COLOR
  ctx.textBaseline = 'middle'
  ctx.fillText(text, marginX, cssH / 2)

  return trimCanvasToPng(canvas)
}
