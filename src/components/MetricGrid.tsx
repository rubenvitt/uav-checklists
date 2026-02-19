import type { MetricAssessment } from '../types/assessment'
import MetricCard from './MetricCard'

interface MetricGridProps {
  metrics: MetricAssessment[]
}

export default function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  )
}
