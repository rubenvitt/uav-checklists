import { useQuery } from '@tanstack/react-query'
import { reverseGeocode } from '../services/geocodeApi'

interface UseGeocodeResult {
  city: string | null
  country: string | null
  loading: boolean
}

export function useReverseGeocode(lat: number | null, lon: number | null): UseGeocodeResult {
  const query = useQuery({
    queryKey: ['geocode', lat, lon],
    queryFn: () => reverseGeocode(lat!, lon!),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: lat !== null && lon !== null,
  })

  return {
    city: query.data?.city ?? null,
    country: query.data?.country ?? null,
    loading: query.isLoading,
  }
}
