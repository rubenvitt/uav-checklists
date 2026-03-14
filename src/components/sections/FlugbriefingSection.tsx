import { PiCheck, PiChecks, PiArrowCounterClockwise, PiUsersThree, PiX } from 'react-icons/pi'
import { useSegmentPersistedState } from '../../hooks/useSegmentPersistedState'
import type { MetricStatus } from '../../types/assessment'
import { getChecklistAnswer, getNextChecklistAnswer, isAnswered, type ChecklistState } from '../../utils/checklistState'
import ChecklistSection from '../ChecklistSection'

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

export default function FlugbriefingSection({ open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean } = {}) {
  const [checked, setChecked] = useSegmentPersistedState<ChecklistState>('flugbriefing:checked', {})

  const answeredCount = FLUGBRIEFING_ITEMS.filter((item) => isAnswered(checked[item.key])).length
  const negativeCount = FLUGBRIEFING_ITEMS.filter((item) => getChecklistAnswer(checked[item.key]) === 'negative').length
  const totalCount = FLUGBRIEFING_ITEMS.length
  const allChecked = answeredCount === totalCount

  const badge: { label: string; status: MetricStatus } = {
    label: allChecked ? (negativeCount > 0 ? `${negativeCount} negativ` : 'Briefing erledigt') : `${answeredCount}/${totalCount}`,
    status: allChecked ? (negativeCount > 0 ? 'warning' : 'good') : answeredCount === 0 ? 'warning' : 'caution',
  }

  function toggleCheck(key: string) {
    setChecked((prev) => {
      const nextValue = getNextChecklistAnswer(prev[key])
      const next = { ...prev }
      if (!nextValue) delete next[key]
      else next[key] = nextValue
      return next
    })
  }

  function confirmAll() {
    const all: ChecklistState = {}
    for (const item of FLUGBRIEFING_ITEMS) all[item.key] = 'positive'
    setChecked(all)
  }

  return (
    <ChecklistSection title="Flugbriefing" icon={<PiUsersThree />} badge={badge} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      <p className="text-xs text-text-muted -mt-1 mb-1">Alle Punkte im Team besprechen und bewerten (positiv/negativ).</p>
      <div className="-mx-5 -mb-5">
        <div className="px-4 pb-2">
          {allChecked ? (
            <button onClick={() => setChecked({})} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"><PiArrowCounterClockwise className="text-xs" />Zurücksetzen</button>
          ) : (
            <button onClick={confirmAll} className="flex w-full items-center justify-center gap-2 rounded-lg bg-good/10 px-4 py-2.5 text-sm font-medium text-good transition-colors hover:bg-good/20">
              <PiChecks className="text-[1rem]" />Alle positiv
              {answeredCount > 0 && <span className="text-good/60">({totalCount - answeredCount} offen)</span>}
            </button>
          )}
        </div>

        <div className="divide-y divide-surface-alt">
          {FLUGBRIEFING_ITEMS.map((item) => {
            const answer = getChecklistAnswer(checked[item.key])
            return (
              <button key={item.key} onClick={() => toggleCheck(item.key)} className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-alt">
                {answer === 'positive' ? <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-good bg-good text-[0.6rem] text-white"><PiCheck /></span> : answer === 'negative' ? <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-warning bg-warning text-[0.6rem] text-white"><PiX /></span> : <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-text-muted/30 text-[0.6rem] text-transparent"><PiCheck /></span>}
                <p className={`text-sm transition-colors ${isAnswered(checked[item.key]) ? 'text-text-muted' : 'text-text'}`}>{item.label}</p>
              </button>
            )
          })}
        </div>
      </div>
    </ChecklistSection>
  )
}
