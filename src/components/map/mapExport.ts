import { toPng } from 'html-to-image'

export async function captureMapImage(el: HTMLElement): Promise<string> {
  return toPng(el, {
    pixelRatio: 2,
    filter: (node: HTMLElement) => {
      if (!(node instanceof Element)) return true
      // Filter out Leaflet controls and custom toolbar
      if (node.classList?.contains('leaflet-control-container')) return false
      if (node.classList?.contains('map-toolbar')) return false
      return true
    },
  })
}
