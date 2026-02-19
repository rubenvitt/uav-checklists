import type { ReactNode } from 'react'
import { PiCheckCircle, PiWarning, PiXCircle } from 'react-icons/pi'
import type { MetricStatus } from '../types/assessment'

interface FlightAssessmentProps {
  status: MetricStatus
}

const config: Record<MetricStatus, { bg: string; text: string; label: string; icon: ReactNode }> = {
  good: {
    bg: 'bg-good-bg border-good/30',
    text: 'text-good',
    label: 'Gute Flugbedingungen',
    icon: <PiCheckCircle className="inline-block mb-0.5" />,
  },
  caution: {
    bg: 'bg-caution-bg border-caution/30',
    text: 'text-caution',
    label: 'Eingeschränkte Flugbedingungen',
    icon: <PiWarning className="inline-block mb-0.5" />,
  },
  warning: {
    bg: 'bg-warning-bg border-warning/30',
    text: 'text-warning',
    label: 'Flug nicht empfohlen',
    icon: <PiXCircle className="inline-block mb-0.5" />,
  },
}

export default function FlightAssessment({ status }: FlightAssessmentProps) {
  const { bg, text, label, icon } = config[status]

  return (
    <div className={`rounded-xl border ${bg} px-5 py-4 text-center`}>
      <p className={`text-lg font-bold ${text}`}>{icon} {label}</p>
    </div>
  )
}
