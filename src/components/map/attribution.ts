/**
 * Quellenangabe im Kartenbild für den Bericht. Die Karte in der App zeigt sie
 * über MapLibres Steuerelement; im Bild (Canvas) fehlt sie, die Lizenz der
 * Kartendaten verlangt sie aber auch im Ausdruck.
 */

/** Was `drawAttribution` vom 2D-Kontext braucht (testbar ohne Canvas). */
export type AttributionContext = Pick<
  CanvasRenderingContext2D,
  'font' | 'fillStyle' | 'textBaseline' | 'textAlign' | 'measureText' | 'fillRect' | 'fillText'
>

/** Schriftgröße in Pixeln, mit der Bildbreite wachsend (1000 px breit → 13 px). */
export function attributionFontSize(width: number): number {
  return Math.max(10, Math.round(width / 75))
}

/** Zeichnet die Quellenangabe rechts unten auf hellem Grund ins Bild. */
export function drawAttribution(ctx: AttributionContext, width: number, height: number, text: string): void {
  if (!text) return
  const size = attributionFontSize(width)
  const pad = Math.round(size * 0.4)
  ctx.font = `${size}px sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'right'
  const boxW = Math.ceil(ctx.measureText(text).width) + 2 * pad
  const boxH = size + 2 * pad
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillRect(width - boxW, height - boxH, boxW, boxH)
  ctx.fillStyle = '#333333'
  ctx.fillText(text, width - pad, height - boxH / 2)
}

/**
 * Kartenbild als JPEG-Data-URL mit Quellenangabe. Ohne 2D-Kontext das Bild
 * wie es ist (lieber ein Bild ohne Angabe als gar keins).
 */
export function mapCanvasToJpeg(canvas: HTMLCanvasElement, attribution: string, quality = 0.85): string {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/jpeg', quality)
  ctx.drawImage(canvas, 0, 0)
  drawAttribution(ctx, out.width, out.height, attribution)
  return out.toDataURL('image/jpeg', quality)
}
