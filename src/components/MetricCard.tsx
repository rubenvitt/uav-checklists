import type { MetricAssessment } from '../types/assessment'

interface MetricCardProps {
  metric: MetricAssessment
}

const statusColors = {
  good: 'bg-good',
  caution: 'bg-caution',
  warning: 'bg-warning',
} as const

export default function MetricCard({ metric }: MetricCardProps) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl bg-surface">
      <div className={`w-1.5 ${statusColors[metric.status]}`} />
      <div className="flex flex-1 items-center gap-3 px-4 py-3">
        <span className="text-xl">{metric.icon}</span>
        <div className="flex-1">
          <p className="text-xs text-text-muted">{metric.label}</p>
          <p className="text-sm font-semibold text-text">
            {metric.value} <span className="font-normal text-text-muted">{metric.unit}</span>
          </p>
          {metric.detail && (
            <p className="text-xs text-text-muted">{metric.detail}</p>
          )}
        </div>
      </div>
    </div>
  )
}
