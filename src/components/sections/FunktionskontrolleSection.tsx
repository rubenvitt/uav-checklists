import { PiCheck, PiRocket, PiShieldCheck } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import type { MetricStatus } from '../../types/assessment'
import ChecklistSection from '../ChecklistSection'

// ---------------------------------------------------------------------------
// Functional test items (3m hover)
// ---------------------------------------------------------------------------

export const FUNKTIONS_ITEMS: Array<{ key: string; label: string; hint?: string }> = [
  {
    key: 'flugfunktionen',
    label: 'Flugfunktionen gegeben',
    hint: 'Steigen, Sinken, Vor, Rück, Links, Rechts, Gieren',
  },
  { key: 'beleuchtung', label: 'Beleuchtung funktioniert' },
  { key: 'bilduebertragung', label: 'Bildübertragung funktioniert' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FunktionskontrolleSection() {
  const [checked, setChecked] = useMissionPersistedState<Record<string, boolean>>('techcheck:funktionstest', {})
  const [flugFreigabe, setFlugFreigabe] = useMissionPersistedState<string | null>('flugfreigabe', null)

  const checkedCount = FUNKTIONS_ITEMS.filter((item) => checked[item.key]).length
  const totalCount = FUNKTIONS_ITEMS.length
  const allChecked = checkedCount === totalCount

  const isFreigegeben = !!flugFreigabe

  const badge: { label: string; status: MetricStatus } = isFreigegeben
    ? { label: 'Flug freigegeben', status: 'good' }
    : allChecked
      ? { label: 'Bereit', status: 'caution' }
      : { label: `${checkedCount}/${totalCount}`, status: 'warning' }

  function toggleCheck(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
    // Revoke clearance if a test item is unchecked
    if (checked[key] && isFreigegeben) {
      setFlugFreigabe(null)
    }
  }

  function grantClearance() {
    setFlugFreigabe(new Date().toISOString())
  }

  function revokeClearance() {
    setFlugFreigabe(null)
  }

  return (
    <ChecklistSection
      title="Erster Aufstieg & Freigabe"
      icon={<PiRocket />}
      badge={badge}
    >
      {/* Phase label */}
      <p className="text-xs text-text-muted -mt-1 mb-2">
        Aufstieg auf 3 m und Funktionskontrolle durchführen.
      </p>

      <div className="-mx-5 -mb-5">
        {/* Test items */}
        <div className="divide-y divide-surface-alt">
          {FUNKTIONS_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => toggleCheck(item.key)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-alt"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                  checked[item.key]
                    ? 'border-good bg-good text-white'
                    : 'border-text-muted/30 text-transparent'
                }`}
              >
                <PiCheck />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium transition-colors ${checked[item.key] ? 'text-text-muted' : 'text-text'}`}>
                  {item.label}
                </p>
                {item.hint && (
                  <p className="text-xs text-text-muted/70">{item.hint}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Flight clearance */}
        <div className="px-4 py-4">
          {isFreigegeben ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-good/10 px-4 py-3">
                <PiShieldCheck className="text-lg text-good" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-good">Flug freigegeben</p>
                  <p className="text-xs text-good/70">
                    {new Date(flugFreigabe!).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                  </p>
                </div>
              </div>
              <button
                onClick={revokeClearance}
                className="text-xs text-text-muted hover:text-warning transition-colors"
              >
                Freigabe widerrufen
              </button>
            </div>
          ) : (
            <button
              onClick={grantClearance}
              disabled={!allChecked}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                allChecked
                  ? 'bg-good text-white hover:bg-good/90'
                  : 'bg-surface-alt text-text-muted cursor-not-allowed'
              }`}
            >
              <PiShieldCheck className="text-base" />
              Flug freigeben
            </button>
          )}
        </div>
      </div>
    </ChecklistSection>
  )
}
