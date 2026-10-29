/**
 * Beispieldaten der Flugmappe-Schnittstelle von Suchlage, wörtlich kopiert.
 *
 * Herkunft: rubenvitt/suchlage frontend/src/contract/fixtures.generated.ts,
 * Stand 37808d8 (erzeugt von `cargo test contract`). Nicht von Hand ändern —
 * bei einem neuen Stand von dort neu kopieren. Angepasst (Zeiten, IDs,
 * Koordinaten des Beispiel-Einsatzes) wird erst in suchlage.mjs.
 */

export const fmMe = {
  "api_version": 1,
  "name": "Gruppenführer I&K",
  "role": "operator"
}

export const fmMissions = [
  {
    "created_at_ms": 1792146400000,
    "created_by": "Gruppenführer I&K",
    "id": 3,
    "link": {
      "flugmappe_mission_id": "0f6b2a1e-5d43-4c8e-9b7a-2e1f3c4d5a6b",
      "linked_at_ms": 1792146400000,
      "linked_by": "Gruppenführer I&K"
    },
    "location": "Forst Nord",
    "name": "Vermisste Person Waldweg",
    "sections": [
      {
        "created_at_ms": 1792146400000,
        "flugmappe_section_id": "6a1d9c2b-3e4f-4a5b-8c7d-9e0f1a2b3c4d",
        "has_map_photo": false,
        "id": 4,
        "label": "Abschnitt 1",
        "location": null
      },
      {
        "created_at_ms": 1792148800000,
        "flugmappe_section_id": "b7e8f9a0-1b2c-4d3e-8f4a-5b6c7d8e9f0a",
        "has_map_photo": true,
        "id": 5,
        "label": "Verlegung Waldrand",
        "location": null
      }
    ],
    "started_at_ms": 1792146400000,
    "state": "running"
  },
  {
    "created_at_ms": 1792149400000,
    "created_by": "Erika Mustermann",
    "id": 4,
    "link": null,
    "location": null,
    "name": "Übung Kiesgrube",
    "sections": [
      {
        "created_at_ms": 1792149400000,
        "flugmappe_section_id": null,
        "has_map_photo": false,
        "id": 6,
        "label": "Abschnitt 1",
        "location": null
      }
    ],
    "started_at_ms": null,
    "state": "prepared"
  }
]

export const fmFlights = [
  {
    "aircraft_label": "RC Plus 1",
    "aircraft_sn": "ACSIM0001",
    "distance_m": 2310.0,
    "end_reason": "landed",
    "ended_at_ms": 1792148680000,
    "flugmappe_section_id": "6a1d9c2b-3e4f-4a5b-8c7d-9e0f1a2b3c4d",
    "id": 6,
    "max_elevation_m": 85.0,
    "photo_count": 2,
    "started_at_ms": 1792147600000
  },
  {
    "aircraft_label": "RC Plus 1",
    "aircraft_sn": "ACSIM0001",
    "distance_m": 431.0,
    "end_reason": null,
    "ended_at_ms": null,
    "flugmappe_section_id": "b7e8f9a0-1b2c-4d3e-8f4a-5b6c7d8e9f0a",
    "id": 7,
    "max_elevation_m": 62.0,
    "photo_count": 0,
    "started_at_ms": 1792149400000
  }
]

export const fmMap = {
  "features": [
    {
      "geometry": {
        "coordinates": [
          [
            [
              10.008,
              52.433
            ],
            [
              10.016,
              52.433
            ],
            [
              10.016,
              52.4305
            ],
            [
              10.008,
              52.4305
            ],
            [
              10.008,
              52.433
            ]
          ]
        ],
        "type": "Polygon"
      },
      "properties": {
        "color": "#FFBB00",
        "id": "3f0c1a52-6d1e-4c39-9a51-0b7e2f4d8c11",
        "kind": "map_element",
        "name": "Suchgebiet Nord"
      },
      "type": "Feature"
    },
    {
      "geometry": {
        "coordinates": [
          [
            [
              10.01,
              52.43
            ],
            [
              10.0103,
              52.4302
            ],
            [
              10.0109,
              52.4306
            ]
          ],
          [
            [
              10.012,
              52.4315
            ],
            [
              10.0134,
              52.4321
            ]
          ]
        ],
        "type": "MultiLineString"
      },
      "properties": {
        "color": "#B620E0",
        "ended_at_ms": null,
        "flight_id": 7,
        "flugmappe_section_id": "b7e8f9a0-1b2c-4d3e-8f4a-5b6c7d8e9f0a",
        "kind": "flight_track",
        "name": "Flug 7",
        "started_at_ms": 1792149400000
      },
      "type": "Feature"
    }
  ],
  "type": "FeatureCollection"
}
