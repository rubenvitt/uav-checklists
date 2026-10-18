import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/useAuth'
import { useMissionPersistedState } from './useMissionPersistedState'
import {
  isAuthErrorKind,
  isSuchlageConfigured,
  isSuchlageError,
  isTransientErrorKind,
  suchlage,
  type SuchlageErrorKind,
} from '../services/suchlageApi'
import { LINK_KEY, type SuchlageLink } from '../utils/suchlageStore'
import type { FmMe } from '../types/suchlage'

export const SUCHLAGE_ME_STALE_MS = 5 * 60_000

export function errorKindOf(error: unknown): SuchlageErrorKind | null {
  if (!error) return null
  return isSuchlageError(error) ? error.kind : 'other'
}

export interface SuchlageStatus {
  /** Adresse konfiguriert und angemeldet: nur dann darf überhaupt angefragt werden. */
  enabled: boolean
  /** Probe `GET /me` gelungen. */
  available: boolean
  me: FmMe | null
  /** Netzfehler/Zeitlimit/Schnittstelle aus bei der Probe. */
  unreachable: boolean
  /** 401/403: Suchlage-Teile ruhen still bis zur nächsten Anmeldung. */
  resting: boolean
}

/**
 * Probe gegen Suchlage. Ohne `VITE_SUCHLAGE_URL` oder ohne Anmeldung ist die
 * Abfrage aus – es geht keine Anfrage hinaus. Das Ergebnis wird nicht
 * persistiert (`meta.persist = false`).
 */
export function useSuchlage(): SuchlageStatus {
  const { isAuthenticated, user } = useAuth()
  const enabled = isSuchlageConfigured() && isAuthenticated && !!user?.access_token
  const sub = user?.profile?.sub ?? null
  const query = useQuery({
    queryKey: ['suchlage', 'me', sub],
    queryFn: ({ signal }) => suchlage.me(signal),
    enabled,
    staleTime: SUCHLAGE_ME_STALE_MS,
    retry: (count, error) => count < 2 && isTransientErrorKind(errorKindOf(error) ?? 'other'),
    meta: { persist: false },
  })
  const kind = errorKindOf(query.error)
  const resting = enabled && kind !== null && isAuthErrorKind(kind)
  const me = enabled && !resting ? query.data ?? null : null
  return {
    enabled,
    available: me !== null,
    me,
    unreachable: enabled && kind !== null && isTransientErrorKind(kind),
    resting,
  }
}

export interface SuchlageMission extends SuchlageStatus {
  link: SuchlageLink | null
  setLink: (v: SuchlageLink | null | ((prev: SuchlageLink | null) => SuchlageLink | null)) => void
  /**
   * Der Einsatz ist verknüpft und Suchlage darf angefragt werden. Nur dann
   * zeigt die Flugmappe Suchlage-Teile am Einsatz (auch offline mit letztem Stand).
   */
  linked: boolean
  /** Verknüpft und Suchlage meldet den Einsatz als abgeschlossen/weg/abgelöst. */
  remoteEnded: boolean
}

export function useSuchlageMission(): SuchlageMission {
  const status = useSuchlage()
  const [link, setLink] = useMissionPersistedState<SuchlageLink | null>(LINK_KEY, null)
  const linked = status.enabled && !status.resting && link !== null
  return { ...status, link, setLink, linked, remoteEnded: linked && !!link?.remoteState }
}
