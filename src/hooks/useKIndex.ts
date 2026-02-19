import { useQuery } from '@tanstack/react-query'
import { fetchKIndex } from '../services/kIndexApi'

interface UseKIndexResult {
  kIndex: number | null
  loading: boolean
  error: string | null
}

export function useKIndex(): UseKIndexResult {
  const query = useQuery({
    queryKey: ['kindex'],
    queryFn: fetchKIndex,
    refetchInterval: 30 * 60 * 1000,
  })

  return {
    kIndex: query.data?.kIndex ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'K-Index konnte nicht geladen werden') : null,
  }
}
