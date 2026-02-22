import { createContext, useContext } from 'react'

const SegmentContext = createContext<string | null>(null)

export function SegmentProvider({ segmentId, children }: { segmentId: string | null; children: React.ReactNode }) {
  return <SegmentContext value={segmentId}>{children}</SegmentContext>
}

export function useSegmentId(): string | null {
  return useContext(SegmentContext)
}

export function useRequiredSegmentId(): string {
  const id = useContext(SegmentContext)
  if (!id) throw new Error('useRequiredSegmentId must be used within a SegmentProvider with a non-null segmentId')
  return id
}
