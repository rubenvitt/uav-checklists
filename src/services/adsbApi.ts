import type { FlightTrafficSnapshot, TrafficAircraft } from '../types/traffic'
import { haversineDistance, calcBearing, compassDirection } from '../utils/geo'

// Die ADS-B-Aggregatoren (adsb.lol, adsb.fi) senden keine CORS-Header, daher
// läuft die Abfrage über einen Proxy unter `/adsb/point/...`:
//   - Standard: gleiche Origin — in Produktion die Cloudflare Pages Function
//     (functions/adsb/point/), im Dev-Server der Vite-Proxy (vite.config.ts)
//   - VITE_ADSB_API_URL: anderer Host, z. B. das optionale Backend (server/)
const BASE_URL = (import.meta.env.VITE_ADSB_API_URL ?? '').trim().replace(/\/+$/, '')

const NM_IN_KM = 1.852

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function normalizeAircraft(raw: Record<string, unknown>, lat: number, lon: number): TrafficAircraft | null {
  const acLat = num(raw.lat)
  const acLon = num(raw.lon)
  const hex = str(raw.hex)
  if (acLat === null || acLon === null || hex === null) return null

  const onGround = raw.alt_baro === 'ground'
  const category = str(raw.category)
  const emergency = str(raw.emergency)
  const bearing = calcBearing(lat, lon, acLat, acLon)

  return {
    hex,
    callsign: str(raw.flight),
    registration: str(raw.r),
    typeCode: str(raw.t),
    description: str(raw.desc),
    category,
    isRotorcraft: category === 'A7',
    // readsb-Datenbankflag Bit 0 = militärisch
    isMilitary: (num(raw.dbFlags) ?? 0) % 2 === 1,
    lat: acLat,
    lon: acLon,
    distanceM: Math.round(haversineDistance(lat, lon, acLat, acLon)),
    bearingDeg: Math.round(bearing),
    direction: compassDirection(bearing),
    onGround,
    // GNSS-Höhe ist unabhängig vom Luftdruck und daher genauer als die
    // barometrische Standardhöhe (bezogen auf 1013,25 hPa)
    altitudeFt: num(raw.alt_geom) ?? num(raw.alt_baro),
    groundSpeedKt: num(raw.gs),
    trackDeg: num(raw.track),
    verticalRateFpm: num(raw.geom_rate) ?? num(raw.baro_rate),
    squawk: str(raw.squawk),
    emergency: emergency && emergency !== 'none' ? emergency : null,
    seenPosSec: num(raw.seen_pos) ?? num(raw.seen),
  }
}

export async function fetchFlightTraffic(lat: number, lon: number, radiusKm: number): Promise<FlightTrafficSnapshot> {
  const radiusNm = Math.ceil(radiusKm / NM_IN_KM)
  const response = await fetch(`${BASE_URL}/adsb/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radiusNm}`)
  if (!response.ok) {
    throw new Error(`Flugverkehrsdaten konnten nicht geladen werden: ${response.status}`)
  }

  const json = await response.json()
  const list: unknown[] = Array.isArray(json.ac) ? json.ac : Array.isArray(json.aircraft) ? json.aircraft : []
  const radiusM = radiusKm * 1000

  const aircraft = list
    .map((raw) => (raw && typeof raw === 'object' ? normalizeAircraft(raw as Record<string, unknown>, lat, lon) : null))
    .filter((a): a is TrafficAircraft => a !== null && a.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)

  return {
    fetchedAt: new Date().toISOString(),
    // Der Dev-Proxy reicht die adsb.lol-Antwort ohne `source` durch
    source: str(json.source) ?? 'adsb.lol',
    radiusKm,
    lat,
    lon,
    aircraft,
  }
}
