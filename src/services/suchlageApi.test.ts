import { describe, expect, it, vi } from 'vitest'
import { MISSION_HEADER, SuchlageError, classifyStatus, createSuchlageClient, isRestingErrorKind, sameMissionId, suchlage } from './suchlageApi'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function setup(opts: { baseUrl?: string | null; token?: string | null; response?: () => Response | Promise<Response> } = {}) {
  const fetchMock = vi.fn(async () => (opts.response ? opts.response() : jsonResponse(200, {})))
  const client = createSuchlageClient({
    baseUrl: opts.baseUrl === undefined ? 'https://suchlage.example/' : opts.baseUrl,
    getToken: () => (opts.token === undefined ? 'tok' : opts.token),
    fetch: fetchMock as unknown as typeof fetch,
  })
  return { client, fetchMock }
}

async function caught(p: Promise<unknown>): Promise<SuchlageError> {
  try {
    await p
  } catch (e) {
    expect(e).toBeInstanceOf(SuchlageError)
    return e as SuchlageError
  }
  throw new Error('kein Fehler geworfen')
}

describe('suchlageApi ohne Konfiguration oder Anmeldung', () => {
  it('der App-Client ohne VITE_SUCHLAGE_URL ist aus und sendet nichts', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    expect(suchlage.isConfigured()).toBe(false)
    expect(suchlage.webUrl()).toBeNull()
    await caught(suchlage.me())
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('ohne Adresse keine Anfrage', async () => {
    const { client, fetchMock } = setup({ baseUrl: '  ' })
    const err = await caught(client.listMissions())
    expect(err.kind).toBe('unavailable')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ohne Token keine Anfrage', async () => {
    const { client, fetchMock } = setup({ token: null })
    const err = await caught(client.me())
    expect(err.kind).toBe('unauthorized')
    expect(err.status).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('suchlageApi Anfragen', () => {
  it('setzt Bearer, Pfad und Einsatz-Header', async () => {
    const { client, fetchMock } = setup({ response: () => jsonResponse(200, []) })
    await client.flights(42, 'fm-uuid')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://suchlage.example/api/flugmappe/v1/missions/42/flights')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok')
    expect(headers[MISSION_HEADER]).toBe('fm-uuid')
    expect(init.credentials).toBe('omit')
  })

  it('liest den Zustand des Einsatzes mit Einsatz-Header', async () => {
    const { client, fetchMock } = setup({ response: () => jsonResponse(200, { id: 5, state: 'closed' }) })
    const m = await client.mission(5, 'fm')
    expect(m.state).toBe('closed')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://suchlage.example/api/flugmappe/v1/missions/5')
    expect((init.headers as Record<string, string>)[MISSION_HEADER]).toBe('fm')
  })

  it('ohne Einsatzbezug kein Einsatz-Header', async () => {
    const { client, fetchMock } = setup({ response: () => jsonResponse(200, { name: 'A', role: 'operator', api_version: 1 }) })
    const me = await client.me()
    expect(me.name).toBe('A')
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>)[MISSION_HEADER]).toBeUndefined()
  })

  it('schickt JSON beim Anlegen und den Abschnitt in der Karte', async () => {
    const { client, fetchMock } = setup({ response: () => jsonResponse(200, { type: 'FeatureCollection', features: [] }) })
    await client.map(7, 'fm', 'seg 1')
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://suchlage.example/api/flugmappe/v1/missions/7/map?section=seg%201')
    await client.createMission({
      name: 'N', location: null, section_label: 'Standort 1', section_location: null,
      flugmappe_mission_id: 'fm', flugmappe_section_id: 's1',
    })
    const init = (fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1]
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body as string).flugmappe_mission_id).toBe('fm')
  })

  it('lädt das Kartenfoto als JPEG hoch und erwartet keinen Inhalt', async () => {
    const { client, fetchMock } = setup({ response: () => new Response(null, { status: 204 }) })
    await client.uploadPhoto(3, 'fm', 'seg', new Blob([new Uint8Array([0xff, 0xd8, 0xff])]))
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://suchlage.example/api/flugmappe/v1/missions/3/sections/seg/photo')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('image/jpeg')
  })
})

describe('suchlageApi Fehlerklassen', () => {
  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [409, 'conflict'],
    [422, 'unprocessable'],
    [503, 'unavailable'],
    [502, 'offline'],
    [404, 'other'],
    [500, 'other'],
  ] as const)('%i → %s', (status, kind) => {
    expect(classifyStatus(status)).toBe(kind)
  })

  it('übernimmt die Meldung aus ApiError', async () => {
    const { client } = setup({ response: () => jsonResponse(409, { error: 'Ein anderer Einsatz läuft' }) })
    const err = await caught(client.linkMission(1, {
      flugmappe_mission_id: 'fm', flugmappe_section_id: 's', section_label: 'S', section_location: null, take_over: false,
    }))
    expect(err.kind).toBe('conflict')
    expect(err.status).toBe(409)
    expect(err.serverMessage).toBe('Ein anderer Einsatz läuft')
  })

  it('Netzfehler ist offline', async () => {
    const { client } = setup({ response: () => Promise.reject(new TypeError('Failed to fetch')) })
    const err = await caught(client.me())
    expect(err.kind).toBe('offline')
    expect(err.status).toBeNull()
  })

  it('Zeitlimit ist offline', async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_res, rej) => {
      init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
    }))
    const client = createSuchlageClient({
      baseUrl: 'https://s.example', getToken: () => 't', fetch: fetchMock as unknown as typeof fetch, timeoutMs: 5,
    })
    const err = await caught(client.me())
    expect(err.kind).toBe('offline')
  })
})

describe('suchlageApi Zeitlimits', () => {
  it('Kartenfoto hat ein eigenes, längeres Zeitlimit', async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((resolve, rej) => {
      const t = setTimeout(() => resolve(new Response(null, { status: 204 })), 30)
      init.signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('aborted', 'AbortError')) })
    }))
    const client = createSuchlageClient({
      baseUrl: 'https://s.example', getToken: () => 't', fetch: fetchMock as unknown as typeof fetch, timeoutMs: 5, uploadTimeoutMs: 1000,
    })
    await expect(client.uploadPhoto(1, 'fm', 'seg', new Blob([]))).resolves.toBeUndefined()
    const err = await caught(client.me())
    expect(err.kind).toBe('offline')
  })
})

describe('suchlageApi Hilfen', () => {
  it('401/403 und 503 (Schnittstelle aus) lassen die Teile ruhen, Netzfehler nicht', () => {
    expect(isRestingErrorKind('unauthorized')).toBe(true)
    expect(isRestingErrorKind('forbidden')).toBe(true)
    expect(isRestingErrorKind('unavailable')).toBe(true)
    expect(isRestingErrorKind('offline')).toBe(false)
    expect(isRestingErrorKind('conflict')).toBe(false)
  })

  it('vergleicht Einsatz-UUIDs ohne Groß-/Kleinschreibung', () => {
    expect(sameMissionId('0F6B2A1E-5D43-4C8E-9B7A-2E1F3C4D5A6B', '0f6b2a1e-5d43-4c8e-9b7a-2e1f3c4d5a6b')).toBe(true)
    expect(sameMissionId('a', 'b')).toBe(false)
    expect(sameMissionId(null, 'a')).toBe(false)
  })
})
