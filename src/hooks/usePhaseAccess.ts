import { useMissionPersistedState } from './useMissionPersistedState'
import { useSegmentPersistedState } from './useSegmentPersistedState'
import type { MissionPhase } from '../types/mission'

export function usePhaseAccess() {
  const [flugfreigabe] = useSegmentPersistedState<string | null>('flugfreigabe', null)
  const [fluegeAbgeschlossen] = useMissionPersistedState<boolean>('fluegeAbgeschlossen', false)

  const canAccess: Record<MissionPhase, boolean> = {
    einsatzdaten: true,
    vorflugkontrolle: true,
    fluege: !!flugfreigabe,
    nachbereitung: !!flugfreigabe && fluegeAbgeschlossen,
  }

  const lockReason: Record<MissionPhase, string | null> = {
    einsatzdaten: null,
    vorflugkontrolle: null,
    fluege: !flugfreigabe ? 'Flug muss erst freigegeben werden' : null,
    nachbereitung: !flugfreigabe
      ? 'Flug muss erst freigegeben werden'
      : !fluegeAbgeschlossen
        ? 'Flüge müssen erst abgeschlossen werden'
        : null,
  }

  return { canAccess, lockReason }
}
