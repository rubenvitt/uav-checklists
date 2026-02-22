import { useNavigate, useParams } from 'react-router'
import { PiCheckCircle, PiAirplaneTakeoff, PiClipboardText, PiNotePencil, PiLock } from 'react-icons/pi'
import { usePhaseAccess } from '../hooks/usePhaseAccess'
import type { MissionPhase } from '../types/mission'

const STEPS: Array<{ phase: MissionPhase; label: string; icon: React.ReactNode }> = [
  { phase: 'einsatzdaten', label: 'Einsatzdaten', icon: <PiNotePencil /> },
  { phase: 'vorflugkontrolle', label: 'Vorflugkontrolle', icon: <PiClipboardText /> },
  { phase: 'fluege', label: 'Flüge', icon: <PiAirplaneTakeoff /> },
  { phase: 'nachbereitung', label: 'Nachbereitung', icon: <PiCheckCircle /> },
]

interface MissionStepperProps {
  currentPhase: MissionPhase
}

export default function MissionStepper({ currentPhase }: MissionStepperProps) {
  const navigate = useNavigate()
  const { missionId } = useParams()
  const currentIndex = STEPS.findIndex((s) => s.phase === currentPhase)
  const { canAccess, lockReason } = usePhaseAccess()

  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface p-1.5">
      {STEPS.map((step, i) => {
        const isActive = step.phase === currentPhase
        const isPast = i < currentIndex
        const isLocked = !canAccess[step.phase]
        return (
          <button
            key={step.phase}
            disabled={isLocked}
            onClick={() => !isLocked && navigate(`/mission/${missionId}/${step.phase}`)}
            title={lockReason[step.phase] ?? undefined}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              isLocked
                ? 'cursor-not-allowed opacity-35'
                : isActive
                  ? 'bg-text text-base'
                  : isPast
                    ? 'text-good hover:bg-surface-alt'
                    : 'text-text-muted hover:bg-surface-alt hover:text-text'
            }`}
          >
            <span className="text-sm">{isLocked ? <PiLock /> : step.icon}</span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        )
      })}
    </div>
  )
}
