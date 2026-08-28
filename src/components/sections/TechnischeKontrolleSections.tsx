import { type ReactNode } from 'react'
import { PiCheck, PiChecks, PiArrowCounterClockwise, PiMapPin, PiDrone, PiGameController, PiX } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { useSegmentPersistedState } from '../../hooks/useSegmentPersistedState'
import type { MetricStatus } from '../../types/assessment'
import { getChecklistAnswer, getNextChecklistAnswer, isAnswered, type ChecklistState } from '../../utils/checklistState'
import ChecklistSection from '../ChecklistSection'
import { AUFSTIEGSORT_ITEMS, UAV_ITEMS, RC_ITEMS, type CheckItem } from '../../data/technischeKontrolleItems'

function useQuickChecklist(storageKey: string, items: readonly CheckItem[], segmentScoped: boolean = false) {
  const [checkedMission, setCheckedMission] = useMissionPersistedState<ChecklistState>(storageKey, {})
  const [checkedSegment, setCheckedSegment] = useSegmentPersistedState<ChecklistState>(storageKey, {})
  const checked = segmentScoped ? checkedSegment : checkedMission
  const setChecked = segmentScoped ? setCheckedSegment : setCheckedMission

  const answeredCount = items.filter((item) => isAnswered(checked[item.key])).length
  const negativeCount = items.filter((item) => getChecklistAnswer(checked[item.key]) === 'negative').length
  const totalCount = items.length
  const allChecked = answeredCount === totalCount

  const badge: { label: string; status: MetricStatus } = {
    label: allChecked ? (negativeCount > 0 ? `${negativeCount} negativ` : 'Abgeschlossen') : `${answeredCount}/${totalCount}`,
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
    for (const item of items) all[item.key] = 'positive'
    setChecked(all)
  }

  function resetAll() {
    setChecked({})
  }

  return { checked, answeredCount, totalCount, allChecked, badge, toggleCheck, confirmAll, resetAll }
}

function QuickChecklistContent({
  items,
  checked,
  allChecked,
  answeredCount,
  totalCount,
  toggleCheck,
  confirmAll,
  resetAll,
}: {
  items: readonly CheckItem[]
  checked: ChecklistState
  allChecked: boolean
  answeredCount: number
  totalCount: number
  toggleCheck: (key: string) => void
  confirmAll: () => void
  resetAll: () => void
}) {
  return (
    <div className="-mx-5 -mb-5">
      <div className="px-4 pb-2">
        {allChecked ? (
          <button onClick={resetAll} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors">
            <PiArrowCounterClockwise className="text-xs" />Zurücksetzen
          </button>
        ) : (
          <button onClick={confirmAll} className="flex w-full items-center justify-center gap-2 rounded-lg bg-good/10 px-4 py-2.5 text-sm font-medium text-good transition-colors hover:bg-good/20">
            <PiChecks className="text-[1rem]" />Alle positiv
            {answeredCount > 0 && <span className="text-good/60">({totalCount - answeredCount} offen)</span>}
          </button>
        )}
      </div>

      <div className="divide-y divide-surface-alt">
        {items.map((item) => {
          const answer = getChecklistAnswer(checked[item.key])
          return (
            <button key={item.key} onClick={() => toggleCheck(item.key)} className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-alt">
              {answer === 'positive' ? (
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-good bg-good text-[0.6rem] text-white"><PiCheck /></span>
              ) : answer === 'negative' ? (
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-warning bg-warning text-[0.6rem] text-white"><PiX /></span>
              ) : (
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-text-muted/30 text-[0.6rem] text-transparent"><PiCheck /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm transition-colors ${isAnswered(checked[item.key]) ? 'text-text-muted' : 'text-text'}`}>{item.label}</p>
                {item.hint && <p className="text-xs text-text-muted/70">{item.hint}</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CheckSection({ title, icon, storageKey, items, segmentScoped, open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: { title: string; icon: ReactNode; storageKey: string; items: readonly CheckItem[]; segmentScoped?: boolean; open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  const checklist = useQuickChecklist(storageKey, items, segmentScoped)

  return (
    <ChecklistSection title={title} icon={icon} badge={checklist.badge} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      <QuickChecklistContent items={items} {...checklist} />
    </ChecklistSection>
  )
}

export function AufstiegsortSection(props: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  return <CheckSection title="Aufstiegsort" icon={<PiMapPin />} storageKey="techcheck:aufstiegsort" items={AUFSTIEGSORT_ITEMS} segmentScoped {...props} />
}

export function UavCheckSection(props: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  return <CheckSection title="UAV" icon={<PiDrone />} storageKey="techcheck:uav" items={UAV_ITEMS} {...props} />
}

export function RemoteControllerSection(props: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  return <CheckSection title="Remote Controller (A und B)" icon={<PiGameController />} storageKey="techcheck:rc" items={RC_ITEMS} {...props} />
}
