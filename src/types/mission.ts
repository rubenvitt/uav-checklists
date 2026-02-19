export type MissionPhase = 'vorflugkontrolle' | 'fluege' | 'nachbereitung'

export interface Mission {
  id: string
  createdAt: number
  label: string
  phase: MissionPhase
}
