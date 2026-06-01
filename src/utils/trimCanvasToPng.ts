/**
 * Trims fully transparent margins from a canvas and returns a tight PNG
 * data-URL. Returns '' when the canvas has no non-transparent pixels.
 *
 * Shared by the drawn signature pad and the typed (handwriting-font) signature
 * renderer so both produce identically-cropped PNGs for the report pipeline.
 */
export function trimCanvasToPng(source: HTMLCanvasElement): string {
  const ctx = source.getContext('2d')
  if (!ctx) return ''
  const { width, height } = source
  if (width === 0 || height === 0) return ''

  const { data } = ctx.getImageData(0, 0, width, height)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // No painted pixels found → empty signature.
  if (maxX < minX || maxY < minY) return ''

  // Small symmetric padding so strokes do not touch the crop edge.
  const pad = 4
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  const out = document.createElement('canvas')
  out.width = cropW
  out.height = cropH
  const outCtx = out.getContext('2d')
  if (!outCtx) return ''
  outCtx.putImageData(ctx.getImageData(minX, minY, cropW, cropH), 0, 0)

  return out.toDataURL('image/png')
}
