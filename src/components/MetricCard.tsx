import type { MetricAssessment, MetricStatus } from '../types/assessment'

interface MetricCardProps {
  metric: MetricAssessment
}

const edge: Record<MetricStatus, string> = {
  good: 'bg-transparent',
  caution: 'bg-caution',
  warning: 'bg-warning',
}

/** Ampel als Fläche, Zahl bleibt lesbar: nur Abweichungen tönen die Kachel. */
const tile: Record<MetricStatus, string> = {
  good: 'bg-surface',
  caution: 'bg-caution-bg',
  warning: 'bg-warning-bg',
}

const valueColor: Record<MetricStatus, string> = {
  good: 'text-text',
  caution: 'text-caution',
  warning: 'text-warning',
}

const word: Record<MetricStatus, string> = {
  good: 'OK',
  caution: 'Achtung',
  warning: 'Kritisch',
}

/**
 * Kennzahl-Kachel nach Lifeline Hub: Augenbraue, Zahl führt (Mono), Einheit klein,
 * Notiz darunter. Nur Abweichungen tragen 2-px-Kante, getönte Fläche und Wort —
 * „OK“ bleibt ruhig, damit das Auge an der Abweichung hängen bleibt.
 */
export default function MetricCard({ metric }: MetricCardProps) {
  return (
    <div className={`relative flex min-h-[92px] flex-col gap-1 px-4 py-3 ${tile[metric.status]}`}>
      <span className={`absolute inset-y-0 left-0 w-0.5 ${edge[metric.status]}`} aria-hidden="true" />
      <div className="flex items-center gap-1.5">
        <span className="flex items-center text-sm text-faint" aria-hidden="true">{metric.icon}</span>
        <p className="eyebrow min-w-0 flex-1 truncate" title={metric.label}>{metric.label}</p>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className={`num text-[22px] leading-7 font-medium ${valueColor[metric.status]}`}>
          {metric.value}
          {metric.unit && <span className="ml-1 text-xs font-normal text-text-muted">{metric.unit}</span>}
        </p>
        {metric.status !== 'good' && (
          <span className={`num shrink-0 text-[10px] font-medium uppercase tracking-wider ${valueColor[metric.status]}`}>
            {word[metric.status]}
          </span>
        )}
      </div>
      {metric.detail && <p className="text-xs leading-4 text-text-muted">{metric.detail}</p>}
    </div>
  )
}
