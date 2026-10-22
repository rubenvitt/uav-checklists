import { NEARBY_CATEGORIES, type NearbyCategory, type NearbyItem } from '../services/overpassApi'

/** Segment-Feld der von Hand eingetragenen Objekte der Umgebungsprüfung */
export const MANUAL_NEARBY_KEY = 'nearby:manualEntries'

export interface ManualNearbyEntry {
  id: string
  /** Schlüssel einer Objektart aus `MANUAL_NEARBY_CATEGORIES` */
  category: string
  name: string
  /** Entfernung in Metern; null = „im Suchradius“ */
  distance: number | null
  direction: string | null
}

/** Nur für Handeinträge: was in keine der OSM-Objektarten passt */
const OTHER_CATEGORY = { key: 'other', label: 'Sonstige Objekte', isLinear: false }

export const MANUAL_NEARBY_CATEGORIES = [...NEARBY_CATEGORIES, OTHER_CATEGORY]

export const COMPASS_DIRECTIONS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'] as const

function compareByDistance(a: NearbyItem, b: NearbyItem): number {
  if (a.distance === null && b.distance === null) return 0
  if (a.distance === null) return 1
  if (b.distance === null) return -1
  return a.distance - b.distance
}

/**
 * Führt das Ergebnis der automatischen Abfrage mit den Handeinträgen zusammen.
 * Handeinträge tragen ihre `manualId`; die Reihenfolge der Objektarten bleibt die der Abfrage.
 */
export function mergeNearbyCategories(auto: NearbyCategory[], manual: ManualNearbyEntry[]): NearbyCategory[] {
  if (manual.length === 0) return auto

  const byKey = new Map<string, NearbyCategory>()
  for (const cat of auto) byKey.set(cat.key, { ...cat, items: [...cat.items] })

  for (const entry of manual) {
    const def = MANUAL_NEARBY_CATEGORIES.find((c) => c.key === entry.category) ?? OTHER_CATEGORY
    const name = entry.name.trim() || def.label
    let cat = byKey.get(def.key)
    if (!cat) {
      cat = { key: def.key, label: def.label, items: [], isLinear: def.isLinear }
      byKey.set(def.key, cat)
    }
    cat.items.push({ name, distance: entry.distance, direction: entry.distance !== null ? entry.direction : null, manualId: entry.id })
  }

  const order = MANUAL_NEARBY_CATEGORIES.map((c) => c.key)
  return [...byKey.values()]
    .map((cat) => ({ ...cat, items: [...cat.items].sort(compareByDistance) }))
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
}
