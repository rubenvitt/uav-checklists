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
  label: string
  phase: MissionPhase
  segments: MissionSegment[]
  activeSegmentId: string | null
}
