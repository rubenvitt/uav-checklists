import type { MetricStatus } from '../types/assessment'

interface FlightAssessmentProps {
  status: MetricStatus
}

const config = {
  good: {
    bg: 'bg-good-bg border-good/30',
    text: 'text-good',
    label: 'Gute Flugbedingungen ✓',
  },
  caution: {
    bg: 'bg-caution-bg border-caution/30',
    text: 'text-caution',
    label: 'Eingeschränkte Flugbedingungen ⚠',
  },
  warning: {
    bg: 'bg-warning-bg border-warning/30',
    text: 'text-warning',
    label: 'Flug nicht empfohlen ✕',
  },
} as const

export default function FlightAssessment({ status }: FlightAssessmentProps) {
  const { bg, text, label } = config[status]

  return (
    <div className={`rounded-xl border ${bg} px-5 py-4 text-center`}>
      <p className={`text-lg font-bold ${text}`}>{label}</p>
    </div>
  )
}
