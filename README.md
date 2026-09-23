# Flugmappe

**Flugmappe** ist eine Progressive Web App zur Verwaltung von UAV-Einsätzen (Drohnenflüge) mit Vorflugchecklisten, Wetterbewertung, SORA-Risikoklassifizierung und PDF-Berichterstellung. Entwickelt für den realen Einsatzbetrieb deutschsprachiger Drohnenpiloten — alle Daten bleiben lokal im Browser.

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
- DWD-Abgleich über [Bright Sky](https://brightsky.dev/) (nur Deutschland): aktuelle Messwerte der nächsten DWD-Station im Vergleich zu Open-Meteo sowie amtliche Wetter-/Unwetterwarnungen. Eine aktive Warnung erscheint als eigene Kachel in der Bewertung; Unwetter (Stufe „severe“/„extreme“) gilt als Warnung und damit als Empfehlung gegen die Freigabe. Quelle: Deutscher Wetterdienst (CC BY 4.0)
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

### Flugverkehr (ADS-B)

Live-Flugverkehr im Umkreis von 10 km aus Community-ADS-B-Daten ([adsb.lol](https://adsb.lol/), Fallback [adsb.fi](https://adsb.fi/)):
- Liste der Luftfahrzeuge mit Höhe über Grund (Geländehöhe von Open-Meteo), Entfernung, Richtung, Geschwindigkeit, Steig-/Sinkflug; Hubschrauber, militärischer Verkehr und Not-/Rettungsflüge werden markiert
- Bewertung: unter 500 m über Grund in bis zu 3 km Entfernung = Warnung, tieffliegender Verkehr weiter entfernt = Vorsicht
- Aktualisierung jede Minute; der letzte Stand wird je Einsatzabschnitt gespeichert und landet mit Uhrzeit im PDF
- Da die ADS-B-Dienste keine CORS-Header senden, läuft die Abfrage über den ADS-B-Proxy im optionalen Backend (`server/`, `GET /adsb/point/...`). Ist kein Proxy erreichbar (fehlende Konfiguration, „Failed to fetch“ durch CORS/Netzwerk, Route fehlt), zeigt die Sektion „Kein ADS-B-Server verbunden“ statt eines Fehlers, dazu einen Link zur Live-Karte; im Dev-Server leitet Vite direkt an adsb.lol weiter
- **Überwachung während der Flüge:** In der Flugphase wird der Verkehr weiter abgefragt (alle 30 s während eines Flugs, sonst jede Minute; ohne Server nur alle 5 min). Taucht ein neuer Tiefflieger auf (Bewertung ≥ Vorsicht) oder kommt ein bekannter näher, erscheint ein Banner, auf Wunsch eine Systembenachrichtigung (App im Hintergrund), und es wird automatisch ein Ereignis angelegt — damit steht es auch im Einsatzbericht. Hoch überfliegender Verkehr löst nichts aus; nach 15 min ohne Sichtung gilt ein Luftfahrzeug wieder als neu. Abschaltbar je Einsatz
- Abfrageintervall nach API-Policy: adsb.fi erlaubt 1 Anfrage/s je IP, adsb.lol drosselt dynamisch; der Backend-Proxy cacht je Standort 15 s
- Eine Cloudflare Pages Function als Proxy funktioniert nicht: Aus Cloudflare Workers heraus antwortet adsb.lol mit 429 (geteilte Egress-IPs) und adsb.fi mit 403
- ADS-B erfasst nicht jeden Verkehr (Segelflug, UL, Gleitschirme …) und ersetzt keine Luftraumbeobachtung

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

## Landingpage

Im Verzeichnis [`landing/`](landing/) liegt eine eigenständige, statische
Website, die das Projekt für andere Bereitschaften und Interessierte vorstellt.
Sie ist vollständig vom PWA-Build getrennt (eigenes `package.json`, eigene
Lockfile, eigener Vite-Build) und lässt sich unabhängig auf einer anderen Domain
ausliefern:

```bash
cd landing
pnpm install
pnpm dev      # http://localhost:5180
pnpm build    # statischer Build nach landing/dist/
```

Details, Screenshot-Werkzeuge und die vor dem Deployment anzupassenden Stellen
stehen in [`landing/README.md`](landing/README.md).

## Projektstruktur

```
src/
├── components/
│   ├── sections/          # Feature-Abschnitte der einzelnen Phasen
│   │   ├── WeatherSection         # Wetterbewertung
│   │   ├── RiskClassSection       # SORA-Risikoklassifizierung
│   │   ├── NearbyCheckSection     # Umgebungsprüfung (Overpass)
│   │   ├── FlightTrafficSection   # Flugverkehr (ADS-B)
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
├── services/               # API-Clients (Open-Meteo, Bright Sky/DWD, NOAA, Overpass, ADS-B, Nominatim)
├── data/                   # Statische Daten (Drohnenspecs, Schwellenwerte)
├── types/                  # TypeScript-Typen
├── utils/                  # Hilfsfunktionen (Storage, PDF, Bewertung, Formatierung)
└── context/                # React Context (MissionId)
```

## Externe APIs

| API | Dienst | Cache-Strategie |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | Wetter und Vorhersage | TanStack Query 10 min + Service Worker 10 min |
| [Bright Sky](https://brightsky.dev/) (DWD) | Stationsmessung + amtliche Warnungen (nur DE) | TanStack Query (Snapshot je Einsatzabschnitt) + Service Worker 10 min |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Geomagnetischer K-Index | TanStack Query 1 h + Service Worker 1 h |
| [Overpass](https://overpass-api.de/) | Nahegelegene Infrastruktur (OSM) | localStorage 8 h |
| [adsb.lol](https://adsb.lol/) / [adsb.fi](https://adsb.fi/) über Backend-Proxy | Live-Flugverkehr (ADS-B, ODbL) | TanStack Query 30 s, Refetch 60 s, Snapshot je Einsatzabschnitt; Service Worker NetworkOnly |
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
