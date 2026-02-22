import { WiDayCloudyHigh } from 'react-icons/wi'
import type { AssessmentResult, MetricStatus } from '../../types/assessment'
import type { SunData, WindAtAltitude, HourlyForecastPoint } from '../../types/weather'
import type { DroneSpec } from '../../types/drone'
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

export default function WeatherSection({ assessment, sun, windByAltitude, hourlyForecast, maxAltitude, drone, isLoading, error, locked, open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: WeatherSectionProps) {
  const badge = assessment
    ? { label: badgeLabel[assessment.overall], status: assessment.overall }
    : undefined

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
          <Recommendations recommendations={assessment.recommendations} />
        </>
      )}

      {sun && <SunTimes sunrise={sun.sunrise} sunset={sun.sunset} />}
      {windByAltitude && <WindByAltitude data={windByAltitude} maxAltitude={maxAltitude} />}
      {hourlyForecast && <HourlyForecast data={hourlyForecast} drone={drone} />}
    </ChecklistSection>
  )
}
