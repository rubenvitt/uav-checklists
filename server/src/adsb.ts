/**
 * ADS-B-Proxy für die Flugverkehrsanzeige der PWA.
 *
 * Die Community-Aggregatoren (adsb.lol, adsb.fi) liefern keine CORS-Header,
 * der Browser kann sie also nicht direkt abfragen. Dieser Proxy fragt sie
 * serverseitig ab, kürzt die Antwort auf die benötigten Felder und hält sie
 * kurz im Speicher, damit mehrere Clients am selben Einsatzort nur eine
 * Upstream-Anfrage auslösen.
 *
 * Antwortformat (readsb-kompatibel, damit auch der Vite-Dev-Proxy direkt auf
 * die Upstream-API zeigen kann):
 *   { source: 'adsb.lol', now: <ms>, ac: [{ hex, flight, lat, lon, ... }] }
 */

/** Größter erlaubter Suchradius in nautischen Meilen (readsb-Limit: 250). */
export const MAX_RADIUS_NM = 25;

/** Felder, die an die PWA weitergereicht werden. Alles andere wird verworfen. */
const KEPT_FIELDS = [
  'hex', 'type', 'flight', 'r', 't', 'desc', 'dbFlags',
  'alt_baro', 'alt_geom', 'gs', 'track', 'baro_rate', 'geom_rate',
  'squawk', 'emergency', 'category', 'lat', 'lon', 'seen_pos', 'seen',
] as const;

/**
 * adsb.lol lehnt Anfragen ohne aussagekräftigen User-Agent mit Kontaktangabe
 * ab (403 „User-Agent too generic“); Cloudflare Workers senden gar keinen.
 */
export const USER_AGENT = 'Flugmappe/1.0 (+https://github.com/rubenvitt/uav-checklists)';

export interface AdsbUpstream {
  name: string;
  url: (lat: number, lon: number, radiusNm: number) => string;
}

export const DEFAULT_UPSTREAMS: AdsbUpstream[] = [
  {
    name: 'adsb.lol',
    url: (lat, lon, r) => `https://api.adsb.lol/v2/point/${lat}/${lon}/${r}`,
  },
  {
    name: 'adsb.fi',
    url: (lat, lon, r) => `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${r}`,
  },
];

export interface AdsbResult {
  source: string;
  now: number;
  ac: Array<Record<string, unknown>>;
}

export type AdsbLookup = (lat: number, lon: number, radiusNm: number) => Promise<AdsbResult>;

export interface AdsbProxyOptions {
  upstreams?: AdsbUpstream[];
  /** Injectable fetch (defaults to global fetch); handy for tests. */
  fetchImpl?: typeof fetch;
  /** Cache-Lebensdauer je Standort. Default 15 s. */
  ttlMs?: number;
  /** Timeout je Upstream-Anfrage. Default 8 s. */
  timeoutMs?: number;
  /** Maximale Anzahl gecachter Standorte. Default 200. */
  maxEntries?: number;
  now?: () => number;
}

export class AdsbUnavailableError extends Error {}

function trimAircraft(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  // Ohne Position ist ein Eintrag für die Umkreisanzeige wertlos.
  if (typeof src.lat !== 'number' || typeof src.lon !== 'number') return null;
  const out: Record<string, unknown> = {};
  for (const key of KEPT_FIELDS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  return out;
}

export function createAdsbProxy(opts: AdsbProxyOptions = {}): AdsbLookup {
  const upstreams = opts.upstreams ?? DEFAULT_UPSTREAMS;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ttlMs = opts.ttlMs ?? 15_000;
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const maxEntries = opts.maxEntries ?? 200;
  const now = opts.now ?? Date.now;

  // Speichert das Promise, damit parallele Anfragen zusammengelegt werden.
  const cache = new Map<string, { expires: number; value: Promise<AdsbResult> }>();

  async function fetchUpstream(lat: number, lon: number, radiusNm: number): Promise<AdsbResult> {
    for (const upstream of upstreams) {
      try {
        const res = await fetchImpl(upstream.url(lat, lon, radiusNm), {
          headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) continue;
        const json = (await res.json()) as { ac?: unknown; aircraft?: unknown };
        // adsb.lol liefert `ac`, adsb.fi `aircraft`
        const list = Array.isArray(json.ac) ? json.ac : Array.isArray(json.aircraft) ? json.aircraft : null;
        if (!list) continue;
        const ac = list.map(trimAircraft).filter((a): a is Record<string, unknown> => a !== null);
        return { source: upstream.name, now: now(), ac };
      } catch {
        // nächster Upstream
      }
    }
    throw new AdsbUnavailableError('all ADS-B upstreams failed');
  }

  return async (lat, lon, radiusNm) => {
    // ~100 m Raster: gleicher Einsatzort → gleicher Cache-Eintrag
    const rLat = Math.round(lat * 1000) / 1000;
    const rLon = Math.round(lon * 1000) / 1000;
    const rRadius = Math.round(radiusNm * 10) / 10;
    const key = `${rLat},${rLon},${rRadius}`;
    const t = now();

    const hit = cache.get(key);
    if (hit && hit.expires > t) return hit.value;

    for (const [k, entry] of cache) {
      if (entry.expires <= t) cache.delete(k);
    }
    while (cache.size >= maxEntries) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }

    const value = fetchUpstream(rLat, rLon, rRadius);
    cache.set(key, { expires: t + ttlMs, value });
    // Fehler nicht cachen, damit der nächste Aufruf es erneut versucht
    value.catch(() => {
      if (cache.get(key)?.value === value) cache.delete(key);
    });
    return value;
  };
}

/** Parst und validiert die Pfadparameter. Gibt `null` bei ungültiger Eingabe zurück. */
export function parseAdsbParams(
  latRaw: string,
  lonRaw: string,
  radiusRaw: string,
): { lat: number; lon: number; radiusNm: number } | null {
  const num = /^-?\d+(\.\d+)?$/;
  if (!num.test(latRaw) || !num.test(lonRaw) || !num.test(radiusRaw)) return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  const radiusNm = Number(radiusRaw);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  if (radiusNm <= 0 || radiusNm > MAX_RADIUS_NM) return null;
  return { lat, lon, radiusNm };
}
