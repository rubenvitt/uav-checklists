export interface FlightLogEntry {
  id: string
  blockOff: string // ISO timestamp for takeoff
  blockOn: string | null // ISO timestamp for landing, null = still in flight
  fernpilot: string
  lrb: string
  landungOk: boolean // default true, set on landing
  bemerkung: string // optional remarks
}
