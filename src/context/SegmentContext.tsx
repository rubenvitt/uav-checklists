import { SegmentContext } from './segmentContextValue'

export function SegmentProvider({ segmentId, children }: { segmentId: string | null; children: React.ReactNode }) {
  return <SegmentContext value={segmentId}>{children}</SegmentContext>
}
