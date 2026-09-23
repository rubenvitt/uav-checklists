import type { ReactNode } from 'react'
import { PiWarning } from 'react-icons/pi'
import type { MetricStatus } from '../types/assessment'
import type { DroneSpec } from '../types/drone'
import type { DwdAlert, DwdAlertSeverity, DwdWeatherResponse, WeatherData } from '../types/weather'
import {
  evaluateGusts,
  evaluateHumidity,
  evaluateTemperature,
  evaluateVisibility,
  evaluateWind,
} from '../data/thresholds'
import {
  formatDistance,
  formatPercent,
  formatTemperature,
  formatVisibility,
  formatVisibilityUnit,
  formatWind,
} from '../utils/formatting'

interface DwdCrossCheckProps {
  dwd: DwdWeatherResponse | null
  loading: boolean
  error: string | null
  openMeteo: WeatherData | null
  drone: DroneSpec
}

interface ComparisonRow {
  label: string
  unit: string
  model: number | null
  measured: number | null
  format: (value: number) => string
  formatUnit?: (value: number) => string
  evaluate?: (value: number) => MetricStatus
}

const STATUS_RANK: Record<MetricStatus, number> = { good: 0, caution: 1, warning: 2 }

const badgeLabel: Record<MetricStatus, string> = {
  good: 'Gut',
  caution: 'Achtung',
  warning: 'Warnung',
}

const cardStyles: Record<MetricStatus, { card: string; badge: string; text: string }> = {
  good: { card: 'border-good/25 bg-good-bg/40', badge: 'bg-good text-white', text: 'text-good' },
  caution: { card: 'border-caution/25 bg-caution-bg/40', badge: 'bg-caution text-white', text: 'text-caution' },
  warning: { card: 'border-warning/25 bg-warning-bg/40', badge: 'bg-warning text-white', text: 'text-warning' },
}

const severityStatus: Record<DwdAlertSeverity, MetricStatus> = {
  minor: 'caution',
  moderate: 'caution',
  severe: 'warning',
  extreme: 'warning',
}

const severityLabel: Record<DwdAlertSeverity, string> = {
  minor: 'Wetterwarnung',
  moderate: 'Markante Warnung',
  severe: 'Unwetterwarnung',
  extreme: 'Extreme Unwetterwarnung',
}

function worst(statuses: MetricStatus[]): MetricStatus {
  return statuses.reduce<MetricStatus>((acc, s) => (STATUS_RANK[s] > STATUS_RANK[acc] ? s : acc), 'good')
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Attribution() {
  return (
    <p className="text-[11px] text-text-muted">
      Quelle: Deutscher Wetterdienst (
      <a href="https://www.dwd.de/opendata" target="_blank" rel="noopener noreferrer" className="underline">DWD Open Data</a>
      , CC BY 4.0), bereitgestellt über{' '}
      <a href="https://brightsky.dev/" target="_blank" rel="noopener noreferrer" className="underline">Bright Sky</a>
    </p>
  )
}

function InfoCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-alt bg-surface-alt/50 px-4 py-3">
      <p className="text-sm font-semibold text-text">DWD-Abgleich</p>
      <p className="mt-1 text-xs text-text-muted">{children}</p>
    </div>
  )
}

function AlertItem({ alert }: { alert: DwdAlert }) {
  const styles = cardStyles[severityStatus[alert.severity]]
  return (
    <li className={`rounded-lg border px-3 py-2 ${styles.card}`}>
      <div className="flex items-start gap-2">
        <PiWarning className={`mt-0.5 shrink-0 ${styles.text}`} />
        <div className="flex-1">
          <p className={`text-xs font-semibold ${styles.text}`}>{severityLabel[alert.severity]}: {alert.event}</p>
          <p className="text-sm text-text">{alert.headline}</p>
          {(alert.onset || alert.expires) && (
            <p className="mt-0.5 text-xs text-text-muted">
              {alert.onset && <>ab {formatDateTime(alert.onset)}</>}
              {alert.onset && alert.expires && ' · '}
              {alert.expires && <>bis {formatDateTime(alert.expires)}</>}
            </p>
          )}
          {alert.description && <p className="mt-1 text-xs text-text-muted">{alert.description}</p>}
        </div>
      </div>
    </li>
  )
}

export default function DwdCrossCheck({ dwd, loading, error, openMeteo, drone }: DwdCrossCheckProps) {
  if (loading) {
    return <InfoCard>DWD-Daten werden geladen …</InfoCard>
  }

  if (error) {
    return <InfoCard>DWD-Abgleich derzeit nicht verfügbar. Die Bewertung basiert ausschließlich auf Open-Meteo.</InfoCard>
  }

  if (!dwd) return null

  if (!dwd.covered) {
    return (
      <InfoCard>
        Der Standort liegt außerhalb des DWD-Abdeckungsbereichs (nur Deutschland). Die Bewertung basiert ausschließlich auf Open-Meteo.
      </InfoCard>
    )
  }

  const obs = dwd.observation
  const candidateRows: ComparisonRow[] = obs
    ? [
        {
          label: 'Wind',
          unit: 'km/h',
          model: openMeteo?.windSpeed ?? null,
          measured: obs.windSpeed,
          format: formatWind,
          evaluate: (v) => evaluateWind(v, drone.maxWindSpeed),
        },
        {
          label: 'Böen',
          unit: 'km/h',
          model: openMeteo?.windGusts ?? null,
          measured: obs.windGusts,
          format: formatWind,
          evaluate: (v) => evaluateGusts(v, drone.maxWindSpeed),
        },
        {
          label: 'Temperatur',
          unit: '°C',
          model: openMeteo?.temperature ?? null,
          measured: obs.temperature,
          format: formatTemperature,
          evaluate: (v) => evaluateTemperature(v, drone.minTemp, drone.maxTemp),
        },
        {
          label: 'Sichtweite',
          unit: 'km',
          model: openMeteo ? openMeteo.visibility / 1000 : null,
          measured: obs.visibility !== null ? obs.visibility / 1000 : null,
          format: formatVisibility,
          formatUnit: formatVisibilityUnit,
          evaluate: evaluateVisibility,
        },
        {
          label: 'Luftfeuchte',
          unit: '%',
          model: openMeteo?.humidity ?? null,
          measured: obs.humidity,
          format: formatPercent,
          evaluate: evaluateHumidity,
        },
        {
          // Open-Meteo liefert nur ein 15-min-Intervall → nicht direkt vergleichbar
          label: 'Niederschlag (1 h)',
          unit: 'mm',
          model: null,
          measured: obs.precipitation,
          format: (v) => v.toFixed(1),
        },
      ]
    : []
  const rows = candidateRows.filter((row) => row.measured !== null || row.model !== null)

  const measuredStatus = (row: ComparisonRow) =>
    row.measured !== null && row.evaluate ? row.evaluate(row.measured) : null
  const modelStatus = (row: ComparisonRow) =>
    row.model !== null && row.evaluate ? row.evaluate(row.model) : null

  // Messwerte, die ungünstiger ausfallen als die Modellwerte von Open-Meteo
  const worseThanModel = rows.filter((row) => {
    const m = measuredStatus(row)
    const o = modelStatus(row)
    return m !== null && o !== null && STATUS_RANK[m] > STATUS_RANK[o]
  })

  const overall = worst([
    ...rows.map(measuredStatus).filter((s): s is MetricStatus => s !== null),
    ...dwd.alerts.map((a) => severityStatus[a.severity]),
  ])
  const styles = cardStyles[overall]

  return (
    <div className={`space-y-3 rounded-xl border px-4 py-3 ${styles.card}`}>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-semibold text-text">DWD-Abgleich</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>{badgeLabel[overall]}</span>
      </div>

      {dwd.alerts.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-text">
            Amtliche Warnungen{dwd.warnCellName ? ` für ${dwd.warnCellName}` : ''}
          </p>
          <ul className="space-y-1.5">
            {dwd.alerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          Keine amtlichen Wetterwarnungen{dwd.warnCellName ? ` für ${dwd.warnCellName}` : ''}.
        </p>
      )}

      {obs && rows.length > 0 && (
        <div>
          <p className="text-xs text-text-muted">
            {obs.station
              ? <>Messung Station {obs.station.name} ({formatDistance(obs.station.distanceMeters)} entfernt), {formatClock(obs.timestamp)} Uhr</>
              : <>Messung {formatClock(obs.timestamp)} Uhr</>}
          </p>
          <table className="mt-1.5 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="py-1 font-normal" />
                <th className="py-1 text-right font-normal">Open-Meteo</th>
                <th className="py-1 text-right font-normal">DWD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = measuredStatus(row)
                const unitFor = (v: number) => (row.formatUnit ? row.formatUnit(v) : row.unit)
                return (
                  <tr key={row.label} className="border-t border-surface-alt/60">
                    <td className="py-1 text-text-muted">{row.label}</td>
                    <td className="py-1 text-right text-text">
                      {row.model !== null ? `${row.format(row.model)} ${unitFor(row.model)}` : '–'}
                    </td>
                    <td className={`py-1 text-right font-semibold ${status && status !== 'good' ? cardStyles[status].text : 'text-text'}`}>
                      {row.measured !== null ? `${row.format(row.measured)} ${unitFor(row.measured)}` : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-text-muted">Wind in 10 m Höhe. Stationswerte können vom Einsatzort abweichen.</p>
        </div>
      )}

      {worseThanModel.length > 0 && (
        <p className={`text-xs font-medium ${cardStyles[worst(worseThanModel.map((r) => measuredStatus(r)!))].text}`}>
          Die DWD-Messung ist ungünstiger als die Open-Meteo-Daten ({worseThanModel.map((r) => r.label).join(', ')}). Im Zweifel den strengeren Wert zugrunde legen.
        </p>
      )}

      <Attribution />
    </div>
  )
}
