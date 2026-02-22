import { PiCheckCircle, PiXCircle, PiProhibit } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import type { MetricStatus } from '../../types/assessment'
import ChecklistSection from '../ChecklistSection'

type MissionResult = 'erfolgreich' | 'erfolglos' | 'abgebrochen' | null

interface ResultOption {
  key: MissionResult & string
  label: string
  icon: React.ReactNode
  activeColor: string
}

const RESULT_OPTIONS: ResultOption[] = [
  {
    key: 'erfolgreich',
    label: 'Einsatz erfolgreich beendet',
    icon: <PiCheckCircle />,
    activeColor: 'bg-good text-white',
  },
  {
    key: 'erfolglos',
    label: 'Einsatz erfolglos beendet',
    icon: <PiXCircle />,
    activeColor: 'bg-caution text-white',
  },
  {
    key: 'abgebrochen',
    label: 'Einsatz abgebrochen',
    icon: <PiProhibit />,
    activeColor: 'bg-warning text-white',
  },
]

const ABORT_REASONS = [
  'Technische Probleme',
  'Wetter',
  'Luftraumsperrung',
  'Behördliche Anweisung',
  'Sicherheitsbedenken',
  'Sonstiges',
]

function computeBadge(result: MissionResult): { label: string; status: MetricStatus } | undefined {
  if (result === 'erfolgreich') return { label: 'Erfolgreich', status: 'good' }
  if (result === 'erfolglos') return { label: 'Erfolglos', status: 'caution' }
  if (result === 'abgebrochen') return { label: 'Abgebrochen', status: 'warning' }
  return undefined
}

export default function MissionResultSection({ open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  const [result, setResult] = useMissionPersistedState<MissionResult>('result:outcome', null)
  const [abortReason, setAbortReason] = useMissionPersistedState<string>('result:abortReason', '')
  const [abortNotes, setAbortNotes] = useMissionPersistedState<string>('result:abortNotes', '')

  function selectResult(key: MissionResult) {
    if (result === key) {
      setResult(null)
      return
    }
    setResult(key)
    if (key !== 'abgebrochen') {
      setAbortReason('')
      setAbortNotes('')
    }
  }

  const badge = computeBadge(result)

  return (
    <ChecklistSection
      title="Ergebnis"
      icon={<PiCheckCircle />}
      badge={badge}
      open={open}
      onToggle={onToggle}
      isComplete={isComplete}
      onContinue={onContinue}
      continueLabel={continueLabel}
      isPhaseComplete={isPhaseComplete}
    >
      <div className="space-y-2">
        {RESULT_OPTIONS.map(option => {
          const isActive = result === option.key
          return (
            <button
              key={option.key}
              onClick={() => selectResult(option.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors active:scale-[0.99] ${
                isActive
                  ? option.activeColor
                  : 'bg-surface-alt text-text hover:bg-surface-alt/80'
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              {option.label}
            </button>
          )
        })}
      </div>

      {result === 'abgebrochen' && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-text-muted">Grund für den Abbruch:</p>
          <div className="flex flex-wrap gap-2">
            {ABORT_REASONS.map(reason => {
              const isActive = abortReason === reason
              return (
                <button
                  key={reason}
                  onClick={() => setAbortReason(isActive ? '' : reason)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors active:scale-[0.98] ${
                    isActive
                      ? 'bg-warning text-white'
                      : 'bg-surface-alt text-text-muted hover:text-text'
                  }`}
                >
                  {reason}
                </button>
              )
            })}
          </div>
          <textarea
            value={abortNotes}
            onChange={e => setAbortNotes(e.target.value)}
            placeholder="Weitere Details zum Abbruch..."
            rows={3}
            className="w-full resize-none rounded-lg bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/60 outline-none focus:ring-1 focus:ring-text-muted"
          />
        </div>
      )}
    </ChecklistSection>
  )
}
