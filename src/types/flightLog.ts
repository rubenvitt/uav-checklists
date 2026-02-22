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
}

export interface EventNote {
  id: string
  timestamp: string // ISO timestamp
  text: string
  segmentId?: string
}
