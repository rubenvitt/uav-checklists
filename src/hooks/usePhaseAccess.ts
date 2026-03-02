import { useMissionPersistedState } from './useMissionPersistedState'
import { useSegmentPersistedState } from './useSegmentPersistedState'
import type { MissionPhase } from '../types/mission'

export function usePhaseAccess() {
  const [flugfreigabe] = useSegmentPersistedState<string | null>('flugfreigabe', null)
  const [flugentscheidung] = useSegmentPersistedState<{ status: 'granted' | 'denied'; timestamp: string } | null>('flugentscheidung', null)
  const [fluegeAbgeschlossen] = useMissionPersistedState<boolean>('fluegeAbgeschlossen', false)

  const effectiveDecision = flugentscheidung ?? (flugfreigabe ? { status: 'granted' as const, timestamp: flugfreigabe } : null)
  const isFreigegeben = effectiveDecision?.status === 'granted'
  const isAbgelehnt = effectiveDecision?.status === 'denied'

  const canAccess: Record<MissionPhase, boolean> = {
    einsatzdaten: true,
    vorflugkontrolle: true,
    fluege: isFreigegeben,
    nachbereitung: isAbgelehnt || (isFreigegeben && fluegeAbgeschlossen),
  }

  const lockReason: Record<MissionPhase, string | null> = {
    einsatzdaten: null,
    vorflugkontrolle: null,
    fluege: isAbgelehnt ? 'Flug wurde nicht freigegeben' : !isFreigegeben ? 'Flug muss erst freigegeben werden' : null,
    nachbereitung: isAbgelehnt
      ? null
      : !isFreigegeben
        ? 'Flug muss erst freigegeben werden'
        : !fluegeAbgeschlossen
        ? 'Flüge müssen erst abgeschlossen werden'
        : null,
  }

  return { canAccess, lockReason }
}
