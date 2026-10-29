/**
 * Nachgebildetes Suchlage für die Handbuch-Aufnahmen (Verknüpfung, erkannte
 * Flüge, Karte aus Suchlage). Es läuft kein Suchlage-Server: Playwright
 * beantwortet die Anfragen der App (`route`) mit den Beispieldaten aus
 * suchlage-fixtures.mjs, angepasst an den Beispiel-Einsatz aus seed.mjs.
 *
 * Die App muss dafür mit Suchlage-Adresse und Anmeldung gebaut sein:
 *
 *   pnpm dev --mode handbuch     # im Projektwurzelverzeichnis, liest .env.handbuch
 *
 * Die Adressen hier müssen zu `.env.handbuch` passen. Ohne diesen Modus fehlt
 * der Abschnitt „Suchlage“; die Skripte melden das und überspringen die
 * Suchlage-Bilder, alle anderen Aufnahmen bleiben gleich.
 */
import { fmFlights, fmMap, fmMe, fmMissions } from './suchlage-fixtures.mjs'

export const SUCHLAGE_URL = 'https://suchlage.handbuch.invalid'
const SIGN_URL = 'https://sign.handbuch.invalid'
const OIDC_AUTHORITY = 'https://id.handbuch.invalid'
const OIDC_CLIENT_ID = 'flugmappe-handbuch'
const API = `${SUCHLAGE_URL}/api/flugmappe/v1`

/** Einsatz-ID in Suchlage, mit dem der Beispiel-Einsatz verknüpft wird. */
export const SL_MISSION_ID = 4
/** Suchlage-Flüge zu den Einträgen des Beispiel-Einsatzes (seed.mjs: f1, f2, f3). */
export const SL_FLIGHT = { f1: 6, f2: 8, f3: 7 }

const clone = (v) => JSON.parse(JSON.stringify(v))
const minsAgo = (now, m) => now - m * 60e3

/**
 * Kartenelemente der Beispieldaten liegen bei Hannover-Lahe; verschoben auf
 * das Einsatzgebiet des Beispiel-Einsatzes (Herrenhäuser Gärten).
 */
const SHIFT = [9.6965 - 10.012, 52.387 - 52.43175]
function shift(coords) {
  if (typeof coords[0] === 'number') return [coords[0] + SHIFT[0], coords[1] + SHIFT[1]]
  return coords.map(shift)
}

/**
 * Suchlage-Stand passend zum Beispiel-Einsatz. Aus den Beispieldaten:
 * Nutzer, Einsätze (einer läuft, einer ist schon mit einer anderen Flugmappe
 * verknüpft), Flüge mit Fluggerät, Höhe, Strecke, Fotos und die Karte mit
 * Suchgebiet und gestrichelter Flugspur.
 */
export function buildSuchlage(now, { MID, SEG }) {
  const [vermisst, kiesgrube] = clone(fmMissions)

  // Unser Einsatz: läuft in Suchlage, noch mit keiner Flugmappe verknüpft.
  const ours = {
    ...vermisst,
    id: SL_MISSION_ID,
    name: 'Hochwasser Deich Nord',
    location: 'Hannover-Herrenhausen',
    created_by: 'Erika Mustermann',
    created_at_ms: minsAgo(now, 100),
    started_at_ms: minsAgo(now, 90),
    link: null,
    sections: [{ ...vermisst.sections[0], id: 7, flugmappe_section_id: null, created_at_ms: minsAgo(now, 100) }],
  }
  // Der zweite: vorbereitet und schon an einer anderen Flugmappe („Übernehmen …“).
  const other = {
    ...kiesgrube,
    id: 3,
    created_at_ms: minsAgo(now, 180),
    link: { ...vermisst.link, linked_at_ms: minsAgo(now, 170) },
  }

  const [landed, running] = clone(fmFlights)
  const track = (id, startMin, endMin) => ({
    started_at_ms: minsAgo(now, startMin),
    ended_at_ms: minsAgo(now, endMin),
    end_reason: 'landed',
    flugmappe_section_id: SEG,
    id,
  })
  const flights = [
    { ...landed, ...track(SL_FLIGHT.f1, 64, 41) },
    // Startet eine Minute nach dem eigenen Eintrag f2 → „Mit Flug 2 zusammenführen“.
    { ...landed, ...track(SL_FLIGHT.f2, 37, 17), distance_m: 1480, max_elevation_m: 60, photo_count: 14 },
    { ...running, ...track(SL_FLIGHT.f3, 14, 3), distance_m: 920, max_elevation_m: 45, photo_count: 3 },
  ]

  const map = clone(fmMap)
  for (const f of map.features) {
    f.geometry.coordinates = shift(f.geometry.coordinates)
    if (f.properties.kind === 'flight_track') {
      Object.assign(f.properties, { flight_id: SL_FLIGHT.f3, name: `Flug ${SL_FLIGHT.f3}`, flugmappe_section_id: SEG, started_at_ms: minsAgo(now, 14), ended_at_ms: minsAgo(now, 3) })
    }
  }
  // Mäanderflug über das Suchgebiet (Flug f1), wie Suchlage ihn aufzeichnet.
  const [[x0, y0], , [x1, y1]] = map.features[0].geometry.coordinates[0]
  const lanes = 5
  const sweep = []
  for (let i = 0; i < lanes; i++) {
    const y = y0 + ((y1 - y0) * (i + 0.5)) / lanes
    const row = [[x0 + 0.0004, y], [x1 - 0.0004, y]]
    sweep.push(...(i % 2 ? row.reverse() : row))
  }
  map.features.push({
    type: 'Feature',
    geometry: { type: 'MultiLineString', coordinates: [sweep] },
    properties: { kind: 'flight_track', flight_id: SL_FLIGHT.f1, name: `Flug ${SL_FLIGHT.f1}`, color: '#0091FF', flugmappe_section_id: SEG, started_at_ms: minsAgo(now, 64), ended_at_ms: minsAgo(now, 41) },
  })

  return { me: clone(fmMe), missions: [ours, other], flights, map, MID, SEG }
}

/**
 * localStorage-Einträge für eine angemeldete Einsatzkraft (oidc-client-ts,
 * Schlüssel `oidc.user:<authority>:<client_id>`). Das Token ist erfunden; nur
 * die Antworten aus `routeSuchlage` nehmen es entgegen.
 */
export function loginStorage(now) {
  const user = {
    id_token: 'handbuch',
    session_state: null,
    access_token: 'handbuch-zugriffstoken',
    token_type: 'Bearer',
    scope: 'openid profile email groups',
    profile: { sub: 'handbuch-nutzer', name: fmMe.name, iss: OIDC_AUTHORITY, aud: OIDC_CLIENT_ID, exp: Math.floor(now / 1000) + 8 * 3600, iat: Math.floor(now / 1000) },
    expires_at: Math.floor(now / 1000) + 8 * 3600,
  }
  return { [`oidc.user:${OIDC_AUTHORITY}:${OIDC_CLIENT_ID}`]: JSON.stringify(user) }
}

/**
 * Formularfeld `suchlage:link` wie nach „Wählen“: Der Beispiel-Einsatz ist mit
 * dem Suchlage-Einsatz verknüpft, sein Abschnitt dort angelegt.
 */
export function linkStorage(sl, linkedAt) {
  return {
    [`uav-form:${sl.MID}:suchlage:link`]: JSON.stringify({
      value: {
        suchlageMissionId: SL_MISSION_ID,
        missionName: sl.missions[0].name,
        linkedAt,
        sections: { [sl.SEG]: true },
        mapImport: 'ok',
      },
      timestamp: linkedAt,
    }),
  }
}

/** Bezug eines bestätigten Flugbucheintrags auf einen Suchlage-Flug (`FlightLogEntry.suchlage`). */
export function suchlageRef(f) {
  return {
    flightId: f.id,
    aircraftSn: f.aircraft_sn,
    aircraftLabel: f.aircraft_label,
    maxElevationM: f.max_elevation_m,
    distanceM: f.distance_m,
    photoCount: f.photo_count,
    endReason: f.ended_at_ms === null ? null : (f.end_reason ?? 'landed'),
  }
}

/**
 * Flugbuch des Beispiel-Einsatzes bei verknüpftem Einsatz. `confirmed` nennt
 * die Einträge (f1, f2, f3), die schon mit ihrem Suchlage-Flug verbunden sind;
 * `drop` die, die es noch nicht gibt (Suchlage zeigt sie als Vorschlag).
 */
export function linkFlightLog(storage, sl, { confirmed = [], drop = [] } = {}) {
  const k = `uav-form:${sl.MID}:flightlog:entries`
  const entries = JSON.parse(storage[k]).value
    .filter((e) => !drop.includes(e.id))
    .map((e) => {
      if (!confirmed.includes(e.id)) return e
      const f = sl.flights.find((x) => x.id === SL_FLIGHT[e.id])
      return { ...e, blockOff: new Date(f.started_at_ms).toISOString(), blockOn: new Date(f.ended_at_ms).toISOString(), suchlage: suchlageRef(f) }
    })
  storage[k] = JSON.stringify({ value: entries, timestamp: Date.now() })
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-flugmappe-einsatz',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
}

/**
 * Beantwortet Suchlage, Anmeldung und Signatur-Backend im Kontext `ctx`.
 * `sl` (aus `buildSuchlage`) ist der Zustand und ändert sich mit dem
 * Verknüpfen und Abschließen. Signatur-Backend und Anmeldedienst antworten
 * nicht (wie offline): Für Suchlage reicht der gespeicherte Nutzer.
 */
export async function routeSuchlage(ctx, sl) {
  const json = (route, body, status = 200) =>
    route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) })

  await ctx.route(`${API}/**`, async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const url = new URL(req.url())
    const p = url.pathname.slice(new URL(API).pathname.length)
    const m = /^\/missions\/(\d+)(\/.*)?$/.exec(p)
    const mission = m ? sl.missions.find((x) => x.id === Number(m[1])) : null
    const rest = m?.[2] ?? ''

    if (p === '/me') return json(route, sl.me)
    if (p === '/missions' && req.method() === 'GET') return json(route, sl.missions.filter((x) => x.state !== 'closed'))
    if (m && !mission) return json(route, { error: 'Einsatz nicht gefunden' }, 404)
    if (mission && rest === '' && req.method() === 'GET') return json(route, mission)
    if (mission && rest === '/link' && req.method() === 'POST') {
      const body = req.postDataJSON()
      mission.link = { flugmappe_mission_id: body.flugmappe_mission_id, linked_at_ms: Date.now(), linked_by: sl.me.name }
      mission.sections[0].flugmappe_section_id = body.flugmappe_section_id
      return json(route, mission)
    }
    if (mission && rest === '/map/import') return json(route, { imported: 2 })
    if (mission && rest === '/flights') return json(route, mission.id === SL_MISSION_ID ? sl.flights : [])
    if (mission && rest === '/map') return json(route, sl.map)
    if (mission && rest === '/sections' && req.method() === 'POST') return json(route, mission)
    if (mission && /^\/sections\/[^/]+\/photo$/.test(rest)) return route.fulfill({ status: 204, headers: CORS })
    if (mission && rest === '/close' && req.method() === 'POST') {
      mission.state = 'closed'
      return json(route, mission)
    }
    console.log('    (Suchlage: unerwartete Anfrage', req.method(), p, ')')
    return json(route, { error: 'nicht nachgebildet' }, 404)
  })
  // ADS-B läuft bei gesetztem Signatur-Backend über dessen Adresse — das bedient lib.mjs.
  await ctx.route(`${SIGN_URL}/**`, (route) =>
    route.request().url().includes('/adsb/point/') ? route.fallback() : route.abort('internetdisconnected'),
  )
  await ctx.route(`${OIDC_AUTHORITY}/**`, (route) => route.abort('internetdisconnected'))
}

/** Ist die App mit Suchlage gebaut (`pnpm dev --mode handbuch`)? Sonst Hinweis und `false`. */
export async function suchlageAvailable(page) {
  const ok = await page
    .locator('section')
    .filter({ has: page.getByText('Suchlage', { exact: true }) })
    .first()
    .waitFor({ timeout: 8000 })
    .then(() => true, () => false)
  if (!ok) console.log('    (Abschnitt „Suchlage“ fehlt — PWA mit `pnpm dev --mode handbuch` starten; Suchlage-Bilder übersprungen)')
  return ok
}
