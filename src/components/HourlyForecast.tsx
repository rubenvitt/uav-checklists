import type { ReactNode } from 'react'
import { PiWind, PiEye, PiChartBar } from 'react-icons/pi'
import {
  WiDaySunny, WiDayCloudy, WiFog, WiDayRainMix, WiRain, WiSnow,
  WiThunderstorm, WiThermometer, WiStrongWind, WiHumidity, WiBarometer,
} from 'react-icons/wi'
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

function weatherIcon(code: number): ReactNode {
  if (code === 0) return <WiDaySunny />
  if (code <= 3) return <WiDayCloudy />
  if (code <= 48) return <WiFog />
  if (code <= 57) return <WiDayRainMix />
  if (code <= 67) return <WiRain />
  if (code <= 77) return <WiSnow />
  if (code <= 86) return <WiRain />
  return <WiThunderstorm />
}

const statusBg: Record<MetricStatus, string> = {
  good: 'bg-good/20 text-good',
  caution: 'bg-caution/20 text-caution',
  warning: 'bg-warning/20 text-warning',
}

interface MetricRow {
  label: string
  icon: ReactNode
  render: (p: HourlyForecastPoint) => string
  status: (p: HourlyForecastPoint) => MetricStatus
}

function filterNextHours(data: HourlyForecastPoint[], count: number): HourlyForecastPoint[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const nowStr = `${year}-${month}-${day}T${hour}:00`
  const startIdx = data.findIndex((p) => p.time >= nowStr)
  return data.slice(startIdx >= 0 ? startIdx : 0, (startIdx >= 0 ? startIdx : 0) + count)
}

function formatDisplayTime(isoTime: string): string {
  return isoTime.slice(11, 16)
}

export default function HourlyForecast({ data, drone }: { data: HourlyForecastPoint[]; drone: DroneSpec }) {
  const hasIp = drone.ipRating !== null
  const visibleData = filterNextHours(data, 24)

  const rows: MetricRow[] = [
    {
      label: 'Temperatur',
      icon: <WiThermometer />,
      render: (p) => `${Math.round(p.temperature)}°C`,
      status: (p) => evaluateTemperature(p.temperature, drone.minTemp, drone.maxTemp),
    },
    {
      label: 'Wind',
      icon: <WiStrongWind />,
      render: (p) => `${p.windSpeed.toFixed(1)}`,
      status: (p) => evaluateWind(p.windSpeed, drone.maxWindSpeed),
    },
    {
      label: 'Böen',
      icon: <PiWind />,
      render: (p) => `${p.windGusts.toFixed(1)}`,
      status: (p) => evaluateGusts(p.windGusts, drone.maxWindSpeed),
    },
    {
      label: 'Feuchte',
      icon: <WiHumidity />,
      render: (p) => `${Math.round(p.humidity)}%`,
      status: (p) => evaluateHumidity(p.humidity),
    },
    {
      label: 'Niederschl.',
      icon: <WiRain />,
      render: (p) => `${Math.round(p.precipitationProbability)}%`,
      status: (p) => evaluatePrecipitation(p.precipitationProbability, 0, hasIp),
    },
    {
      label: 'Sicht',
      icon: <PiEye />,
      render: (p) => {
        const km = p.visibility / 1000
        return km < 1 ? `${Math.round(p.visibility)}m` : `${km.toFixed(1)}km`
      },
      status: (p) => evaluateVisibility(p.visibility / 1000),
    },
    {
      label: 'Druck',
      icon: <WiBarometer />,
      render: (p) => `${Math.round(p.pressure)}`,
      status: (p) => evaluatePressure(p.pressure),
    },
    {
      label: 'Taupunkt',
      icon: <WiFog />,
      render: (p) => `${p.dewPoint.toFixed(1)}°C`,
      status: (p) => evaluateDewPoint(p.temperature, p.dewPoint),
    },
  ]

  return (
    <div className="rounded-xl bg-surface px-4 py-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text">
        <PiChartBar className="text-lg" /> 24-Stunden-Vorhersage
      </h3>
      <div className="overflow-x-auto pb-2">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface" />
              {visibleData.map((p) => (
                <th key={p.time} className="min-w-14 px-1 pb-1 text-center text-xs font-normal text-text-muted">
                  {formatDisplayTime(p.time)}
                </th>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-surface" />
              {visibleData.map((p) => (
                <td key={p.time} className="pb-1 text-center text-base">
                  {weatherIcon(p.weatherCode)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="sticky left-0 z-10 bg-surface pr-2 text-xs text-text-muted whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">{row.icon} {row.label}</span>
                </td>
                {visibleData.map((p) => (
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
