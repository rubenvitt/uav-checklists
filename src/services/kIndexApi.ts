import type { KIndexData } from '../types/weather'

const K_INDEX_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

export async function fetchKIndex(): Promise<KIndexData> {
  const response = await fetch(K_INDEX_URL)

  if (!response.ok) {
    throw new Error(`K-Index konnte nicht geladen werden: ${response.status}`)
  }

  const json: string[][] = await response.json()

  // Erster Eintrag ist der Header, letzter Eintrag ist der aktuellste Wert
  if (json.length < 2) {
    throw new Error('Keine K-Index Daten verfügbar')
  }

  const latest = json[json.length - 1]

  return {
    kIndex: parseFloat(latest[1]),
    timestamp: latest[0],
  }
}
