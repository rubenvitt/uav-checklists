import { useContext } from 'react'
import { SegmentContext } from './segmentContextValue'

export function useSegmentId(): string | null {
  return useContext(SegmentContext)
}

export function useRequiredSegmentId(): string {
  const id = useContext(SegmentContext)
  if (!id) throw new Error('useRequiredSegmentId must be used within a SegmentProvider with a non-null segmentId')
  return id
}
