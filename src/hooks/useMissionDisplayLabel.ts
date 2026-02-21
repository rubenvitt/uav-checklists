import { useStore } from '@tanstack/react-store'
import { getMissionAtom } from '../stores/missionFormStore'
import { buildMissionLabel, readManualLocationName } from '../utils/missionLabel'

export function useMissionDisplayLabel(missionId: string, createdAt: number): string {
  const atom = getMissionAtom(missionId)
  const location = readManualLocationName(missionId)

  return useStore(atom, (state: Record<string, unknown>) => {
    return buildMissionLabel({
      anlass: (state['flugAnlass'] as string | undefined) ?? 'einsatz',
      stichwort: (state['einsatzstichwort'] as string | undefined) ?? '',
      template: (state['mission_template'] as string | undefined) ?? '',
      location,
      flightCount: ((state['flightlog:entries'] as unknown[] | undefined) ?? []).length,
      createdAt,
    })
  })
}
