import type { KIndexData } from '../types/weather'

const K_INDEX_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

function parseNumericKIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function parseKIndexRow(row: unknown): KIndexData | null {
  if (Array.isArray(row)) {
    const [timestamp, kIndexValue] = row
    const kIndex = parseNumericKIndex(kIndexValue)

    return typeof timestamp === 'string' && kIndex !== null
      ? { kIndex, timestamp }
      : null
  }

  if (row !== null && typeof row === 'object') {
    const record = row as Record<string, unknown>
    const timestamp = record.time_tag ?? record.timestamp ?? record.time
    const kIndex = parseNumericKIndex(record.Kp ?? record.kp ?? record.kIndex)

    return typeof timestamp === 'string' && kIndex !== null
      ? { kIndex, timestamp }
      : null
  }

  return null
}

export function parseKIndexData(json: unknown): KIndexData {
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error('Keine K-Index Daten verfügbar')
  }

  for (let index = json.length - 1; index >= 0; index -= 1) {
    const parsed = parseKIndexRow(json[index])
    if (parsed !== null) {
      return parsed
    }
  }

  throw new Error('Keine gültigen K-Index Daten verfügbar')
}

export async function fetchKIndex(): Promise<KIndexData> {
  const response = await fetch(K_INDEX_URL)

  if (!response.ok) {
    throw new Error(`K-Index konnte nicht geladen werden: ${response.status}`)
  }

  return parseKIndexData(await response.json())
}
