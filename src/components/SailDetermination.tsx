import type { MetricStatus } from '../types/assessment'
import type { ArcClass } from './ArcDetermination'

interface SailDeterminationProps {
  grc: number | null
  arc: ArcClass | null
}

function computeSail(grc: number, arc: ArcClass): number {
  const isArcA = arc === 'a'
  if (grc < 3) return isArcA ? 1 : 2
  if (grc === 3) return 2
  if (grc === 4) return 3
  return 4
}

function getSailStatus(sail: number): MetricStatus {
  if (sail <= 1) return 'good'
  if (sail <= 2) return 'caution'
  return 'warning'
}

const statusConfig: Record<MetricStatus, { bg: string; text: string; border: string }> = {
  good: { bg: 'bg-good-bg', text: 'text-good', border: 'border-good/30' },
  caution: { bg: 'bg-caution-bg', text: 'text-caution', border: 'border-caution/30' },
  warning: { bg: 'bg-warning-bg', text: 'text-warning', border: 'border-warning/30' },
}

const SAIL_LABELS = ['I', 'II', 'III', 'IV'] as const

const SAIL_ROWS = [
  { label: '< 3', test: (grc: number) => grc < 3, sailA: 'I', sailBcd: 'II' },
  { label: '3', test: (grc: number) => grc === 3, sailA: 'II', sailBcd: 'II' },
  { label: '4', test: (grc: number) => grc === 4, sailA: 'III', sailBcd: 'III' },
  { label: '> 4', test: (grc: number) => grc > 4, sailA: 'IV', sailBcd: 'IV' },
] as const

export default function SailDetermination({ grc, arc }: SailDeterminationProps) {
  if (grc === null || arc === null) {
    return (
      <div className="rounded-lg bg-surface-alt px-4 py-3">
        <p className="text-center text-sm text-text-muted">
          GRC und ARC müssen bestimmt werden, um das SAIL-Level zu berechnen.
        </p>
      </div>
    )
  }

  const arcBlocked = arc === 'cd'
  const sail = computeSail(grc, arc)
  const status = getSailStatus(sail)
  const { bg, text, border } = statusConfig[status]
  const isArcA = arc === 'a'
  const isRiskFlight = sail >= 3 || arc === 'c-star'

  return (
    <div className="space-y-3">
      {/* SAIL-Tabelle */}
      <div className="overflow-hidden rounded-lg bg-surface-alt">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface">
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">GRC</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-muted">ARC-a</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-muted">
                ARC-b / c/d
              </th>
            </tr>
          </thead>
          <tbody>
            {SAIL_ROWS.map((row) => {
              const isActiveRow = row.test(grc)
              return (
                <tr key={row.label} className={isActiveRow ? 'bg-text/5' : ''}>
                  <td
                    className={`px-3 py-2 ${isActiveRow ? 'font-medium text-text' : 'text-text-muted'}`}
                  >
                    {row.label}
                  </td>
                  <td
                    className={`px-3 py-2 text-center ${
                      isActiveRow && isArcA ? 'font-bold text-text' : 'text-text-muted'
                    }`}
                  >
                    {isActiveRow && isArcA ? `\u2192 SAIL ${row.sailA}` : `SAIL ${row.sailA}`}
                  </td>
                  <td
                    className={`px-3 py-2 text-center ${
                      isActiveRow && !isArcA ? 'font-bold text-text' : 'text-text-muted'
                    }`}
                  >
                    {isActiveRow && !isArcA
                      ? `\u2192 SAIL ${row.sailBcd}`
                      : `SAIL ${row.sailBcd}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Ergebnis-Karte */}
      <div className={`rounded-xl border ${border} ${bg} px-5 py-4 text-center`}>
        <p className={`text-lg font-bold ${text}`}>SAIL {SAIL_LABELS[sail - 1]}</p>
        {sail >= 4 && <p className="mt-1 text-sm text-warning">Flug nicht möglich!</p>}
        {arcBlocked && sail < 4 && (
          <p className="mt-1 text-sm text-warning">Flug aufgrund ARC-c/d nicht möglich!</p>
        )}
      </div>

      {/* Risikoflug-Hinweis */}
      {isRiskFlight && !arcBlocked && sail < 4 && (
        <div className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
          <p className="text-sm font-medium text-warning">Risikoflug</p>
          <p className="text-xs text-warning/80">
            {arc === 'c-star' && 'Flug nur an Einsatzstellen erlaubt. '}
            Meldung an Einsatzleitung erforderlich!
          </p>
        </div>
      )}
    </div>
  )
}
