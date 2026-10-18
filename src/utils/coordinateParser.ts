export interface ParsedCoordinate {
  latitude: number
  longitude: number
  format: 'mgrs' | 'utm' | 'decimal' | 'dm' | 'dms'
  /** Human-readable label for the detected format */
  formatLabel: string
  /** Formatted coordinate display string */
  display: string
}

/**
 * Try to parse coordinate input in MGRS, UTM, degree (DMS / DM / decimal with
 * symbols or hemisphere letters) or plain decimal format.
 * MGRS is checked first (most specific), then UTM, degrees, plain decimal.
 * Returns null if no format matches — ambiguous input is rejected rather than
 * guessed, because a wrong guess puts the mission kilometres off.
 */
export function parseCoordinates(input: string): ParsedCoordinate | null {
  const trimmed = input.trim()
  if (trimmed.length < 3) return null
  return (
    parseMgrs(trimmed) ?? parseUtm(trimmed) ?? parseDegrees(trimmed) ?? parseDecimal(trimmed) ?? null
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

// ── Degrees (DMS, DM, decimal with symbols or hemisphere letters) ──────────

/**
 * Matches degree patterns with symbols and/or hemisphere letters
 * (N/S, E/O/W — O = Ost), the letter before or after each value:
 *   52°23'24"N 9°41'48"E        Grad/Min./Sek.
 *   N52°23'24" E9°41'48"
 *   52°23.4'N 9°41.8'E          Grad/Dezimalminuten
 *   N52°23,4' O9°41,8'
 *   N 52 23.4 E 9 41.8          (no symbols — the letters delimit the values)
 *   52°23.4' 9°41.8'            (no letters — latitude first, ° delimits)
 *   52.39°N 9.6967°E            Dezimalkoordinaten
 *
 * The number of values per coordinate (1–3) decides the format, so an input
 * with minutes or seconds is never read as decimal degrees. Both coordinates
 * must use the same format; mixed or otherwise ambiguous input returns null.
 */
function parseDegrees(input: string): ParsedCoordinate | null {
  const tokens = tokenizeDegrees(input)
  if (!tokens) return null

  const hasDir = tokens.some((t) => t.kind === 'dir')
  const hasUnit = tokens.some((t) => t.kind === 'value' && t.unit !== null)
  // Plain numbers are left to parseDecimal
  if (!hasDir && !hasUnit) return null

  const groups = groupDegreeTokens(tokens, hasDir)
  if (!groups) return null

  const parts = groups.map(readDegreeGroup)
  if (parts.some((p) => p === null)) return null
  const [a, b] = parts as DegreePart[]
  if (a.valueCount !== b.valueCount) return null

  // With letters, either order works; without, latitude comes first
  const aIsLat = !hasDir || a.dir === 'N' || a.dir === 'S'
  const bIsLat = hasDir && (b.dir === 'N' || b.dir === 'S')
  if (aIsLat === bIsLat) return null // N…N or E…E
  const latPart = aIsLat ? a : b
  const lonPart = aIsLat ? b : a

  const latitude = latPart.dir === 'S' ? -latPart.value : latPart.value
  const longitude = lonPart.dir === 'W' ? -lonPart.value : lonPart.value
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null

  if (a.valueCount === 3) {
    return {
      latitude,
      longitude,
      format: 'dms',
      formatLabel: 'Grad/Min./Sek.',
      display: `${formatDms(latitude, 'NS')}, ${formatDms(longitude, 'EW')}`,
    }
  }
  if (a.valueCount === 2) {
    return {
      latitude,
      longitude,
      format: 'dm',
      formatLabel: 'Grad/Dezimalminuten',
      display: `${formatDm(latitude, 'NS')}, ${formatDm(longitude, 'EW')}`,
    }
  }
  return decimalResult(latitude, longitude)
}

type DegreeUnit = '°' | "'" | '"'
type DegreeToken =
  | { kind: 'dir'; dir: 'N' | 'S' | 'E' | 'W' }
  | { kind: 'value'; text: string; unit: DegreeUnit | null }

interface DegreePart {
  /** Absolute value in decimal degrees (negative only for a signed input). */
  value: number
  dir: 'N' | 'S' | 'E' | 'W' | null
  valueCount: number
}

/**
 * Splits the input into numbers (each with its unit symbol, if any) and
 * hemisphere letters. Returns null on anything else, e.g. place names.
 */
function tokenizeDegrees(input: string): DegreeToken[] | null {
  const normalized = input
    .toUpperCase()
    .replace(/[º˚]/g, '°')
    .replace(/[′’‘´`]/g, "'")
    .replace(/[″”“]/g, '"')
    .replace(/''/g, '"')
    .replace(/−/g, '-')

  const tokenRegex =
    /\s*(?:([+-]?\d+(?:[.,]\d+)?)\s*([°'"])?|([NSEOW])(?![A-Z])|[,;/])\s*/y
  const tokens: DegreeToken[] = []
  let pos = 0
  while (pos < normalized.length) {
    tokenRegex.lastIndex = pos
    const m = tokenRegex.exec(normalized)
    if (!m) return null
    pos = tokenRegex.lastIndex
    if (m[1] !== undefined) {
      tokens.push({ kind: 'value', text: m[1], unit: (m[2] as DegreeUnit | undefined) ?? null })
    } else if (m[3] !== undefined) {
      tokens.push({ kind: 'dir', dir: m[3] === 'O' ? 'E' : (m[3] as 'N' | 'S' | 'E' | 'W') })
    }
  }
  return tokens
}

/**
 * Splits the tokens into exactly two coordinates. With hemisphere letters,
 * the letters delimit them (all before or all after the values); without,
 * every coordinate has to start with a value marked °.
 */
function groupDegreeTokens(tokens: DegreeToken[], hasDir: boolean): DegreeToken[][] | null {
  const groups: DegreeToken[][] = []
  if (hasDir) {
    if (tokens[0].kind === 'dir') {
      for (const t of tokens) {
        if (t.kind === 'dir') groups.push([t])
        else groups[groups.length - 1].push(t)
      }
    } else if (tokens[tokens.length - 1].kind === 'dir') {
      let current: DegreeToken[] = []
      for (const t of tokens) {
        current.push(t)
        if (t.kind === 'dir') {
          groups.push(current)
          current = []
        }
      }
    } else {
      return null
    }
    // Each group must hold exactly one letter, at its start or its end
    if (groups.some((g) => g.filter((t) => t.kind === 'dir').length !== 1)) return null
  } else {
    for (const t of tokens) {
      if (t.kind === 'value' && t.unit === '°') groups.push([t])
      else if (groups.length === 0) return null
      else groups[groups.length - 1].push(t)
    }
  }
  return groups.length === 2 ? groups : null
}

const UNIT_ORDER: DegreeUnit[] = ['°', "'", '"']

/** Reads one coordinate: 1–3 values (degrees, minutes, seconds) plus letter. */
function readDegreeGroup(group: DegreeToken[]): DegreePart | null {
  let dir: DegreePart['dir'] = null
  const values: string[] = []
  for (const t of group) {
    if (t.kind === 'dir') {
      dir = t.dir
      continue
    }
    // Symbols, where given, must match the position: ° then ' then "
    if (t.unit !== null && UNIT_ORDER.indexOf(t.unit) !== values.length) return null
    values.push(t.text)
  }
  if (values.length < 1 || values.length > 3) return null

  // Only the last value may carry a fraction; only the degrees a sign
  for (let i = 0; i < values.length; i++) {
    if (i < values.length - 1 && /[.,]/.test(values[i])) return null
    if (i > 0 && /^[+-]/.test(values[i])) return null
  }
  const signed = /^[+-]/.test(values[0])
  if (signed && dir !== null) return null // "-52°N" is ambiguous

  const [deg, min = 0, sec = 0] = values.map((v) => Math.abs(parseFloat(v.replace(',', '.'))))
  if (min >= 60 || sec >= 60) return null

  const abs = deg + min / 60 + sec / 3600
  return {
    value: values[0].startsWith('-') ? -abs : abs,
    dir,
    valueCount: values.length,
  }
}

// ── Plain Decimal Degrees ───────────────────────────────────────────────────

/**
 * Matches plain decimal-degree pairs (no symbols, no letters):
 *   52.520, 13.405       (international)
 *   52.520 13.405        (space-separated)
 *   52,520 13,405        (German decimal comma, space-separated)
 *   -33.868, 151.209     (negative values)
 *   52.520; 13.405       (semicolon)
 * Each part must be a bare number — anything else (°, ', letters, a third
 * value) is rejected so minutes or seconds are never dropped silently.
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
  if (!parts.every((p) => /^[+-]?\d+(?:[.,]\d+)?$/.test(p))) return null

  const lat = parseFloat(parts[0].replace(',', '.'))
  const lon = parseFloat(parts[1].replace(',', '.'))

  if (lat < -90 || lat > 90) return null
  if (lon < -180 || lon > 180) return null

  return decimalResult(lat, lon)
}

function decimalResult(lat: number, lon: number): ParsedCoordinate {
  return {
    latitude: lat,
    longitude: lon,
    format: 'decimal',
    formatLabel: 'Dezimalkoordinaten',
    display: `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`,
  }
}

function formatDms(decimal: number, directions: 'NS' | 'EW'): string {
  const dir = decimal >= 0 ? directions[0] : directions[1]
  // Round once in tenths of a second so 59.96″ carries over instead of showing 60.0″
  const tenths = Math.round(Math.abs(decimal) * 36000)
  const deg = Math.floor(tenths / 36000)
  const min = Math.floor((tenths % 36000) / 600)
  const sec = ((tenths % 600) / 10).toFixed(1)
  return `${deg}°${min}′${sec}″${dir}`
}

function formatDm(decimal: number, directions: 'NS' | 'EW'): string {
  const dir = decimal >= 0 ? directions[0] : directions[1]
  // Round once in thousandths of a minute so 59.9996′ carries over
  const thousandths = Math.round(Math.abs(decimal) * 60000)
  const deg = Math.floor(thousandths / 60000)
  const min = ((thousandths % 60000) / 1000).toFixed(3)
  return `${deg}°${min}′${dir}`
}
