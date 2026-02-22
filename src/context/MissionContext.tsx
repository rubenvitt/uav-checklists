import { createContext, useContext } from 'react'

const MissionContext = createContext<string | null>(null)

export function MissionProvider({ missionId, children }: { missionId: string; children: React.ReactNode }) {
  return <MissionContext value={missionId}>{children}</MissionContext>
}

export function useMissionId(): string {
  const id = useContext(MissionContext)
  if (!id) throw new Error('useMissionId must be used within a MissionProvider')
  return id
}
