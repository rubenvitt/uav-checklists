import type { MetricAssessment } from '../types/assessment'
import MetricCard from './MetricCard'

interface MetricGridProps {
  metrics: MetricAssessment[]
}

/** Kennzahlenband im Fugenraster: Zellen mit 1-px-Fuge statt Abstand und Schatten. */
export default function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="fugen grid grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2">
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  )
}
