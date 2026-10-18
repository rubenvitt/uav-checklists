import type { PayloadId } from './payload'
import type { FlightEndReason } from './suchlage'

/** Bezug eines Flugbucheintrags auf einen von Suchlage erkannten Flug (Werte aus der Telemetrie). */
export interface SuchlageFlightRef {
  flightId: number
  aircraftSn: string
  aircraftLabel: string | null
  maxElevationM: number | null
  distanceM: number | null
  photoCount: number
  /** `null`, solange der Flug in Suchlage läuft */
  endReason: FlightEndReason | null
}

export type LandingStatus = 'ok' | 'auffaellig' | 'notfall'

export interface FlightLogEntry {
  id: string
  blockOff: string // ISO timestamp for takeoff
  blockOn: string | null // ISO timestamp for landing, null = still in flight
  fernpilot: string
  lrb: string
  landungStatus: LandingStatus // default 'ok'
  bemerkung: string // optional remarks
  segmentId?: string
  /** Während dieses Flugs montierte Nutzlast; fehlt bei Einträgen vor Einführung der Payload-Auswahl */
  payloads?: PayloadId[]
  /** Nur bei bestätigten Flügen aus Suchlage; fehlt bei manuellen Einträgen */
  suchlage?: SuchlageFlightRef
}

export interface EventNote {
  id: string
  timestamp: string // ISO timestamp
  text: string
  segmentId?: string
  /** Automatisch angelegt, z. B. von der ADS-B-Überwachung */
  source?: 'adsb'
}
