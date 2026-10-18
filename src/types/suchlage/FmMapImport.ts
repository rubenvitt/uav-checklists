// PROVISORISCH nach rubenvitt/suchlage docs/superpowers/plans/2026-10-18-flugmappe-schnittstelle.md §3 (SUL-66).
// Wird durch die von Suchlage erzeugte Kopie aus frontend/src/contract/generated/ ersetzt.
import type { FmImportFeature } from "./FmImportFeature";
import type { GeoPoint } from "./GeoPoint";

export type FmMapImport = { features: Array<FmImportFeature>, standort: GeoPoint | null, };
