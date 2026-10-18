// PROVISORISCH nach rubenvitt/suchlage docs/superpowers/plans/2026-10-18-flugmappe-schnittstelle.md §3 (SUL-66).
// Wird durch die von Suchlage erzeugte Kopie aus frontend/src/contract/generated/ ersetzt.
export type FmMissionCreate = { name: string, location: string | null, section_label: string, section_location: string | null, flugmappe_mission_id: string, flugmappe_section_id: string, };
