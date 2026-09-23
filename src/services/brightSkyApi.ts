import type { DwdAlert, DwdAlertSeverity, DwdObservation, DwdWeatherResponse } from '../types/weather'

// Bright Sky bereitet die Open Data des Deutschen Wetterdienstes als JSON-API auf.
// Daten: CC BY 4.0 — Attribution „Quelle: Deutscher Wetterdienst" ist in der UI Pflicht.
const BASE_URL = 'https://api.brightsky.dev'

// `dwd`-Einheiten (km/h, °C, hPa, m) entsprechen den Open-Meteo-Standardeinheiten der App.
// `si` würde Kelvin, Pascal und m/s liefern.
const UNITS = 'dwd'

const SEVERITIES: DwdAlertSeverity[] = ['minor', 'moderate', 'severe', 'extreme']

class NotCoveredError extends Error {}

async function getJson(path: string, params: URLSearchParams) {
  const response = await fetch(`${BASE_URL}${path}?${params}`)
  // Bright Sky antwortet mit 404, wenn keine DWD-Quelle/Warnzelle den Standort abdeckt
  if (response.status === 404) throw new NotCoveredError()
  if (!response.ok) {
    throw new Error(`DWD-Daten konnten nicht geladen werden: ${response.status}`)
  }
  return response.json()
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

async function fetchObservation(lat: number, lon: number): Promise<DwdObservation | null> {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString(), units: UNITS })
  let json
  try {
    json = await getJson('/current_weather', params)
  } catch (e) {
    if (e instanceof NotCoveredError) return null
    throw e
  }

  const w = json.weather
  if (!w) return null
  const source = (json.sources ?? []).find((s: { id: number }) => s.id === w.source_id) ?? json.sources?.[0]

  return {
    timestamp: w.timestamp,
    temperature: num(w.temperature),
    windSpeed: num(w.wind_speed_10),
    windGusts: num(w.wind_gust_speed_10),
    windDirection: num(w.wind_direction_10),
    humidity: num(w.relative_humidity),
    dewPoint: num(w.dew_point),
    visibility: num(w.visibility),
    pressureMsl: num(w.pressure_msl),
    precipitation: num(w.precipitation_60),
    cloudCover: num(w.cloud_cover),
    station: source
      ? {
          name: str(source.station_name) ?? 'Unbekannte Station',
          distanceMeters: Math.round(num(source.distance) ?? 0),
          observationType: str(source.observation_type) ?? 'unbekannt',
        }
      : null,
  }
}

async function fetchAlerts(lat: number, lon: number): Promise<{ alerts: DwdAlert[]; warnCellName: string | null } | null> {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString() })
  let json
  try {
    json = await getJson('/alerts', params)
  } catch (e) {
    if (e instanceof NotCoveredError) return null
    throw e
  }

  const alerts: DwdAlert[] = (json.alerts ?? [])
    .filter((a: Record<string, unknown>) => a.status !== 'test')
    .map((a: Record<string, unknown>) => ({
      id: String(a.alert_id ?? a.id),
      severity: SEVERITIES.includes(a.severity as DwdAlertSeverity) ? (a.severity as DwdAlertSeverity) : 'minor',
      event: str(a.event_de) ?? str(a.event_en) ?? 'Wetterwarnung',
      headline: str(a.headline_de) ?? str(a.headline_en) ?? 'Amtliche Warnung',
      description: str(a.description_de) ?? str(a.description_en),
      instruction: str(a.instruction_de) ?? str(a.instruction_en),
      onset: str(a.onset) ?? str(a.effective),
      expires: str(a.expires),
    }))
    .sort((a: DwdAlert, b: DwdAlert) => SEVERITIES.indexOf(b.severity) - SEVERITIES.indexOf(a.severity))

  return { alerts, warnCellName: str(json.location?.name) }
}

/**
 * Lädt aktuelle DWD-Stationsbeobachtung und amtliche Unwetterwarnungen via Bright Sky.
 * Außerhalb Deutschlands liefert Bright Sky keine Daten → `covered: false`, Open-Meteo bleibt führend.
 */
export async function fetchDwdWeather(lat: number, lon: number): Promise<DwdWeatherResponse> {
  const [observation, alertData] = await Promise.all([
    fetchObservation(lat, lon),
    fetchAlerts(lat, lon),
  ])

  return {
    covered: observation !== null || alertData !== null,
    observation,
    alerts: alertData?.alerts ?? [],
    warnCellName: alertData?.warnCellName ?? null,
  }
}
