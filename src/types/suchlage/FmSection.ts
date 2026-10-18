// PROVISORISCH nach rubenvitt/suchlage docs/superpowers/plans/2026-10-18-flugmappe-schnittstelle.md §3 (SUL-66).
// Wird durch die von Suchlage erzeugte Kopie aus frontend/src/contract/generated/ ersetzt.
export type FmSection = { id: number, flugmappe_section_id: string | null, label: string, location: string | null, created_at_ms: number, has_map_photo: boolean, };
