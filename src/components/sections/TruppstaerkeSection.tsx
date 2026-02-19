import { PiUsersThree, PiPlus, PiX } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'

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

export default function TruppstaerkeSection() {
  const [fk, setFk] = useMissionPersistedState('crew_fk', '')
  const [fp, setFp] = useMissionPersistedState('crew_fp', '')
  const [lrb, setLrb] = useMissionPersistedState('crew_lrb', '')
  const [ba, setBa] = useMissionPersistedState('crew_ba', '')
  const [additional, setAdditional] = useMissionPersistedState<AdditionalMember[]>('crew_additional', [])

  const names: Record<string, string> = { fk, fp, lrb, ba }
  const setters: Record<string, (v: string) => void> = { fk: setFk, fp: setFp, lrb: setLrb, ba: setBa }

  const fkCount = fk.trim() ? 1 : 0
  const othersBase = [fp, lrb, ba].filter((n) => n.trim()).length
  const additionalFilled = additional.filter((m) => m.name.trim()).length
  const othersCount = othersBase + additionalFilled
  const total = fkCount + othersCount

  const hasCriticalGap = !fk.trim() || !fp.trim() || !lrb.trim()

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
    <div className="rounded-xl bg-surface overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="text-lg flex items-center text-text-muted">
          <PiUsersThree />
        </span>
        <span className="flex-1 font-semibold text-text">Truppstärke</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium font-mono tracking-wide ${
            hasCriticalGap ? 'bg-caution-bg text-caution' : 'bg-surface-alt text-text-muted'
          }`}
        >
          {fkCount}/{othersCount}//<span className="underline">{total}</span>
        </span>
      </div>

      <div className="divide-y divide-surface-alt">
        {BASE_ROLES.map(({ key, label, critical }) => {
          const isEmpty = !names[key].trim()
          const showWarning = isEmpty && critical

          return (
            <div key={key} className="px-4 py-3">
              <label
                className={`mb-1 block text-xs ${
                  showWarning ? 'text-caution' : 'text-text-muted'
                }`}
              >
                {label}
              </label>
              <input
                type="text"
                value={names[key]}
                onChange={(e) => setters[key](e.target.value)}
                placeholder="Name eingeben..."
                className={`w-full rounded-lg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted ${
                  showWarning ? 'bg-caution-bg/30' : 'bg-surface-alt'
                }`}
              />
            </div>
          )
        })}

        {additional.map((member, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-text-muted">{ROLE_LABELS[member.role]}</label>
              <input
                type="text"
                value={member.name}
                onChange={(e) => updateMemberName(i, e.target.value)}
                placeholder="Name eingeben..."
                className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
              />
            </div>
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
  )
}
