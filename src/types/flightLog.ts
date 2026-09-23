import type { PayloadId } from './payload'

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
}

export interface EventNote {
  id: string
  timestamp: string // ISO timestamp
  text: string
  segmentId?: string
  /** Automatisch angelegt, z. B. von der ADS-B-Überwachung */
  source?: 'adsb'
}
