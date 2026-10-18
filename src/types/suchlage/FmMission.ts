// PROVISORISCH nach rubenvitt/suchlage docs/superpowers/plans/2026-10-18-flugmappe-schnittstelle.md §3 (SUL-66).
// Wird durch die von Suchlage erzeugte Kopie aus frontend/src/contract/generated/ ersetzt.
import type { FmLinkInfo } from "./FmLinkInfo";
import type { FmSection } from "./FmSection";
import type { MissionState } from "./MissionState";

export type FmMission = { id: number, name: string, location: string | null, state: MissionState, started_at_ms: number | null, created_at_ms: number, created_by: string, sections: Array<FmSection>, link: FmLinkInfo | null, };
