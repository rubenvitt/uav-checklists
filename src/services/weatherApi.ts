import type { WeatherData, WeatherResponse, WindAtAltitude, HourlyForecastPoint, SunData } from '../types/weather'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return ((a + diff * t) % 360 + 360) % 360
}

function findCurrentHourIndex(times: string[]): number {
  const now = new Date()
  const currentHour = now.getHours()
  const todayStr = now.toISOString().slice(0, 10)
  const target = `${todayStr}T${String(currentHour).padStart(2, '0')}:00`
  const idx = times.findIndex((t) => t === target)
  return idx >= 0 ? idx : 0
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

interface AltitudeAnchor {
  altitude: number
  speed: number
  gusts: number
  direction: number
}

function interpolateAtAltitude(alt: number, anchors: AltitudeAnchor[]): WindAtAltitude {
  if (alt <= anchors[0].altitude) {
    const a = anchors[0]
    return { altitude: alt, windSpeed: a.speed, windGusts: a.gusts, windDirection: a.direction }
  }
  if (alt >= anchors[anchors.length - 1].altitude) {
    const a = anchors[anchors.length - 1]
    return { altitude: alt, windSpeed: a.speed, windGusts: a.gusts, windDirection: a.direction }
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i]
    const hi = anchors[i + 1]
    if (alt >= lo.altitude && alt <= hi.altitude) {
      const t = (alt - lo.altitude) / (hi.altitude - lo.altitude)
      return {
        altitude: alt,
        windSpeed: lerp(lo.speed, hi.speed, t),
        windGusts: lerp(lo.gusts, hi.gusts, t),
        windDirection: lerpAngle(lo.direction, hi.direction, t),
      }
    }
  }
  const a = anchors[anchors.length - 1]
  return { altitude: alt, windSpeed: a.speed, windGusts: a.gusts, windDirection: a.direction }
}

function buildAltitudeSteps(maxAltitude: number): number[] {
  const steps: number[] = [10]
  const interval = maxAltitude <= 50 ? 10 : 30
  for (let alt = interval === 10 ? 20 : 30; alt <= maxAltitude; alt += interval) {
    if (alt !== 10) steps.push(alt)
  }
  if (steps[steps.length - 1] !== maxAltitude) steps.push(maxAltitude)
  // one step above
  const nextStep = maxAltitude + interval
  steps.push(nextStep)
  return steps
}

function buildWindByAltitude(hourly: Record<string, number[]>, idx: number, maxAltitude: number): WindAtAltitude[] {
  const w10 = hourly.wind_speed_10m[idx]
  const w80 = hourly.wind_speed_80m[idx]
  const w120 = hourly.wind_speed_120m[idx]
  const w180 = hourly.wind_speed_180m[idx]
  const gusts10 = hourly.wind_gusts_10m[idx]

  const d10 = hourly.wind_direction_10m[idx]
  const d80 = hourly.wind_direction_80m[idx]
  const d120 = hourly.wind_direction_120m[idx]
  const d180 = hourly.wind_direction_180m[idx]

  // gust scaling factor: linear increase from 1.0 at 10m to ~1.35 at 120m, ~1.5 at 180m
  const gustAt = (alt: number) => gusts10 * lerp(1.0, 1.5, Math.min(alt, 180) / 180)

  const anchors: AltitudeAnchor[] = [
    { altitude: 10, speed: w10, gusts: gustAt(10), direction: d10 },
    { altitude: 80, speed: w80, gusts: gustAt(80), direction: d80 },
    { altitude: 120, speed: w120, gusts: gustAt(120), direction: d120 },
    { altitude: 180, speed: w180, gusts: gustAt(180), direction: d180 },
  ]

  const steps = buildAltitudeSteps(maxAltitude)
  return steps.map((alt) => interpolateAtAltitude(alt, anchors))
}

function buildHourlyForecast(hourly: Record<string, (number | string)[]>, startIdx: number): HourlyForecastPoint[] {
  const points: HourlyForecastPoint[] = []
  const times = hourly.time as string[]
  const count = Math.min(24, times.length - startIdx)

  for (let i = 0; i < count; i++) {
    const idx = startIdx + i
    const timeStr = times[idx] as string
    points.push({
      time: timeStr.slice(11, 16),
      temperature: hourly.temperature_2m[idx] as number,
      windSpeed: hourly.wind_speed_10m[idx] as number,
      windGusts: hourly.wind_gusts_10m[idx] as number,
      humidity: hourly.relative_humidity_2m[idx] as number,
      precipitationProbability: hourly.precipitation_probability[idx] as number,
      visibility: hourly.visibility[idx] as number,
      pressure: hourly.surface_pressure[idx] as number,
      dewPoint: hourly.dew_point_2m[idx] as number,
      weatherCode: hourly.weather_code[idx] as number,
    })
  }

  return points
}

function buildSunData(daily: Record<string, string[]>): SunData {
  return {
    sunrise: formatTime(daily.sunrise[0]),
    sunset: formatTime(daily.sunset[0]),
  }
}

export async function fetchWeather(lat: number, lon: number, maxAltitude: number = 120): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m',
      'wind_speed_10m',
      'wind_gusts_10m',
      'relative_humidity_2m',
      'precipitation',
      'precipitation_probability',
      'visibility',
      'surface_pressure',
      'dew_point_2m',
      'cloud_cover',
      'wind_direction_10m',
    ].join(','),
    daily: 'sunrise,sunset',
    hourly: [
      'temperature_2m',
      'wind_speed_10m',
      'wind_speed_80m',
      'wind_speed_120m',
      'wind_speed_180m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'wind_direction_80m',
      'wind_direction_120m',
      'wind_direction_180m',
      'relative_humidity_2m',
      'precipitation_probability',
      'visibility',
      'surface_pressure',
      'dew_point_2m',
      'weather_code',
    ].join(','),
    timezone: 'auto',
    forecast_days: '1',
  })

  const response = await fetch(`${BASE_URL}?${params}`)

  if (!response.ok) {
    throw new Error(`Wetterdaten konnten nicht geladen werden: ${response.status}`)
  }

  const json = await response.json()
  const c = json.current
  const hourlyIdx = findCurrentHourIndex(json.hourly.time)

  const current: WeatherData = {
    temperature: c.temperature_2m,
    windSpeed: c.wind_speed_10m,
    windGusts: c.wind_gusts_10m,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    precipitationProbability: c.precipitation_probability,
    visibility: c.visibility,
    pressure: c.surface_pressure,
    dewPoint: c.dew_point_2m,
    cloudCover: c.cloud_cover,
    windDirection: c.wind_direction_10m,
  }

  return {
    current,
    sun: buildSunData(json.daily),
    windByAltitude: buildWindByAltitude(json.hourly, hourlyIdx, maxAltitude),
    hourlyForecast: buildHourlyForecast(json.hourly, hourlyIdx),
  }
}
