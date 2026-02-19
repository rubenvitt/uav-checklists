# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

German-language PWA for UAV (drone) preflight checklists and mission management. Used for real-world drone flight operations — all data stays local in the browser (localStorage). The UI language is German throughout.

## Commands

```bash
pnpm dev        # Start Vite dev server
pnpm build      # TypeScript check + Vite production build
pnpm lint       # ESLint
pnpm preview    # Preview production build
```

Package manager is **pnpm**.

## Tech Stack

- React 19 + TypeScript (strict) + Vite 8 beta
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- React Router 7 (BrowserRouter, two routes: overview `/` and mission `/mission/:missionId/:phase`)
- TanStack React Query (weather/geo data caching, persisted to localStorage)
- jsPDF for PDF report export
- vite-plugin-pwa with Workbox (NetworkFirst for weather + K-index APIs)
- React Compiler (`babel-plugin-react-compiler`) enabled — auto-memoization, avoid manual `useMemo`/`useCallback` where the compiler handles it

## Architecture

### Mission Lifecycle (4 phases)

Each mission progresses through phases reflected in the URL (`/mission/:missionId/:phase`):

1. **einsatzdaten** — Mission data entry (location, drone selection, crew, assignment details)
2. **vorflugkontrolle** — Pre-flight checklist (weather assessment, nearby airspace check, risk classification, flight notifications)
3. **fluege** — Flight execution logging
4. **nachbereitung** — Post-flight wrap-up

`MissionStepper` renders the phase navigation. Phase components are rendered conditionally in `router.tsx`.

### State & Persistence

- **MissionContext** (`src/context/`) — provides `missionId` to nested components via `useMissionId()`
- **Mission storage** (`src/utils/missionStorage.ts`) — CRUD for missions in localStorage, 56h TTL with auto-cleanup
- **Form persistence** — `useMissionPersistedState<T>(key, initial)` stores form fields at `uav-form:${missionId}:${key}` in localStorage. `usePersistedState` is the non-mission-scoped variant.
- **useMissions** — uses `useSyncExternalStore` to reactively read the missions list from localStorage

### Data Flow: Weather Assessment

1. `useGeolocation` → browser Geolocation API (or manual override)
2. `useWeather(lat, lon, droneId)` → Open-Meteo API via `weatherApi.ts` → returns `WeatherData` with current + hourly forecasts + multi-altitude wind
3. `useKIndex` → SWPC NOAA API via `kIndexApi.ts`
4. Assessment logic evaluates metrics (wind, gusts, temperature, precipitation, visibility, humidity, pressure, dew point, K-index) against drone specs from `src/data/drones.ts`
5. Results typed as `AssessmentResult` with `MetricStatus: 'good' | 'caution' | 'warning'`
6. `recommendations.ts` generates contextual text recommendations

### Key Directories

- `src/components/sections/` — Feature sections within phases (WeatherSection, NearbyCheckSection, RiskClassSection, etc.)
- `src/hooks/` — Custom hooks wrapping TanStack Query and localStorage
- `src/services/` — API clients (weather, geocode, K-index, Overpass/OSM)
- `src/data/` — Static data (drone specs, weather thresholds)
- `src/types/` — TypeScript types (drone, weather, assessment, mission)
- `src/utils/` — Mission storage, PDF generation, formatting, recommendations

### External APIs

| API | Service file | Cache strategy |
|-----|-------------|----------------|
| Open-Meteo (weather) | `weatherApi.ts` | TanStack Query: 10min stale, 5min refetch + SW NetworkFirst 10min |
| SWPC NOAA (K-index) | `kIndexApi.ts` | TanStack Query: 1h + SW NetworkFirst 1h |
| Overpass/OSM (nearby) | `overpassApi.ts` | localStorage: 1h |
| Nominatim (geocode) | `geocodeApi.ts` | TanStack Query |

## Conventions

- Component UI text is in German
- CSS uses Tailwind utility classes with custom CSS variables for theming (`--color-good`, `--color-caution`, `--color-warning`, `--color-surface-*`, `--color-text-*` defined in `src/index.css`)
- Light/dark/system theme with sunrise/sunset-aware auto-switching (`useTheme`)
- Collapsible sections use `ChecklistSection` component with lock/status badge support
- Drone specs are a static registry in `src/data/drones.ts` — typed as `DroneId` union
- No backend — all persistence is localStorage, all API calls are to public third-party services
