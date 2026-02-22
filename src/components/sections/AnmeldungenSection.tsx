import { PiPhone, PiPlus, PiX, PiCheck, PiTrain, PiBoat, PiWarning } from 'react-icons/pi'
import { useSegmentPersistedState } from '../../hooks/useSegmentPersistedState'
import type { NearbyCategory } from '../../services/overpassApi'
import ChecklistSection from '../ChecklistSection'

interface AnmeldungenSectionProps {
  categories: NearbyCategory[]
  open?: boolean
  onToggle?: () => void
  isComplete?: boolean
  onContinue?: () => void
  continueLabel?: string
  isPhaseComplete?: boolean
}

const REQUIRED_NOTIFICATIONS = [
  { key: 'leitstelle', label: 'Leitstelle', detail: '19222' },
  { key: 'polizei', label: 'Polizei', detail: '110' },
]

interface AdditionalNotification {
  label: string
  detail: string
}

export default function AnmeldungenSection({ categories, open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: AnmeldungenSectionProps) {
  const [checked, setChecked] = useSegmentPersistedState<Record<string, boolean>>('anmeldungen:checked', {})
  const [additional, setAdditional] = useSegmentPersistedState<AdditionalNotification[]>('anmeldungen:additional', [])

  const hasRailway = categories.some((c) => c.key === 'railway')
  const hasWaterway = categories.some((c) => c.key === 'waterway')

  const conditionalNotifications = [
    ...(hasRailway ? [{ key: 'bahn', label: 'Bahn (DB Netz)', detail: 'Bahnlinien im Einsatzgebiet', icon: <PiTrain /> }] : []),
    ...(hasWaterway ? [{ key: 'wsa', label: 'Wasserstraßen- und Schifffahrtsamt', detail: 'Wasserstraßen im Einsatzgebiet', icon: <PiBoat /> }] : []),
  ]

  const allKeys = [
    ...REQUIRED_NOTIFICATIONS.map((n) => n.key),
    ...conditionalNotifications.map((n) => n.key),
    ...additional.map((_, i) => `custom_${i}`),
  ]
  const checkedCount = allKeys.filter((k) => checked[k]).length
  const totalCount = allKeys.length

  const allChecked = totalCount > 0 && checkedCount === totalCount
  const badge = {
    label: `${checkedCount}/${totalCount}`,
    status: allChecked ? ('good' as const) : ('caution' as const),
  }

  function toggleCheck(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function addNotification() {
    setAdditional((prev) => [...prev, { label: '', detail: '' }])
  }

  function removeNotification(index: number) {
    setAdditional((prev) => prev.filter((_, i) => i !== index))
    setChecked((prev) => {
      const next = { ...prev }
      delete next[`custom_${index}`]
      // Re-index higher custom keys
      const updated: Record<string, boolean> = {}
      for (const [k, v] of Object.entries(next)) {
        if (k.startsWith('custom_')) {
          const idx = parseInt(k.split('_')[1], 10)
          if (idx > index) {
            updated[`custom_${idx - 1}`] = v
          } else {
            updated[k] = v
          }
        } else {
          updated[k] = v
        }
      }
      return updated
    })
  }

  function updateNotification(index: number, field: 'label' | 'detail', value: string) {
    setAdditional((prev) => prev.map((n, i) => (i === index ? { ...n, [field]: value } : n)))
  }

  return (
    <ChecklistSection title="Fluganmeldungen" icon={<PiPhone />} badge={badge} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      <div className="-mx-5 -mt-1">
        <div className="divide-y divide-surface-alt">
          {/* Required notifications */}
          {REQUIRED_NOTIFICATIONS.map((n) => (
            <button
              key={n.key}
              onClick={() => toggleCheck(n.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                  checked[n.key]
                    ? 'border-good bg-good text-white'
                    : 'border-text-muted/30 text-transparent'
                }`}
              >
                <PiCheck />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium transition-colors ${checked[n.key] ? 'text-text-muted' : 'text-text'}`}>
                  {n.label}
                </p>
                <p className="text-xs text-text-muted">{n.detail}</p>
              </div>
            </button>
          ))}

          {/* Conditional notifications based on NearbyCheck */}
          {conditionalNotifications.map((n) => (
            <button
              key={n.key}
              onClick={() => toggleCheck(n.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                  checked[n.key]
                    ? 'border-good bg-good text-white'
                    : 'border-caution/50 text-transparent'
                }`}
              >
                <PiCheck />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-caution text-sm">{n.icon}</span>
                  <p className={`text-sm font-medium transition-colors ${checked[n.key] ? 'text-text-muted' : 'text-text'}`}>
                    {n.label}
                  </p>
                </div>
                <p className="text-xs text-caution/80 flex items-center gap-1 mt-0.5">
                  <PiWarning className="shrink-0" />
                  {n.detail}
                </p>
              </div>
            </button>
          ))}

          {/* Additional custom notifications */}
          {additional.map((n, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-3">
              <button
                onClick={() => toggleCheck(`custom_${i}`)}
                className="shrink-0 pt-5"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border text-xs transition-colors ${
                    checked[`custom_${i}`]
                      ? 'border-good bg-good text-white'
                      : 'border-text-muted/30 text-transparent'
                  }`}
                >
                  <PiCheck />
                </span>
              </button>
              <div className="flex-1 space-y-1.5">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Stelle</label>
                  <input
                    type="text"
                    value={n.label}
                    onChange={(e) => updateNotification(i, 'label', e.target.value)}
                    placeholder="z.B. Ordnungsamt, Flugsicherung..."
                    className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
                    data-1p-ignore
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Kontakt / Hinweis</label>
                  <input
                    type="text"
                    value={n.detail}
                    onChange={(e) => updateNotification(i, 'detail', e.target.value)}
                    placeholder="Telefonnummer oder Notiz..."
                    className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
                    data-1p-ignore
                    autoComplete="off"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeNotification(i)}
                className="mt-5 rounded p-1 text-text-muted hover:text-warning transition-colors"
              >
                <PiX />
              </button>
            </div>
          ))}
        </div>

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={addNotification}
            className="flex items-center gap-1 rounded-lg bg-surface-alt px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
          >
            <PiPlus className="text-[0.6rem]" />
            Weitere Stelle
          </button>
        </div>
      </div>
    </ChecklistSection>
  )
}
