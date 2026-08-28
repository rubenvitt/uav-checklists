import { MissionContext } from './missionContextValue'

export function MissionProvider({ missionId, children }: { missionId: string; children: React.ReactNode }) {
  return <MissionContext value={missionId}>{children}</MissionContext>
}
