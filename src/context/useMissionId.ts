import { useContext } from 'react'
import { MissionContext } from './missionContextValue'

export function useMissionId(): string {
  const id = useContext(MissionContext)
  if (!id) throw new Error('useMissionId must be used within a MissionProvider')
  return id
}
