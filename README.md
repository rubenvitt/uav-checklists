# UAV Einsatzverwaltung

Progressive Web App zur Verwaltung von UAV-Einsätzen (Drohnenflüge) mit Vorflugchecklisten, Wetterbewertung, SORA-Risikoklassifizierung und PDF-Berichterstellung. Entwickelt für den realen Einsatzbetrieb deutschsprachiger Drohnenpiloten — alle Daten bleiben lokal im Browser.

## Features

### Einsatzverwaltung mit 4 Phasen

Jeder Einsatz durchläuft einen strukturierten Workflow:

1. **Einsatzdaten** — Standort, Einsatzdetails, Auftrag, Truppstärke und interaktive Einsatzkarte
2. **Vorflugkontrolle** — Wetterbewertung, Umgebungsprüfung, Fluganmeldungen und SORA-Risikoklassifizierung
3. **Flüge** — Dokumentation der durchgeführten Flüge
4. **Nachbereitung** — Einsatzabschluss und PDF-Export

### Wetterbewertung

- Echtzeit-Wetterdaten von [Open-Meteo](https://open-meteo.com/) (Wind, Böen, Temperatur, Niederschlag, Sichtweite, Luftfeuchtigkeit, Druck, Taupunkt)
- Windgeschwindigkeiten auf mehreren Höhen (10m, 80m, 120m, 180m), interpoliert auf die gewählte Flughöhe
- Geomagnetischer K-Index von [NOAA SWPC](https://www.swpc.noaa.gov/)
- 24-Stunden-Vorhersage und Sonnenauf-/untergangszeiten
- Automatische Bewertung aller Metriken gegen drohnenspezifische Grenzwerte (`gut` / `Vorsicht` / `Warnung`)
- Kontextbezogene Handlungsempfehlungen auf Deutsch

### SORA-Risikoklassifizierung

- **GRC** (Ground Risk Class) — Fragebogen zur Bestimmung des Bodenrisikos
- **ARC** (Air Risk Class) — Fragebogen zur Bestimmung des Luftraumrisikos
- **SAIL** (Specific Assurance and Integrity Level) — automatisch berechnet aus GRC + ARC

### Umgebungsprüfung

Automatische Abfrage nahegelegener Infrastruktur über [Overpass/OpenStreetMap](https://overpass-api.de/):
- Lufträume, Straßen, Bahnlinien, Wasserwege
- Stromleitungen, Krankenhäuser, Naturschutzgebiete

### Interaktive Einsatzkarte

- Leaflet-Karte mit [Geoman](https://geoman.io/)-Zeichenwerkzeugen (Polygon, Kreis, Marker, Linie)
- Automatische Flächenberechnung für Polygone
- Snapshot-Speicherung als Bild für den PDF-Export
- Alternativ: Foto-Upload als Einsatzkarte

### PDF-Berichterstellung

Umfassender Einsatzbericht mit allen erfassten Daten:
- Einsatzdetails, Auftrag und Truppstärke
- Wetterbewertung mit allen Metriken
- SORA-Risikoklassifizierung (GRC/ARC/SAIL)
- Einsatzkarte (Snapshot oder Foto)
- Fluganmeldungen und Umgebungsprüfung

### Weitere Features

- **Offline-fähig** — Service Worker mit Workbox (NetworkFirst für APIs, CacheFirst für Kartenkacheln)
- **Dark/Light/System-Theme** — mit automatischer Umschaltung bei Sonnenauf-/untergang
- **Datenschutz** — kein Backend, keine Cloud, alle Daten in localStorage
- **Auto-Cleanup** — aktive Einsätze 56h, abgeschlossene 24h, dann automatische Löschung
- **Drohnen-Registry** — vorkonfigurierte Drohnenprofile (DJI Matrice 350 RTK, DJI Matrice 200)

## Tech Stack

| Technologie | Zweck |
|---|---|
| [React](https://react.dev/) 19 | UI-Framework |
| [TypeScript](https://www.typescriptlang.org/) 5.9 (strict) | Typsicherheit |
| [Vite](https://vite.dev/) 8 | Build-Tool und Dev-Server |
| [Tailwind CSS](https://tailwindcss.com/) 4 | Utility-First CSS |
| [React Router](https://reactrouter.com/) 7 | Client-Side Routing |
| [TanStack Query](https://tanstack.com/query) 5 | Server-State Management und Caching |
| [React Leaflet](https://react-leaflet.js.org/) 5 | Kartenintegration |
| [Leaflet Geoman](https://geoman.io/) | Zeichenwerkzeuge für die Karte |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF-Generierung |
| [React Compiler](https://react.dev/learn/react-compiler) | Auto-Memoization |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | PWA mit Workbox Service Worker |

## Erste Schritte

### Voraussetzungen

- [Node.js](https://nodejs.org/) (>= 18)
- [pnpm](https://pnpm.io/)

### Installation

```bash
# Repository klonen
git clone https://github.com/rubenvitt/uav-checklists.git
cd uav-checklists

# Abhängigkeiten installieren
pnpm install
```

### Entwicklung

```bash
# Dev-Server starten
pnpm dev

# TypeScript-Check + Production-Build
pnpm build

# Linting
pnpm lint

# Production-Build vorab anschauen
pnpm preview
```

## Projektstruktur

```
src/
├── components/
│   ├── sections/          # Feature-Abschnitte der einzelnen Phasen
│   │   ├── WeatherSection         # Wetterbewertung
│   │   ├── RiskClassSection       # SORA-Risikoklassifizierung
│   │   ├── NearbyCheckSection     # Umgebungsprüfung (Overpass)
│   │   ├── AnmeldungenSection     # Fluganmeldungen
│   │   ├── EinsatzdetailsSection  # Einsatz-Stammdaten
│   │   ├── EinsatzauftragSection  # Einsatzauftrag und Vorlagen
│   │   ├── EinsatzkarteSection    # Karte oder Foto
│   │   ├── TruppstaerkeSection    # Personalverwaltung
│   │   ├── RahmenangabenSection   # Drohne und Flughöhe
│   │   └── ExternalToolsSection   # Links zu externen Diensten
│   ├── map/               # Leaflet-Karte mit Geoman-Zeichentools
│   ├── *Phase.tsx          # Phasen-Komponenten (Einsatzdaten, Vorflug, Flüge, Nachbereitung)
│   ├── MissionOverview.tsx # Einsatzübersicht (Start, Liste, Löschen)
│   └── MissionStepper.tsx  # Phasen-Navigation
├── hooks/                  # Custom Hooks (TanStack Query, localStorage, Geolocation)
├── services/               # API-Clients (Open-Meteo, NOAA, Overpass, Nominatim)
├── data/                   # Statische Daten (Drohnenspecs, Schwellenwerte)
├── types/                  # TypeScript-Typen
├── utils/                  # Hilfsfunktionen (Storage, PDF, Bewertung, Formatierung)
└── context/                # React Context (MissionId)
```

## Externe APIs

| API | Dienst | Cache-Strategie |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | Wetter und Vorhersage | TanStack Query 10 min + Service Worker 10 min |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Geomagnetischer K-Index | TanStack Query 1 h + Service Worker 1 h |
| [Overpass](https://overpass-api.de/) | Nahegelegene Infrastruktur (OSM) | localStorage 8 h |
| [Nominatim](https://nominatim.openstreetmap.org/) | Reverse Geocoding | TanStack Query |
| [OpenStreetMap Tiles](https://www.openstreetmap.org/) | Kartenkacheln | Service Worker CacheFirst 7 Tage |

Alle APIs sind öffentlich zugänglich und erfordern keine API-Keys.

## Datenpersistenz

Sämtliche Daten werden ausschließlich im Browser gespeichert:

- **Einsatzliste** — `localStorage` mit `useSyncExternalStore` für reaktive Updates
- **Formulardaten** — pro Einsatz unter `uav-form:{missionId}:{key}` in `localStorage`
- **API-Antworten** — TanStack Query Cache (In-Memory + localStorage-Persistierung)
- **Kartendaten** — GeoJSON-Features in `localStorage`
- **Service Worker** — Workbox-Cache für Offline-Nutzung

## Lizenz

Siehe [LICENSE](LICENSE) für Details.
