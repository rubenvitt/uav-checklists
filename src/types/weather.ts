import type { MetricStatus } from './assessment'

export interface WeatherData {
  temperature: number
  windSpeed: number
  windGusts: number
  humidity: number
  precipitation: number
  precipitationProbability: number
  visibility: number
  pressure: number
  dewPoint: number
  cloudCover: number
  windDirection: number
}

export interface KIndexData {
  kIndex: number
  timestamp: string
}

export interface SunData {
  sunrise: string
  sunset: string
}

export interface WindAtAltitude {
  altitude: number
  windSpeed: number
  windGusts: number
  windDirection: number
}

export interface HourlyForecastPoint {
  time: string
  temperature: number
  windSpeed: number
  windGusts: number
  humidity: number
  precipitationProbability: number
  visibility: number
  pressure: number
  dewPoint: number
  weatherCode: number
}

export interface MetarStationInfo {
  icao: string
  name: string
  latitude: number
  longitude: number
  distanceMeters: number
  status: MetricStatus
}

export interface WeatherResponse {
  current: WeatherData
  sun: SunData
  windByAltitude: WindAtAltitude[]
  hourlyForecast: HourlyForecastPoint[]
  metarStation: MetarStationInfo | null
}

/* ── DWD (Bright Sky) ─────────────────────────────────────── */

export interface DwdStationInfo {
  name: string
  distanceMeters: number
  observationType: string
}

/** Aktuelle DWD-Stationsbeobachtung. Einzelwerte können fehlen (null), wenn die Station sie nicht meldet. */
export interface DwdObservation {
  timestamp: string
  temperature: number | null
  windSpeed: number | null
  windGusts: number | null
  windDirection: number | null
  humidity: number | null
  dewPoint: number | null
  visibility: number | null
  pressureMsl: number | null
  precipitation: number | null
  cloudCover: number | null
  station: DwdStationInfo | null
}

export type DwdAlertSeverity = 'minor' | 'moderate' | 'severe' | 'extreme'

export interface DwdAlert {
  id: string
  severity: DwdAlertSeverity
  event: string
  headline: string
  description: string | null
  instruction: string | null
  onset: string | null
  expires: string | null
}

export interface DwdWeatherResponse {
  /** false, wenn der Standort außerhalb des DWD-Abdeckungsbereichs (Deutschland) liegt */
  covered: boolean
  observation: DwdObservation | null
  alerts: DwdAlert[]
  /** Name der DWD-Warnzelle (Gemeinde/Kreis), falls bekannt */
  warnCellName: string | null
}
