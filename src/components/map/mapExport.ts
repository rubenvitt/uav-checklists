/**
 * Capture a Leaflet map as a JPEG data-URL by compositing tile images
 * and SVG vector overlays onto an off-screen canvas.
 *
 * Replaces the html-to-image approach which is unreliable with
 * cross-origin tile images (OSM tiles) due to SVG foreignObject restrictions.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function captureMapImage(mapContainer: HTMLElement): Promise<string> {
  const rect = mapContainer.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    throw new Error('Map container has zero size')
  }

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = rect.width * scale
  canvas.height = rect.height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  // Background (matches OSM default)
  ctx.fillStyle = '#e5e3df'
  ctx.fillRect(0, 0, rect.width, rect.height)

  // Draw loaded tile images
  const tiles = mapContainer.querySelectorAll<HTMLImageElement>(
    '.leaflet-tile-pane img',
  )
  for (const tile of tiles) {
    if (!tile.complete || tile.naturalWidth === 0) continue
    const tileRect = tile.getBoundingClientRect()
    try {
      ctx.drawImage(
        tile,
        tileRect.left - rect.left,
        tileRect.top - rect.top,
        tileRect.width,
        tileRect.height,
      )
    } catch {
      // CORS or other error — skip this tile
    }
  }

  // Draw SVG overlays (Geoman polygons, lines etc.)
  const svgs = mapContainer.querySelectorAll<SVGSVGElement>(
    '.leaflet-overlay-pane svg',
  )
  for (const svg of svgs) {
    const svgRect = svg.getBoundingClientRect()
    if (svgRect.width === 0 || svgRect.height === 0) continue

    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(svgRect.width))
    clone.setAttribute('height', String(svgRect.height))

    const svgData = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    try {
      const img = await loadImage(url)
      ctx.drawImage(
        img,
        svgRect.left - rect.left,
        svgRect.top - rect.top,
        svgRect.width,
        svgRect.height,
      )
    } catch {
      // SVG rendering failed — skip
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  // Draw marker images
  const markers = mapContainer.querySelectorAll<HTMLImageElement>(
    '.leaflet-marker-pane img',
  )
  for (const marker of markers) {
    if (!marker.complete || marker.naturalWidth === 0) continue
    const markerRect = marker.getBoundingClientRect()
    try {
      ctx.drawImage(
        marker,
        markerRect.left - rect.left,
        markerRect.top - rect.top,
        markerRect.width,
        markerRect.height,
      )
    } catch {
      // Skip
    }
  }

  return canvas.toDataURL('image/jpeg', 0.85)
}
