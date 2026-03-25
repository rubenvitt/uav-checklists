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
