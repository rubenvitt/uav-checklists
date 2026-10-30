import { describe, expect, it } from 'vitest'
import { attributionFontSize, drawAttribution, type AttributionContext } from './attribution'
import { BASEMAP_ATTRIBUTION, basemapStyle } from './basemapStyle'

function fakeContext() {
  const rects: [number, number, number, number][] = []
  const texts: { text: string; x: number; y: number }[] = []
  const ctx: AttributionContext = {
    font: '',
    fillStyle: '',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    measureText: (t: string) => ({ width: t.length * 6 }) as TextMetrics,
    fillRect: (x, y, w, h) => { rects.push([x, y, w, h]) },
    fillText: (text, x, y) => { texts.push({ text, x, y }) },
  }
  return { ctx, rects, texts }
}

describe('drawAttribution', () => {
  it('schreibt die Quellenangabe rechts unten ins Bild', () => {
    const { ctx, rects, texts } = fakeContext()
    drawAttribution(ctx, 1000, 600, BASEMAP_ATTRIBUTION)
    expect(texts).toHaveLength(1)
    expect(texts[0].text).toBe('© OpenStreetMap-Mitwirkende')
    const [x, y, w, h] = rects[0]
    // Kasten schließt rechts und unten bündig ab und liegt ganz im Bild.
    expect(x + w).toBe(1000)
    expect(y + h).toBe(600)
    expect(x).toBeGreaterThan(0)
    expect(texts[0].x).toBeLessThan(1000)
    expect(texts[0].y).toBeGreaterThan(y)
    expect(texts[0].y).toBeLessThan(600)
  })

  it('ohne Text zeichnet nichts', () => {
    const { ctx, rects, texts } = fakeContext()
    drawAttribution(ctx, 1000, 600, '')
    expect(rects).toEqual([])
    expect(texts).toEqual([])
  })

  it('Schrift wächst mit der Bildbreite, bleibt aber lesbar', () => {
    expect(attributionFontSize(1000)).toBe(13)
    expect(attributionFontSize(300)).toBe(10)
    expect(attributionFontSize(2000)).toBeGreaterThan(attributionFontSize(1000))
  })
})

describe('BASEMAP_ATTRIBUTION', () => {
  it('ist die Angabe der Kachelquelle im Kartenstil', () => {
    const source = basemapStyle('light').sources.basemap
    expect('attribution' in source && source.attribution).toBe(BASEMAP_ATTRIBUTION)
  })
})
