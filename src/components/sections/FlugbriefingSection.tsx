import { PiCheck, PiChecks, PiArrowCounterClockwise, PiUsersThree } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import type { MetricStatus } from '../../types/assessment'
import ChecklistSection from '../ChecklistSection'

// ---------------------------------------------------------------------------
// Briefing items
// ---------------------------------------------------------------------------

export const FLUGBRIEFING_ITEMS = [
  { key: 'aufgaben', label: 'Verteilung der Aufgaben klar' },
  { key: 'landeplatz', label: 'Start- und Landeplatz' },
  { key: 'notfallplan', label: 'Notfallplan' },
  { key: 'fluggebiete', label: 'Flug- und Suchgebiete' },
  { key: 'notam', label: 'NOTAM' },
  { key: 'geozonen', label: 'Geo-Zonen' },
  { key: 'wetter', label: 'Wetter' },
  { key: 'stoerquellen', label: 'Störquellen' },
  { key: 'kommunikation', label: 'Kommunikation klar' },
  { key: 'vorflugkontrolle', label: 'Vorflugkontrolle abgeschlossen' },
  { key: 'stromversorgung', label: 'Externe Stromversorgung' },
  { key: 'benachbarte', label: 'Benachbarte Kräfte informiert' },
  { key: 'risikobewertung', label: 'Risikobewertung' },
  { key: 'gefahren', label: 'Gefahren besprochen' },
  { key: 'naturschutz', label: 'Naturschutz berücksichtigt' },
  { key: 'fragen', label: 'Fragen und Bedenken geklärt' },
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FlugbriefingSection() {
  const [checked, setChecked] = useMissionPersistedState<Record<string, boolean>>('flugbriefing:checked', {})

  const checkedCount = FLUGBRIEFING_ITEMS.filter((item) => checked[item.key]).length
  const totalCount = FLUGBRIEFING_ITEMS.length
  const allChecked = checkedCount === totalCount

  const badge: { label: string; status: MetricStatus } = {
    label: allChecked ? 'Briefing erledigt' : `${checkedCount}/${totalCount}`,
    status: allChecked ? 'good' : checkedCount === 0 ? 'warning' : 'caution',
  }

  function toggleCheck(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function confirmAll() {
    const all: Record<string, boolean> = {}
    for (const item of FLUGBRIEFING_ITEMS) all[item.key] = true
    setChecked(all)
  }

  function resetAll() {
    setChecked({})
  }

  return (
    <ChecklistSection title="Flugbriefing" icon={<PiUsersThree />} sectionId="flugbriefing" badge={badge}>
      <p className="text-xs text-text-muted -mt-1 mb-1">
        Alle Punkte im Team besprechen und bestätigen.
      </p>
      <div className="-mx-5 -mb-5">
        {/* Confirm-all / Reset */}
        <div className="px-4 pb-2">
          {allChecked ? (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              <PiArrowCounterClockwise className="text-xs" />
              Zurücksetzen
            </button>
          ) : (
            <button
              onClick={confirmAll}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-good/10 px-4 py-2.5 text-sm font-medium text-good transition-colors hover:bg-good/20"
            >
              <PiChecks className="text-[1rem]" />
              Alle bestätigen
              {checkedCount > 0 && (
                <span className="text-good/60">({totalCount - checkedCount} offen)</span>
              )}
            </button>
          )}
        </div>

        {/* Individual briefing items */}
        <div className="divide-y divide-surface-alt">
          {FLUGBRIEFING_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => toggleCheck(item.key)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-alt"
            >
              <span
                className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border text-[0.6rem] transition-colors ${
                  checked[item.key]
                    ? 'border-good bg-good text-white'
                    : 'border-text-muted/30 text-transparent'
                }`}
              >
                <PiCheck />
              </span>
              <p className={`text-sm transition-colors ${checked[item.key] ? 'text-text-muted' : 'text-text'}`}>
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </ChecklistSection>
  )
}
