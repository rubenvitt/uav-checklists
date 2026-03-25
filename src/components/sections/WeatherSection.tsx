import { WiDayCloudyHigh } from 'react-icons/wi'
import type { AssessmentResult, MetricStatus } from '../../types/assessment'
import type { SunData, WindAtAltitude, HourlyForecastPoint, MetarStationInfo } from '../../types/weather'
import type { DroneSpec } from '../../types/drone'
import { formatDistance } from '../../utils/formatting'
import ChecklistSection from '../ChecklistSection'
import LoadingSpinner from '../LoadingSpinner'
import FlightAssessment from '../FlightAssessment'
import MetricGrid from '../MetricGrid'
import Recommendations from '../Recommendations'
import SunTimes from '../SunTimes'
import WindByAltitude from '../WindByAltitude'
import HourlyForecast from '../HourlyForecast'

interface WeatherSectionProps {
  assessment: AssessmentResult | null
  sun: SunData | null
  windByAltitude: WindAtAltitude[] | null
  hourlyForecast: HourlyForecastPoint[] | null
  metarStation: MetarStationInfo | null
  maxAltitude: number
  drone: DroneSpec
  isLoading: boolean
  error: string | null
  locked?: boolean
  open?: boolean
  onToggle?: () => void
  isComplete?: boolean
  onContinue?: () => void
  continueLabel?: string
  isPhaseComplete?: boolean
}

const badgeLabel: Record<MetricStatus, string> = {
  good: 'Gut',
  caution: 'Achtung',
  warning: 'Warnung',
}

const metarCardStyles: Record<MetricStatus, { card: string; badge: string; note: string }> = {
  good: {
    card: 'border-good/25 bg-good-bg/40',
    badge: 'bg-good text-white',
    note: 'text-good',
  },
  caution: {
    card: 'border-caution/25 bg-caution-bg/40',
    badge: 'bg-caution text-white',
    note: 'text-caution',
  },
  warning: {
    card: 'border-warning/25 bg-warning-bg/40',
    badge: 'bg-warning text-white',
    note: 'text-warning',
  },
}

const metarStatusHint: Record<MetricStatus, string> = {
  good: 'Die Station liegt nah genug, damit die Wetterdaten in der Regel gut repräsentativ sind.',
  caution: 'Die Station liegt weiter entfernt. Lokale Abweichungen am Einsatzort sollten aktiv mitgedacht werden.',
  warning: 'Die Station liegt deutlich entfernt. Die Wetterdaten sind nur eingeschränkt repräsentativ für den Einsatzort.',
}

function MetarStationHint({ metarStation }: { metarStation: MetarStationInfo | null }) {
  if (!metarStation) {
    return (
      <div className="rounded-xl border border-surface-alt bg-surface-alt/50 px-4 py-3">
        <p className="text-sm font-semibold text-text">METAR-Repräsentativität</p>
        <p className="mt-1 text-xs text-text-muted">
          Für diesen Standort ist keine METAR-Station im lokalen Deutschland-Datenbestand verfügbar.
        </p>
      </div>
    )
  }

  const styles = metarCardStyles[metarStation.status]

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles.card}`}>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-semibold text-text">METAR-Repräsentativität</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
          {badgeLabel[metarStation.status]}
        </span>
      </div>
      <p className="mt-2 text-sm text-text">
        {metarStation.name} <span className="text-text-muted">({metarStation.icao})</span>
      </p>
      <p className="mt-0.5 text-xs text-text-muted">
        Entfernung zur nächsten METAR-Station: {formatDistance(metarStation.distanceMeters)}
      </p>
      <p className={`mt-2 text-xs ${styles.note}`}>
        {metarStatusHint[metarStation.status]}
      </p>
    </div>
  )
}

export default function WeatherSection({ assessment, sun, windByAltitude, hourlyForecast, metarStation, maxAltitude, drone, isLoading, error, locked, open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: WeatherSectionProps) {
  const badge = assessment
    ? { label: badgeLabel[assessment.overall], status: assessment.overall }
    : undefined
  const hasWeatherPayload = sun !== null || windByAltitude !== null || hourlyForecast !== null

  return (
    <ChecklistSection title="Wetterbedingungen" icon={<WiDayCloudyHigh />} badge={badge} loading={isLoading} locked={locked} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      {isLoading && <LoadingSpinner />}

      {error && !isLoading && (
        <div className="rounded-xl bg-warning-bg border border-warning/30 px-5 py-4 text-center">
          <p className="text-sm text-warning">{error}</p>
        </div>
      )}

      {assessment && !isLoading && (
        <>
          <FlightAssessment status={assessment.overall} />
          <MetricGrid metrics={assessment.metrics} />
        </>
      )}

      {!isLoading && hasWeatherPayload && <MetarStationHint metarStation={metarStation} />}
      {assessment && !isLoading && <Recommendations recommendations={assessment.recommendations} />}
      {sun && <SunTimes sunrise={sun.sunrise} sunset={sun.sunset} />}
      {windByAltitude && <WindByAltitude data={windByAltitude} maxAltitude={maxAltitude} />}
      {hourlyForecast && <HourlyForecast data={hourlyForecast} drone={drone} />}
    </ChecklistSection>
  )
}
