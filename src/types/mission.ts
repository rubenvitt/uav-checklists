export type MissionPhase = 'einsatzdaten' | 'vorflugkontrolle' | 'fluege' | 'nachbereitung'

export interface MissionSegment {
  id: string
  createdAt: number
  label: string
  locationName?: string
  status: 'active' | 'completed'
}

export interface Mission {
  id: string
  createdAt: number
  completedAt?: number
  /** Set when soft-deleted; mission stays recoverable until DELETED_TTL elapses. */
  deletedAt?: number
  label: string
  phase: MissionPhase
  segments: MissionSegment[]
  activeSegmentId: string | null
}
