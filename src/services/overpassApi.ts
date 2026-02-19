const SEARCH_RADIUS = 1500

export interface NearbyItem {
  name: string
  distance: number | null
  direction: string | null
}

export interface NearbyCategory {
  key: string
  label: string
  icon: string
  items: NearbyItem[]
  isLinear: boolean
}

interface CategoryDef {
  key: string
  label: string
  icon: string
  isLinear: boolean
  match: (tags: Record<string, string>) => boolean
  getName: (tags: Record<string, string>) => string
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    key: 'aviation',
    label: 'Flugplätze & Heliports',
    icon: '\u2708\uFE0F',
    isLinear: false,
    match: (tags) => tags.aeroway === 'aerodrome' || tags.aeroway === 'helipad',
    getName: (tags) => tags.name || (tags.aeroway === 'helipad' ? 'Hubschrauberlandeplatz' : 'Flugplatz'),
  },
  {
    key: 'military',
    label: 'Militärische Anlagen',
    icon: '\uD83C\uDF96\uFE0F',
    isLinear: false,
    match: (tags) => tags.landuse === 'military' || !!tags.military,
    getName: (tags) => tags.name || 'Militärisches Gelände',
  },
  {
    key: 'prison',
    label: 'Justizvollzugsanstalten',
    icon: '\uD83D\uDD12',
    isLinear: false,
    match: (tags) => tags.amenity === 'prison',
    getName: (tags) => tags.name || 'JVA',
  },
  {
    key: 'hospital',
    label: 'Krankenhäuser',
    icon: '\uD83C\uDFE5',
    isLinear: false,
    match: (tags) => tags.amenity === 'hospital',
    getName: (tags) => tags.name || 'Krankenhaus',
  },
  {
    key: 'police',
    label: 'Sicherheitsbehörden',
    icon: '\uD83D\uDE94',
    isLinear: false,
    match: (tags) => tags.amenity === 'police',
    getName: (tags) => tags.name || 'Polizeidienststelle',
  },
  {
    key: 'fire_station',
    label: 'Feuerwehr / BOS',
    icon: '\uD83D\uDE92',
    isLinear: false,
    match: (tags) => tags.amenity === 'fire_station',
    getName: (tags) => tags.name || 'Feuerwache',
  },
  {
    key: 'nature',
    label: 'Naturschutzgebiete',
    icon: '\uD83C\uDF3F',
    isLinear: false,
    match: (tags) => tags.leisure === 'nature_reserve',
    getName: (tags) => tags.name || 'Schutzgebiet',
  },
  {
    key: 'energy',
    label: 'Energieanlagen',
    icon: '\u26A1',
    isLinear: false,
    match: (tags) => !!tags.power && ['plant', 'substation', 'generator'].includes(tags.power),
    getName: (tags) => {
      if (tags.name) return tags.name
      if (tags.power === 'plant') return 'Kraftwerk'
      if (tags.power === 'substation') return 'Umspannwerk'
      return 'Energieanlage'
    },
  },
  {
    key: 'industrial',
    label: 'Industrieanlagen',
    icon: '\uD83C\uDFED',
    isLinear: false,
    match: (tags) => tags.landuse === 'industrial',
    getName: (tags) => tags.name || 'Industriegebiet',
  },
  {
    key: 'harbour',
    label: 'Hafenanlagen',
    icon: '\u2693',
    isLinear: false,
    match: (tags) => tags.landuse === 'harbour' || tags.leisure === 'marina',
    getName: (tags) => tags.name || 'Hafen',
  },
  {
    key: 'swimming',
    label: 'Freibäder',
    icon: '\uD83C\uDFCA',
    isLinear: false,
    match: (tags) => tags.leisure === 'swimming_pool' || tags.leisure === 'water_park',
    getName: (tags) => tags.name || 'Schwimmbad',
  },
  {
    key: 'railway',
    label: 'Bahnanlagen',
    icon: '\uD83D\uDE82',
    isLinear: true,
    match: (tags) => !!tags.railway && ['rail', 'station', 'halt', 'light_rail', 'subway', 'tram'].includes(tags.railway),
    getName: (tags) => {
      if (tags.railway === 'station' || tags.railway === 'halt') return tags.name || 'Haltestelle'
      return tags.name || 'Bahnstrecke'
    },
  },
  {
    key: 'highway',
    label: 'Bundesfernstraßen',
    icon: '\uD83D\uDEE3\uFE0F',
    isLinear: true,
    match: (tags) => !!tags.highway && ['motorway', 'trunk'].includes(tags.highway),
    getName: (tags) => tags.name || tags.ref || (tags.highway === 'motorway' ? 'Autobahn' : 'Bundesstraße'),
  },
  {
    key: 'waterway',
    label: 'Bundeswasserstraßen',
    icon: '\uD83D\uDEA2',
    isLinear: true,
    match: (tags) => {
      const isWaterway = tags.waterway === 'river' || tags.waterway === 'canal'
      return isWaterway && (tags.ship === 'yes' || tags.motorboat === 'yes' || !!tags.CEMT)
    },
    getName: (tags) => tags.name || 'Wasserstraße',
  },
  {
    key: 'powerline',
    label: 'Stromleitungen & -masten',
    icon: '\uD83D\uDD0C',
    isLinear: true,
    match: (tags) => tags.power === 'tower' || tags.power === 'pole',
    getName: () => 'Strommast',
  },
  {
    key: 'celltower',
    label: 'Mobilfunkmasten',
    icon: '\uD83D\uDCE1',
    isLinear: false,
    match: (tags) => {
      if (tags.man_made === 'communications_tower') return true
      return (tags.man_made === 'mast' || tags.man_made === 'tower') && tags['tower:type'] === 'communication'
    },
    getName: (tags) => {
      if (tags.name) return tags.name
      return tags['communication:mobile_phone'] === 'yes' ? 'Mobilfunkmast' : 'Funkturm'
    },
  },
]

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const lat1R = lat1 * Math.PI / 180
  const lat2R = lat2 * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2R)
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

function compassDirection(degrees: number): string {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(degrees / 45) % 8]
}

function buildQuery(lat: number, lon: number): string {
  const r = SEARCH_RADIUS
  const rNear = 500 // smaller radius for dense infrastructure
  // Use node/way explicitly — avoid relation queries (protected_area, industrial
  // zones etc. are often huge multi-polygon relations that cause 504 timeouts)
  return `[out:json][timeout:25];
(
  node["aeroway"~"aerodrome|helipad"](around:${r},${lat},${lon});
  way["aeroway"~"aerodrome|helipad"](around:${r},${lat},${lon});
  node["amenity"~"hospital|prison|police|fire_station"](around:${r},${lat},${lon});
  way["amenity"~"hospital|prison|police|fire_station"](around:${r},${lat},${lon});
  way["landuse"~"military|harbour"](around:${r},${lat},${lon});
  node["military"](around:${r},${lat},${lon});
  way["military"](around:${r},${lat},${lon});
  way["leisure"="nature_reserve"](around:${r},${lat},${lon});
  node["power"~"plant|substation|generator"](around:${r},${lat},${lon});
  way["power"~"plant|substation|generator"](around:${r},${lat},${lon});
  node["power"="tower"](around:${rNear},${lat},${lon});
  node["man_made"="communications_tower"](around:${r},${lat},${lon});
  node["man_made"~"mast|tower"]["tower:type"="communication"](around:${r},${lat},${lon});
  node["railway"~"station|halt"](around:${r},${lat},${lon});
  way["railway"~"station|halt"](around:${r},${lat},${lon});
  way["railway"="rail"](around:${r},${lat},${lon});
  way["highway"~"motorway|trunk"](around:${rNear},${lat},${lon});
  way["waterway"~"river|canal"]["ship"="yes"](around:${r},${lat},${lon});
  way["waterway"~"river|canal"]["motorboat"="yes"](around:${r},${lat},${lon});
  node["leisure"~"swimming_pool|water_park"](around:${r},${lat},${lon});
  way["leisure"~"swimming_pool|water_park|marina"](around:${r},${lat},${lon});
  way["landuse"="industrial"](around:${r},${lat},${lon});
);
out center;`
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function queryOverpass(query: string): Promise<Response> {
  for (const url of OVERPASS_MIRRORS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(30_000),
      })
      if (response.ok) return response
    } catch {
      // try next mirror
    }
  }
  throw new Error('Umgebungsdaten konnten nicht geladen werden – alle Server nicht erreichbar')
}

export async function fetchNearbyPOIs(lat: number, lon: number): Promise<NearbyCategory[]> {
  const query = buildQuery(lat, lon)
  const response = await queryOverpass(query)
  const json = await response.json()
  const elements = json.elements as Array<{
    type: string
    id: number
    lat?: number
    lon?: number
    center?: { lat: number; lon: number }
    tags?: Record<string, string>
  }>

  const categoryMap = new Map<string, NearbyItem[]>()

  for (const el of elements) {
    const tags = el.tags || {}
    const elLat = el.lat ?? el.center?.lat
    const elLon = el.lon ?? el.center?.lon
    if (!elLat || !elLon) continue

    for (const def of CATEGORY_DEFS) {
      if (def.match(tags)) {
        const items = categoryMap.get(def.key) || []
        const dist = haversineDistance(lat, lon, elLat, elLon)
        const bear = calcBearing(lat, lon, elLat, elLon)
        items.push({
          name: def.getName(tags),
          distance: def.isLinear ? null : Math.round(dist),
          direction: def.isLinear ? null : compassDirection(bear),
        })
        categoryMap.set(def.key, items)
        break
      }
    }
  }

  const results: NearbyCategory[] = []

  for (const def of CATEGORY_DEFS) {
    const items = categoryMap.get(def.key)
    if (!items || items.length === 0) continue

    // Deduplicate by name, keeping closest
    const seen = new Map<string, NearbyItem>()
    for (const item of items) {
      const existing = seen.get(item.name)
      if (!existing || (item.distance !== null && existing.distance !== null && item.distance < existing.distance)) {
        seen.set(item.name, item)
      } else if (!existing) {
        seen.set(item.name, item)
      }
    }

    const deduped = Array.from(seen.values())
    deduped.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })

    results.push({
      key: def.key,
      label: def.label,
      icon: def.icon,
      items: def.isLinear ? deduped.slice(0, 5) : deduped,
      isLinear: def.isLinear,
    })
  }

  return results
}
