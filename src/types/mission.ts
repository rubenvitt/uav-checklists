export type MissionPhase = 'einsatzdaten' | 'vorflugkontrolle' | 'fluege' | 'nachbereitung'

export interface Mission {
  id: string
  createdAt: number
  label: string
  phase: MissionPhase
}
