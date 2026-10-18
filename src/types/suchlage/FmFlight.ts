// PROVISORISCH nach rubenvitt/suchlage docs/superpowers/plans/2026-10-18-flugmappe-schnittstelle.md §3 (SUL-66).
// Wird durch die von Suchlage erzeugte Kopie aus frontend/src/contract/generated/ ersetzt.
import type { FlightEndReason } from "./FlightEndReason";

export type FmFlight = { id: number, flugmappe_section_id: string | null, started_at_ms: number, ended_at_ms: number | null, end_reason: FlightEndReason | null, aircraft_sn: string, aircraft_label: string | null, max_elevation_m: number | null, distance_m: number | null, photo_count: number, };
