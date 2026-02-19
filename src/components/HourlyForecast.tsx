import type { HourlyForecastPoint } from '../types/weather'
import type { DroneSpec } from '../types/drone'
import type { MetricStatus } from '../types/assessment'
import {
  evaluateWind,
  evaluateGusts,
  evaluateTemperature,
  evaluatePrecipitation,
  evaluateVisibility,
  evaluateHumidity,
  evaluatePressure,
  evaluateDewPoint,
} from '../data/thresholds'

interface HourlyForecastProps {
  data: HourlyForecastPoint[]
  drone: DroneSpec
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 57) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌧️'
  if (code <= 86) return '🌨️'
  return '⛈️'
}

const statusBg: Record<MetricStatus, string> = {
  good: 'bg-good/20 text-good',
  caution: 'bg-caution/20 text-caution',
  warning: 'bg-warning/20 text-warning',
}

interface MetricRow {
  label: string
  icon: string
  render: (p: HourlyForecastPoint) => string
  status: (p: HourlyForecastPoint) => MetricStatus
}

export default function HourlyForecast({ data, drone }: HourlyForecastProps) {
  const hasIp = drone.ipRating !== null

  const rows: MetricRow[] = [
    {
      label: 'Temperatur',
      icon: '🌡️',
      render: (p) => `${Math.round(p.temperature)}°C`,
      status: (p) => evaluateTemperature(p.temperature, drone.minTemp, drone.maxTemp),
    },
    {
      label: 'Wind',
      icon: '💨',
      render: (p) => `${p.windSpeed.toFixed(1)}`,
      status: (p) => evaluateWind(p.windSpeed, drone.maxWindSpeed),
    },
    {
      label: 'Böen',
      icon: '🌊',
      render: (p) => `${p.windGusts.toFixed(1)}`,
      status: (p) => evaluateGusts(p.windGusts, drone.maxWindSpeed),
    },
    {
      label: 'Feuchte',
      icon: '💧',
      render: (p) => `${Math.round(p.humidity)}%`,
      status: (p) => evaluateHumidity(p.humidity),
    },
    {
      label: 'Niederschl.',
      icon: '🌧️',
      render: (p) => `${Math.round(p.precipitationProbability)}%`,
      status: (p) => evaluatePrecipitation(p.precipitationProbability, 0, hasIp),
    },
    {
      label: 'Sicht',
      icon: '👁️',
      render: (p) => {
        const km = p.visibility / 1000
        return km < 1 ? `${Math.round(p.visibility)}m` : `${km.toFixed(1)}km`
      },
      status: (p) => evaluateVisibility(p.visibility / 1000),
    },
    {
      label: 'Druck',
      icon: '🔽',
      render: (p) => `${Math.round(p.pressure)}`,
      status: (p) => evaluatePressure(p.pressure),
    },
    {
      label: 'Taupunkt',
      icon: '🌫️',
      render: (p) => `${p.dewPoint.toFixed(1)}°C`,
      status: (p) => evaluateDewPoint(p.temperature, p.dewPoint),
    },
  ]

  return (
    <div className="rounded-xl bg-surface px-4 py-4">
      <h3 className="mb-3 text-sm font-semibold text-text">📊 24-Stunden-Vorhersage</h3>
      <div className="overflow-x-auto pb-2">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface" />
              {data.map((p) => (
                <th key={p.time} className="min-w-14 px-1 pb-1 text-center text-xs font-normal text-text-muted">
                  {p.time}
                </th>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-surface" />
              {data.map((p) => (
                <td key={p.time} className="pb-1 text-center text-base">
                  {weatherEmoji(p.weatherCode)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="sticky left-0 z-10 bg-surface pr-2 text-xs text-text-muted whitespace-nowrap">
                  {row.icon} {row.label}
                </td>
                {data.map((p) => (
                  <td
                    key={p.time}
                    className={`rounded px-1 py-1 text-center text-xs font-medium ${statusBg[row.status(p)]}`}
                  >
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
