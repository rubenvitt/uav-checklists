const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export interface GeocodeSuggestion {
  name: string
  latitude: number
  longitude: number
}

export async function forwardGeocode(query: string): Promise<GeocodeSuggestion[]> {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    'accept-language': 'de',
    limit: '5',
  })

  const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { 'User-Agent': 'UAV-Flugwetter-App' },
  })

  if (!response.ok) {
    throw new Error(`Geocoding fehlgeschlagen: ${response.status}`)
  }

  const results = await response.json()
  return results.map((r: { display_name: string; lat: string; lon: string }) => ({
    name: r.display_name,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
  }))
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ city: string; country: string }> {
  const params = new URLSearchParams({
    format: 'json',
    lat: lat.toString(),
    lon: lon.toString(),
    'accept-language': 'de',
  })

  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: {
      'User-Agent': 'UAV-Flugwetter-App',
    },
  })

  if (!response.ok) {
    throw new Error(`Geocoding fehlgeschlagen: ${response.status}`)
  }

  const json = await response.json()
  const address = json.address

  const city = address.city || address.town || address.village || 'Unbekannt'
  const country = address.country || 'Unbekannt'

  return { city, country }
}
