import { useState, useEffect } from 'react'
import { reverseGeocode } from '../services/geocodeApi'

interface UseGeocodeResult {
  city: string | null
  country: string | null
  loading: boolean
}

export function useReverseGeocode(lat: number | null, lon: number | null): UseGeocodeResult {
  const [city, setCity] = useState<string | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat === null || lon === null) return

    let active = true
    setLoading(true)

    reverseGeocode(lat, lon)
      .then((result) => {
        if (active) {
          setCity(result.city)
          setCountry(result.country)
        }
      })
      .catch(() => {
        if (active) {
          setCity(null)
          setCountry(null)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [lat, lon])

  return { city, country, loading }
}
