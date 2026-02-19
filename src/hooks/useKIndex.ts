import { useState, useEffect } from 'react'
import { fetchKIndex } from '../services/kIndexApi'

const REFRESH_INTERVAL = 1_800_000 // 30 Minuten

interface UseKIndexResult {
  kIndex: number | null
  loading: boolean
  error: string | null
}

export function useKIndex(): UseKIndexResult {
  const [kIndex, setKIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const result = await fetchKIndex()
        if (active) {
          setKIndex(result.kIndex)
          setError(null)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'K-Index konnte nicht geladen werden')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    const interval = setInterval(load, REFRESH_INTERVAL)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return { kIndex, loading, error }
}
