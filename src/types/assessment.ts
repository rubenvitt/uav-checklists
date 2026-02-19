import type { ReactNode } from 'react'

export type MetricStatus = 'good' | 'caution' | 'warning'

export type MetricKey =
  | 'wind'
  | 'gusts'
  | 'kIndex'
  | 'temperature'
  | 'precipitation'
  | 'visibility'
  | 'humidity'
  | 'pressure'
  | 'dewPoint'

export interface MetricAssessment {
  key: MetricKey
  label: string
  value: string
  unit: string
  status: MetricStatus
  icon: ReactNode
  detail?: string
}

export interface AssessmentResult {
  overall: MetricStatus
  metrics: MetricAssessment[]
  recommendations: string[]
}
