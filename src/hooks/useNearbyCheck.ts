import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchNearbyPOIs } from '../services/overpassApi'
import type { NearbyCategory } from '../services/overpassApi'

const CACHE_TTL = 8 * 60 * 60 * 1000 // 8 hours
const CACHE_PREFIX = 'nearby_'

interface CacheEntry {
  ts: number
  data: NearbyCategory[]
}

function cacheKey(lat: number, lon: number): string {
  // Round to 3 decimals (~111m) so nearby GPS readings share cache
  return `${CACHE_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}`
}

function readCache(lat: number, lon: number): NearbyCategory[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lon))
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(cacheKey(lat, lon))
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function writeCache(lat: number, lon: number, data: NearbyCategory[]): void {
  try {
    const entry: CacheEntry = { ts: Date.now(), data }
    localStorage.setItem(cacheKey(lat, lon), JSON.stringify(entry))
  } catch {
    // localStorage full — ignore
  }
}

interface UseNearbyCheckResult {
  categories: NearbyCategory[]
  loading: boolean
  error: string | null
}

export function useNearbyCheck(lat: number | null, lon: number | null): UseNearbyCheckResult {
  const [categories, setCategories] = useState<NearbyCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null)

  const load = useCallback(async () => {
    if (lat === null || lon === null) return

    // Don't re-fetch if location hasn't moved significantly (100m)
    if (lastCoordsRef.current) {
      const dLat = lat - lastCoordsRef.current.lat
      const dLon = lon - lastCoordsRef.current.lon
      const approxMeters = Math.sqrt(dLat * dLat + dLon * dLon) * 111_000
      if (approxMeters < 100) return
    }

    // Check localStorage cache first
    const cached = readCache(lat, lon)
    if (cached) {
      setCategories(cached)
      lastCoordsRef.current = { lat, lon }
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchNearbyPOIs(lat, lon)
      setCategories(result)
      writeCache(lat, lon, result)
      lastCoordsRef.current = { lat, lon }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Umgebungsdaten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [lat, lon])

  useEffect(() => {
    load()
  }, [load])

  return { categories, loading, error }
}
