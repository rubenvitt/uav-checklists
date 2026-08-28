import { PiUsersThree, PiPlus, PiX } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { useCrewRoster } from '../../hooks/useCrewRoster'
import ChecklistSection from '../ChecklistSection'
import AutocompleteInput from '../AutocompleteInput'

type CrewRole = 'fernpilot' | 'luftraumbeobachter' | 'bildauswerter'

const ROLE_LABELS: Record<string, string> = {
  fernpilot: 'Fernpilot',
  luftraumbeobachter: 'Luftraumbeobachter',
  bildauswerter: 'Bildauswerter',
}

const ADDABLE_ROLES: CrewRole[] = ['fernpilot', 'luftraumbeobachter', 'bildauswerter']

const BASE_ROLES: Array<{ key: string; label: string; critical: boolean }> = [
  { key: 'fk', label: 'Führungskraft', critical: true },
  { key: 'fp', label: 'Fernpilot', critical: true },
  { key: 'lrb', label: 'Luftraumbeobachter', critical: true },
  { key: 'ba', label: 'Bildauswerter', critical: false },
]

interface AdditionalMember {
  role: CrewRole
  name: string
}

export default function TruppstaerkeSection({ open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  const [fk, setFk] = useMissionPersistedState('crew_fk', '')
  const [fp, setFp] = useMissionPersistedState('crew_fp', '')
  const [lrb, setLrb] = useMissionPersistedState('crew_lrb', '')
  const [ba, setBa] = useMissionPersistedState('crew_ba', '')
  const [additional, setAdditional] = useMissionPersistedState<AdditionalMember[]>('crew_additional', [])
  const { roster, add: rememberName, remove: forgetName } = useCrewRoster()

  const names: Record<string, string> = { fk, fp, lrb, ba }
  const setters: Record<string, (v: string) => void> = { fk: setFk, fp: setFp, lrb: setLrb, ba: setBa }

  const fkCount = fk.trim() ? 1 : 0
  const othersBase = [fp, lrb, ba].filter((n) => n.trim()).length
  const additionalFilled = additional.filter((m) => m.name.trim()).length
  const othersCount = othersBase + additionalFilled
  const total = fkCount + othersCount

  const hasCriticalGap = !fk.trim() || !fp.trim() || !lrb.trim()

  const badge = {
    label: <>{fkCount}/{othersCount}//<span className="underline">{total}</span></>,
    status: hasCriticalGap ? 'caution' as const : 'good' as const,
  }

  function addMember(role: CrewRole) {
    setAdditional((prev) => [...prev, { role, name: '' }])
  }

  function removeMember(index: number) {
    setAdditional((prev) => prev.filter((_, i) => i !== index))
  }

  function updateMemberName(index: number, name: string) {
    setAdditional((prev) => prev.map((m, i) => (i === index ? { ...m, name } : m)))
  }

  return (
    <ChecklistSection title="Truppstärke" icon={<PiUsersThree />} badge={badge} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      <div className="-mx-5 -mt-1">
        <div className="divide-y divide-surface-alt">
          {BASE_ROLES.map(({ key, label, critical }) => {
            const isEmpty = !names[key].trim()
            const showWarning = isEmpty && critical

            return (
              <AutocompleteInput
                key={key}
                label={label}
                value={names[key]}
                onChange={setters[key]}
                onBlur={() => rememberName(names[key])}
                suggestions={roster}
                onRemoveSuggestion={forgetName}
                placeholder="Name eingeben..."
                warning={showWarning}
              />
            )
          })}

          {additional.map((member, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-3">
              <AutocompleteInput
                label={ROLE_LABELS[member.role]}
                value={member.name}
                onChange={(name) => updateMemberName(i, name)}
                onBlur={() => rememberName(member.name)}
                suggestions={roster}
                onRemoveSuggestion={forgetName}
                placeholder="Name eingeben..."
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeMember(i)}
                className="mt-5 rounded p-1 text-text-muted hover:text-warning transition-colors"
              >
                <PiX />
              </button>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 flex flex-wrap gap-2">
          {ADDABLE_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => addMember(role)}
              className="flex items-center gap-1 rounded-lg bg-surface-alt px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              <PiPlus className="text-[0.6rem]" />
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>
    </ChecklistSection>
  )
}
