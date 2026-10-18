/**
 * Client für die Flugmappe-Schnittstelle von Suchlage (`/api/flugmappe/v1`).
 *
 * Wie `signApi.ts` framework-frei. Ohne `VITE_SUCHLAGE_URL` oder ohne
 * Zugriffstoken geht **keine** Anfrage hinaus: die Aufrufe werfen dann sofort
 * einen {@link SuchlageError}, ohne `fetch` zu berühren. Alle Pfade, Header und
 * Felder der Gegenseite stehen nur hier.
 */
import { getAccessToken } from './accessToken'
import type {
  FmFeatureCollection,
  FmFlight,
  FmMapImport,
  FmMapImportResult,
  FmMe,
  FmMission,
  FmMissionCreate,
  FmMissionLink,
  FmSectionCreate,
} from '../types/suchlage'

export const SUCHLAGE_API_PREFIX = '/api/flugmappe/v1'
/** Bindet einsatzbezogene Aufrufe an diesen Einsatz der Flugmappe. */
export const MISSION_HEADER = 'X-Flugmappe-Einsatz'
export const REQUEST_TIMEOUT_MS = 10_000

export type SuchlageErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'unprocessable'
  | 'unavailable'
  | 'other'

export class SuchlageError extends Error {
  readonly status: number | null
  readonly kind: SuchlageErrorKind
  /** Text aus `ApiError.error`, falls Suchlage einen geschickt hat. */
  readonly serverMessage: string | null

  constructor(kind: SuchlageErrorKind, status: number | null, serverMessage: string | null = null) {
    super(serverMessage ?? `Suchlage: ${kind}${status !== null ? ` (${status})` : ''}`)
    this.name = 'SuchlageError'
    this.kind = kind
    this.status = status
    this.serverMessage = serverMessage
  }
}

export function isSuchlageError(e: unknown): e is SuchlageError {
  return e instanceof SuchlageError
}

/** HTTP-Status → Fehlerklasse. */
export function classifyStatus(status: number): SuchlageErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 409) return 'conflict'
  if (status === 422) return 'unprocessable'
  if (status === 503) return 'unavailable'
  // Vorgeschaltete Proxys: Suchlage selbst ist nicht erreichbar.
  if (status === 502 || status === 504) return 'offline'
  return 'other'
}

/** 401/403: Suchlage-Teile ruhen still bis zur nächsten Anmeldung. */
export function isAuthErrorKind(kind: SuchlageErrorKind): boolean {
  return kind === 'unauthorized' || kind === 'forbidden'
}

/** Netz weg, Zeitlimit, Proxyfehler oder Schnittstelle aus: später erneut versuchen. */
export function isTransientErrorKind(kind: SuchlageErrorKind): boolean {
  return kind === 'offline' || kind === 'unavailable'
}

export function normalizeBaseUrl(raw: string | undefined | null): string | null {
  if (!raw || raw.trim() === '') return null
  return raw.trim().replace(/\/+$/, '')
}

export interface SuchlageClientOptions {
  baseUrl: string | null
  getToken: () => string | null
  fetch?: typeof fetch
  timeoutMs?: number
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  /** Einsatz-ID der Flugmappe für `X-Flugmappe-Einsatz`. */
  fmMissionId?: string
  json?: unknown
  body?: Blob
  contentType?: string
  signal?: AbortSignal
  expect?: 'json' | 'none'
}

export function createSuchlageClient(opts: SuchlageClientOptions) {
  const baseUrl = normalizeBaseUrl(opts.baseUrl)
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS

  async function request<T>(path: string, ro: RequestOptions = {}): Promise<T> {
    if (!baseUrl) throw new SuchlageError('unavailable', null, 'Suchlage ist nicht konfiguriert')
    const token = opts.getToken()
    if (!token) throw new SuchlageError('unauthorized', null, 'Nicht angemeldet')

    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (ro.fmMissionId) headers[MISSION_HEADER] = ro.fmMissionId
    let body: BodyInit | undefined
    if (ro.json !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(ro.json)
    } else if (ro.body) {
      headers['Content-Type'] = ro.contentType ?? ro.body.type
      body = ro.body
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const onAbort = () => ctrl.abort()
    ro.signal?.addEventListener('abort', onAbort)
    const doFetch = opts.fetch ?? globalThis.fetch
    let res: Response
    try {
      res = await doFetch(`${baseUrl}${SUCHLAGE_API_PREFIX}${path}`, {
        method: ro.method ?? 'GET',
        headers,
        body,
        signal: ctrl.signal,
        // Bearer statt Cookies: keine Anmeldedaten des Browsers mitschicken.
        credentials: 'omit',
      })
    } catch {
      throw new SuchlageError('offline', null)
    } finally {
      clearTimeout(timer)
      ro.signal?.removeEventListener('abort', onAbort)
    }

    if (!res.ok) {
      let message: string | null = null
      try {
        const data = (await res.json()) as { error?: unknown }
        if (typeof data?.error === 'string') message = data.error
      } catch { /* kein JSON */ }
      throw new SuchlageError(classifyStatus(res.status), res.status, message)
    }
    if (ro.expect === 'none' || res.status === 204) return undefined as T
    try {
      return (await res.json()) as T
    } catch {
      throw new SuchlageError('other', res.status, 'Antwort von Suchlage nicht lesbar')
    }
  }

  const m = (id: number) => `/missions/${encodeURIComponent(String(id))}`

  return {
    isConfigured: () => baseUrl !== null,
    /** Startseite von Suchlage (zeigt den laufenden Einsatz). */
    webUrl: () => (baseUrl ? `${baseUrl}/` : null),

    me: (signal?: AbortSignal) => request<FmMe>('/me', { signal }),
    listMissions: (signal?: AbortSignal) => request<FmMission[]>('/missions', { signal }),
    createMission: (body: FmMissionCreate) =>
      request<FmMission>('/missions', { method: 'POST', json: body }),
    linkMission: (id: number, body: FmMissionLink) =>
      request<FmMission>(`${m(id)}/link`, { method: 'POST', json: body }),
    createSection: (id: number, fmMissionId: string, body: FmSectionCreate) =>
      request<FmMission>(`${m(id)}/sections`, { method: 'POST', json: body, fmMissionId }),
    flights: (id: number, fmMissionId: string, signal?: AbortSignal) =>
      request<FmFlight[]>(`${m(id)}/flights`, { fmMissionId, signal }),
    map: (id: number, fmMissionId: string, fmSectionId?: string | null, signal?: AbortSignal) =>
      request<FmFeatureCollection>(
        `${m(id)}/map${fmSectionId ? `?section=${encodeURIComponent(fmSectionId)}` : ''}`,
        { fmMissionId, signal },
      ),
    importMap: (id: number, fmMissionId: string, body: FmMapImport) =>
      request<FmMapImportResult>(`${m(id)}/map/import`, { method: 'POST', json: body, fmMissionId }),
    uploadPhoto: (id: number, fmMissionId: string, fmSectionId: string, jpeg: Blob) =>
      request<void>(`${m(id)}/sections/${encodeURIComponent(fmSectionId)}/photo`, {
        method: 'PUT',
        body: jpeg,
        contentType: 'image/jpeg',
        fmMissionId,
        expect: 'none',
      }),
    closeMission: (id: number, fmMissionId: string) =>
      request<FmMission>(`${m(id)}/close`, { method: 'POST', fmMissionId }),
  }
}

export type SuchlageClient = ReturnType<typeof createSuchlageClient>

/** Der Client der App: Adresse aus der Build-Konfiguration, Token vom AuthProvider. */
export const suchlage: SuchlageClient = createSuchlageClient({
  baseUrl: (import.meta.env.VITE_SUCHLAGE_URL as string | undefined) ?? null,
  getToken: getAccessToken,
})

export function isSuchlageConfigured(): boolean {
  return suchlage.isConfigured()
}
