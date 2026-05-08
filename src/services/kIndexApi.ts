import type { KIndexData } from '../types/weather'

const K_INDEX_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

function parseLatestKIndex(rows: string[][]): KIndexData {
  for (let i = rows.length - 1; i >= 1; i -= 1) {
    const row = rows[i]
    const timestamp = row?.[0]
    const value = row?.[1]
    const parsed = Number.parseFloat(value)

    if (timestamp && Number.isFinite(parsed)) {
      return {
        kIndex: parsed,
        timestamp,
      }
    }
  }

  throw new Error('Keine gültigen K-Index Daten verfügbar')
}

export async function fetchKIndex(): Promise<KIndexData> {
  const response = await fetch(K_INDEX_URL)

  if (!response.ok) {
    throw new Error(`K-Index konnte nicht geladen werden: ${response.status}`)
  }

  const json: string[][] = await response.json()

  // Erster Eintrag ist der Header
  if (json.length < 2) {
    throw new Error('Keine K-Index Daten verfügbar')
  }

  return parseLatestKIndex(json)
}
