export interface ParsedCoordinate {
  latitude: number
  longitude: number
  format: 'mgrs' | 'utm' | 'decimal' | 'dms'
  /** Human-readable label for the detected format */
  formatLabel: string
  /** Formatted coordinate display string */
  display: string
}

/**
 * Try to parse coordinate input in MGRS, UTM, DMS, or decimal format.
 * MGRS is checked first (most specific), then UTM, DMS, decimal (most general).
 * Returns null if no format matches.
 */
export function parseCoordinates(input: string): ParsedCoordinate | null {
  const trimmed = input.trim()
  if (trimmed.length < 3) return null
  return (
    parseMgrs(trimmed) ?? parseUtm(trimmed) ?? parseDms(trimmed) ?? parseDecimal(trimmed) ?? null
  )
}

// ── MGRS (Military Grid Reference System / UTM-Ref) ────────────────────────

const COL_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // 24, no I/O
const ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUV' // 20, no I/O

/** Approximate minimum northing (meters) for each UTM latitude band. */
const BAND_MIN_NORTHING: Record<string, number> = {
  C: 1100000,
  D: 2000000,
  E: 2800000,
  F: 3700000,
  G: 4600000,
  H: 5500000,
  J: 6400000,
  K: 7300000,
  L: 8200000,
  M: 9100000,
  N: 0,
  P: 800000,
  Q: 1700000,
  R: 2600000,
  S: 3500000,
  T: 4400000,
  U: 5300000,
  V: 6200000,
  W: 7000000,
  X: 7900000,
}

/**
 * Matches MGRS (UTM-Ref) patterns:
 *   32UMA8352443524       (concatenated)
 *   32U MA 83524 43524    (spaced)
 *   32UMA 83524 43524     (grid + spaced digits)
 *   32 U MA 83524 43524   (all spaced)
 *   MGRS 32UMA8352443524  (with prefix)
 */
function parseMgrs(input: string): ParsedCoordinate | null {
  // Strip optional MGRS / UTM-Ref prefix
  const cleaned = input.replace(/^(?:mgrs|utm[\s-]*ref)[:\s-]*/i, '').trim()

  let zone: number,
    band: string,
    col: string,
    row: string,
    gridEasting: number,
    gridNorthing: number,
    precision: number

  // Pattern 1: separate easting/northing digits (space-separated)
  // 32U MA 83524 43524 | 32UMA 83524 43524
  const spacedMatch = cleaned.match(
    /^(\d{1,2})\s*([C-HJ-NP-X])\s*([A-HJ-NP-Z])\s*([A-HJ-NP-V])\s+(\d{1,5})\s+(\d{1,5})$/i,
  )
  if (spacedMatch) {
    if (spacedMatch[5].length !== spacedMatch[6].length) return null
    zone = parseInt(spacedMatch[1], 10)
    band = spacedMatch[2].toUpperCase()
    col = spacedMatch[3].toUpperCase()
    row = spacedMatch[4].toUpperCase()
    precision = spacedMatch[5].length
    const scale = Math.pow(10, 5 - precision)
    gridEasting = parseInt(spacedMatch[5], 10) * scale
    gridNorthing = parseInt(spacedMatch[6], 10) * scale
  } else {
    // Pattern 2: concatenated digits (must be even count)
    // 32UMA8352443524 | 32U MA 8352443524
    const concatMatch = cleaned.match(
      /^(\d{1,2})\s*([C-HJ-NP-X])\s*([A-HJ-NP-Z])\s*([A-HJ-NP-V])\s*(\d{2,10})$/i,
    )
    if (!concatMatch) return null
    const digits = concatMatch[5]
    if (digits.length % 2 !== 0) return null

    zone = parseInt(concatMatch[1], 10)
    band = concatMatch[2].toUpperCase()
    col = concatMatch[3].toUpperCase()
    row = concatMatch[4].toUpperCase()
    precision = digits.length / 2
    const scale = Math.pow(10, 5 - precision)
    gridEasting = parseInt(digits.substring(0, precision), 10) * scale
    gridNorthing = parseInt(digits.substring(precision), 10) * scale
  }

  // Validate zone & band
  if (zone < 1 || zone > 60) return null
  if (!UTM_BANDS.includes(band)) return null

  // Column letter → UTM easting
  const setCol = (zone - 1) % 3
  const colOffset = COL_LETTERS.indexOf(col) - setCol * 8
  if (colOffset < 0 || colOffset > 7) return null
  const utmEasting = (colOffset + 1) * 100000 + gridEasting

  // Row letter → UTM northing (disambiguated by latitude band)
  const rowIndex = ROW_LETTERS.indexOf(row)
  if (rowIndex < 0) return null
  const baseNorthing =
    zone % 2 === 0 ? ((rowIndex - 5 + 20) % 20) * 100000 : rowIndex * 100000

  const minNorthing = BAND_MIN_NORTHING[band] ?? 0
  const cycle = Math.floor(minNorthing / 2000000)
  let utmNorthing = cycle * 2000000 + baseNorthing + gridNorthing
  // Adjust to next 2000km cycle if we're below the band minimum
  if (utmNorthing < minNorthing - 100000) {
    utmNorthing += 2000000
  }

  const isNorthern = band >= 'N'
  const { latitude, longitude } = utmToLatLon(zone, isNorthern, utmEasting, utmNorthing)

  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null

  // Format display: "32U MA 83524 43524"
  const eastStr = String(gridEasting / Math.pow(10, 5 - precision)).padStart(precision, '0')
  const northStr = String(gridNorthing / Math.pow(10, 5 - precision)).padStart(precision, '0')

  return {
    latitude,
    longitude,
    format: 'mgrs',
    formatLabel: 'UTM-Ref (MGRS)',
    display: `${zone}${band} ${col}${row} ${eastStr} ${northStr}`,
  }
}

// ── UTM ─────────────────────────────────────────────────────────────────────

const UTM_BANDS = 'CDEFGHJKLMNPQRSTUVWX'

/**
 * Matches UTM coordinate patterns:
 *   32U 461344 5481745
 *   32 U 461344 5481745
 *   32U461344 5481745
 *   32U 461344/5481745
 *   UTM 32U 461344 5481745
 */
function parseUtm(input: string): ParsedCoordinate | null {
  const match = input.match(
    /^(?:utm[:\s-]*)?(\d{1,2})\s*([a-zA-Z])\s*(\d{5,7})[,/\s]+(\d{6,8})$/i,
  )
  if (!match) return null

  const zone = parseInt(match[1], 10)
  const band = match[2].toUpperCase()
  const easting = parseInt(match[3], 10)
  const northing = parseInt(match[4], 10)

  if (zone < 1 || zone > 60) return null
  if (!UTM_BANDS.includes(band)) return null
  if (easting < 100000 || easting > 999999) return null
  if (northing < 0 || northing > 10000000) return null

  const isNorthern = band >= 'N'
  const { latitude, longitude } = utmToLatLon(zone, isNorthern, easting, northing)

  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null

  return {
    latitude,
    longitude,
    format: 'utm',
    formatLabel: `UTM Zone ${zone}${band}`,
    display: `${zone}${band} ${easting} ${northing}`,
  }
}

/**
 * Convert UTM coordinates to WGS84 latitude/longitude.
 * Uses Redfearn's series expansion (accurate to ~1 mm).
 */
function utmToLatLon(
  zone: number,
  isNorthern: boolean,
  easting: number,
  northing: number,
): { latitude: number; longitude: number } {
  const k0 = 0.9996
  const a = 6378137 // WGS84 semi-major axis (meters)
  const e = 0.00669437999014 // WGS84 first eccentricity squared
  const e1sq = e / (1 - e) // second eccentricity squared
  const e1 = (1 - Math.sqrt(1 - e)) / (1 + Math.sqrt(1 - e))

  const x = easting - 500000 // remove false easting
  const y = isNorthern ? northing : northing - 10000000 // remove false northing

  const M = y / k0
  const mu = M / (a * (1 - e / 4 - (3 * e * e) / 64 - (5 * e * e * e) / 256))

  // Footpoint latitude
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu)

  const sinPhi1 = Math.sin(phi1)
  const cosPhi1 = Math.cos(phi1)
  const tanPhi1 = Math.tan(phi1)

  const N1 = a / Math.sqrt(1 - e * sinPhi1 * sinPhi1)
  const T1 = tanPhi1 * tanPhi1
  const C1 = e1sq * cosPhi1 * cosPhi1
  const R1 = (a * (1 - e)) / Math.pow(1 - e * sinPhi1 * sinPhi1, 1.5)
  const D = x / (N1 * k0)

  const lat =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      (D * D / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4)) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e1sq - 3 * C1 * C1) *
          Math.pow(D, 6)) /
          720)

  const lon0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180) // central meridian
  const lon =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) *
        Math.pow(D, 5)) /
        120) /
      cosPhi1

  return {
    latitude: (lat * 180) / Math.PI,
    longitude: (lon * 180) / Math.PI,
  }
}

// ── Decimal Degrees ─────────────────────────────────────────────────────────

/**
 * Matches decimal-degree patterns:
 *   52.520, 13.405       (international)
 *   52.520 13.405        (space-separated)
 *   52,520 13,405        (German decimal comma, space-separated)
 *   -33.868, 151.209     (negative values)
 *   52.520; 13.405       (semicolon)
 */
function parseDecimal(input: string): ParsedCoordinate | null {
  let parts: string[] = []

  // Semicolon separator (unambiguous)
  if (input.includes(';')) {
    parts = input.split(';').map((s) => s.trim())
  }
  // Comma separator only if dot is used as decimal: "52.520, 13.405"
  else if (input.includes(',') && input.includes('.')) {
    parts = input.split(',').map((s) => s.trim())
  }
  // Space separator: "52.520 13.405" or "52,520 13,405" (German decimal comma)
  else if (/\s/.test(input)) {
    parts = input.split(/\s+/).map((s) => s.trim())
  }
  // Comma as separator with no digit-comma-digit (i.e. not German decimal): "52, 13"
  else if (input.includes(',') && !/\d,\d/.test(input)) {
    parts = input.split(',').map((s) => s.trim())
  }

  if (parts.length !== 2) return null

  const lat = parseFloat(parts[0].replace(',', '.'))
  const lon = parseFloat(parts[1].replace(',', '.'))

  if (isNaN(lat) || isNaN(lon)) return null
  if (lat < -90 || lat > 90) return null
  if (lon < -180 || lon > 180) return null

  return {
    latitude: lat,
    longitude: lon,
    format: 'decimal',
    formatLabel: 'Dezimalkoordinaten',
    display: `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`,
  }
}

// ── DMS (Degrees, Minutes, Seconds) ─────────────────────────────────────────

/**
 * Matches DMS patterns:
 *   52°31'12.0"N 13°24'18.0"E
 *   52°31'12"N 13°24'18"E
 *   N52°31'12" E13°24'18"
 *   52°31'12.0"N 13°24'18.0"O    (German "O" = Ost = East)
 */
function parseDms(input: string): ParsedCoordinate | null {
  // Match individual DMS components with direction letter before or after
  const dmsPartRegex =
    /(\d{1,3})\s*°\s*(\d{1,2})\s*[′']\s*(\d{1,2}(?:[.,]\d+)?)\s*[″"]?\s*([NSEOW])/gi
  const parts = [...input.matchAll(dmsPartRegex)]
  if (parts.length !== 2) return null

  let lat: number | null = null
  let lon: number | null = null

  for (const part of parts) {
    const deg = parseInt(part[1], 10)
    const min = parseInt(part[2], 10)
    const sec = parseFloat(part[3].replace(',', '.'))
    const dir = part[4].toUpperCase()

    if (min >= 60 || sec >= 60) return null

    const decimal = deg + min / 60 + sec / 3600

    if (dir === 'N' || dir === 'S') {
      if (decimal > 90) return null
      lat = dir === 'S' ? -decimal : decimal
    } else if (dir === 'E' || dir === 'O' || dir === 'W') {
      // O = Ost (East in German)
      if (decimal > 180) return null
      lon = dir === 'W' ? -decimal : decimal
    }
  }

  if (lat === null || lon === null) return null

  return {
    latitude: lat,
    longitude: lon,
    format: 'dms',
    formatLabel: 'Grad/Min./Sek.',
    display: `${formatDms(lat, 'NS')}, ${formatDms(lon, 'EW')}`,
  }
}

function formatDms(decimal: number, directions: 'NS' | 'EW'): string {
  const dir = decimal >= 0 ? directions[0] : directions[1]
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const minFull = (abs - deg) * 60
  const min = Math.floor(minFull)
  const sec = ((minFull - min) * 60).toFixed(1)
  return `${deg}°${min}′${sec}″${dir}`
}
