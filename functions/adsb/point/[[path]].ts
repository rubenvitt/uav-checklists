/**
 * Cloudflare Pages Function: ADS-B-Proxy unter derselben Origin wie die PWA.
 *
 * GET /adsb/point/:lat/:lon/:radiusNm — die ADS-B-Aggregatoren senden keine
 * CORS-Header, daher fragt diese Function sie serverseitig ab. Die Logik
 * (Upstreams, Fallback, Kürzen, 15-s-Cache je Isolate) teilt sie sich mit
 * dem optionalen Backend in server/src/adsb.ts.
 */
import { createAdsbProxy, parseAdsbParams } from '../../../server/src/adsb'

const lookup = createAdsbProxy()

interface PagesContext {
  params: { path?: string | string[] }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export async function onRequestGet({ params }: PagesContext): Promise<Response> {
  const segments = Array.isArray(params.path) ? params.path : []
  const parsed = segments.length === 3 ? parseAdsbParams(segments[0], segments[1], segments[2]) : null
  if (!parsed) return json({ error: 'invalid_params' }, 400)

  try {
    return json(await lookup(parsed.lat, parsed.lon, parsed.radiusNm))
  } catch {
    return json({ error: 'upstream_unavailable' }, 502)
  }
}
