import { useEffect, useRef } from 'react'
import SignaturePadLib from 'signature_pad'
import { PiEraser } from 'react-icons/pi'

interface SignaturePadProps {
  /** Aktueller Wert als PNG-Data-URL (getrimmt) oder leerer String. */
  value: string
  /** Wird bei Strich-Ende mit der getrimmten Data-URL bzw. '' (geleert) aufgerufen. */
  onChange: (dataUrl: string) => void
  /** Deutsche Beschriftung über dem Feld. */
  label: string
}

/**
 * Trims fully transparent margins from a canvas and returns a tight PNG data-URL.
 * Returns '' when the canvas has no non-transparent pixels.
 */
function trimToPng(source: HTMLCanvasElement): string {
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

export default function SignaturePad({ value, onChange, label }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  // Keep latest onChange / value without re-instantiating the pad.
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)

  // Sync mutable refs outside of render (avoids ref-write during render).
  useEffect(() => {
    onChangeRef.current = onChange
    valueRef.current = value
  })

  // Instantiate the pad once on mount, wire HiDPI resizing + endStroke export.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePadLib(canvas, {
      // Transparent background so the PNG sits cleanly over the PDF line.
      backgroundColor: 'rgba(0, 0, 0, 0)',
      penColor: '#111827',
      minWidth: 0.7,
      maxWidth: 2.2,
    })
    padRef.current = pad

    function resizeCanvas() {
      if (!canvas) return
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const rect = canvas.getBoundingClientRect()
      // Preserve the current drawing across a resize (resizing clears the canvas).
      const restore = valueRef.current
      canvas.width = Math.round(rect.width * ratio)
      canvas.height = Math.round(rect.height * ratio)
      const ctx = canvas.getContext('2d')
      ctx?.scale(ratio, ratio)
      pad.clear()
      if (restore) {
        // ratio:1 because the data-URL is already at device resolution.
        void pad.fromDataURL(restore, { ratio: 1 })
      }
    }

    resizeCanvas()

    const observer = new ResizeObserver(() => resizeCanvas())
    observer.observe(canvas)

    function handleEnd() {
      const dataUrl = trimToPng(canvas!)
      valueRef.current = dataUrl
      onChangeRef.current(dataUrl)
    }
    pad.addEventListener('endStroke', handleEnd)

    return () => {
      observer.disconnect()
      pad.removeEventListener('endStroke', handleEnd)
      pad.off()
    }
  }, [])

  // Restore an externally provided value (e.g. persisted signature on reopen).
  useEffect(() => {
    const pad = padRef.current
    if (!pad) return
    if (value) {
      if (pad.isEmpty()) void pad.fromDataURL(value, { ratio: 1 })
    } else if (!pad.isEmpty()) {
      pad.clear()
    }
  }, [value])

  function handleClear() {
    padRef.current?.clear()
    valueRef.current = ''
    onChange('')
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:text-warning hover:bg-warning-bg"
          >
            <PiEraser className="text-[0.85rem]" />
            Löschen
          </button>
        )}
      </div>
      {/* Fixed light "paper" background in ALL themes: the dark pen ink stays
          visible while signing at dusk/night, and matches the white PDF where
          the trimmed PNG is later embedded. */}
      <div className="overflow-hidden rounded-lg border border-text-muted/20 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-32 w-full cursor-crosshair touch-none"
        />
      </div>
      <p className="text-[0.7rem] text-text-muted/70">
        Mit dem Finger oder Stift unterschreiben
      </p>
    </div>
  )
}
