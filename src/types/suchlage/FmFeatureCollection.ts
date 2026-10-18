// PROVISORISCH nach rubenvitt/suchlage docs/superpowers/plans/2026-10-18-flugmappe-schnittstelle.md §3 (SUL-66).
// Wird durch die von Suchlage erzeugte Kopie aus frontend/src/contract/generated/ ersetzt.
export type FmFeatureKind = "map_element" | "flight_track";

export type FmFeatureProperties = { kind: FmFeatureKind, name: string | null, color: string | null, flight_id: number | null, };

export type FmFeature = { type: "Feature", geometry: GeoJSON.Geometry, properties: FmFeatureProperties, };

export type FmFeatureCollection = { type: "FeatureCollection", features: Array<FmFeature>, };
