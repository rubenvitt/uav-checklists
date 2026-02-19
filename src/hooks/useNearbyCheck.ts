import { useQuery } from '@tanstack/react-query'
import { fetchNearbyPOIs } from '../services/overpassApi'
import type { NearbyCategory } from '../services/overpassApi'

interface UseNearbyCheckResult {
  categories: NearbyCategory[]
  loading: boolean
  error: string | null
}

export function useNearbyCheck(lat: number | null, lon: number | null): UseNearbyCheckResult {
  const roundedLat = lat !== null ? Math.round(lat * 1000) / 1000 : null
  const roundedLon = lon !== null ? Math.round(lon * 1000) / 1000 : null

  const query = useQuery({
    queryKey: ['nearby', roundedLat, roundedLon],
    queryFn: () => fetchNearbyPOIs(lat!, lon!),
    staleTime: 8 * 60 * 60 * 1000,
    gcTime: 8 * 60 * 60 * 1000,
    enabled: lat !== null && lon !== null,
  })

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Umgebungsdaten konnten nicht geladen werden') : null,
  }
}
