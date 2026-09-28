/**
 * Cloudflare Pages Function für die Startseite (`/`).
 *
 * Content-Negotiation für Agenten: Wer `Accept: text/markdown` schickt, bekommt
 * statt des (clientseitig gerenderten, also leeren) HTML-Gerüsts die
 * Markdown-Fassung aus `public/index.md`. Browser schicken diesen Typ nie mit
 * und bekommen weiterhin das HTML.
 *
 * Zusätzlich setzt die Funktion die Link-Header (RFC 8288), weil `_headers`
 * auf selbst erzeugte Antworten von Functions nicht angewendet wird.
 *
 * Die Datei liegt bewusst unter `functions/index.ts` statt als Middleware: So
 * läuft sie nur für `/`, alle anderen Pfade bleiben reine Static-Assets.
 */

interface Env {
  ASSETS: { fetch: (input: URL | Request | string) => Promise<Response> }
}

interface Context {
  request: Request
  env: Env
  next: () => Promise<Response>
}

const LINKS = [
  '</index.md>; rel="alternate"; type="text/markdown"',
  '</index.md>; rel="describedby"; type="text/markdown"',
  '<https://github.com/rubenvitt/uav-checklists#readme>; rel="service-doc"; type="text/html"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(', ')

/** `true`, wenn der Accept-Header `text/markdown` mit q > 0 nennt. */
function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false
  return accept.split(',').some((part) => {
    const [type, ...params] = part.trim().split(';')
    if (type.trim().toLowerCase() !== 'text/markdown') return false
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
    return q === undefined || Number(q.slice(2)) > 0
  })
}

function withDiscoveryHeaders(response: Response): Response {
  const out = new Response(response.body, response)
  out.headers.set('Link', LINKS)
  // Bei durchgereichten Assets hat `_headers` Vary schon gesetzt.
  const vary = out.headers.get('Vary') ?? ''
  if (!/(^|,)\s*accept\s*(,|$)/i.test(vary)) out.headers.append('Vary', 'Accept')
  return out
}

export async function onRequest({ request, env, next }: Context): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method) || !wantsMarkdown(request.headers.get('Accept'))) {
    return withDiscoveryHeaders(await next())
  }

  const asset = await env.ASSETS.fetch(new URL('/index.md', request.url))
  if (!asset.ok) return withDiscoveryHeaders(await next())

  const markdown = await asset.text()
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    // Schätzung (~4 Zeichen pro Token) — genügt Agenten zur Budgetplanung.
    'X-Markdown-Tokens': String(Math.ceil(markdown.length / 4)),
    'Content-Location': '/index.md',
  })
  return withDiscoveryHeaders(
    new Response(request.method === 'HEAD' ? null : markdown, { status: 200, headers }),
  )
}
