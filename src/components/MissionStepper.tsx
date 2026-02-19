import { useNavigate, useParams } from 'react-router'
import { PiCheckCircle, PiAirplaneTakeoff, PiClipboardText } from 'react-icons/pi'
import type { MissionPhase } from '../types/mission'

const STEPS: Array<{ phase: MissionPhase; label: string; icon: React.ReactNode }> = [
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

  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface p-1.5">
      {STEPS.map((step, i) => {
        const isActive = step.phase === currentPhase
        const isPast = i < currentIndex
        return (
          <button
            key={step.phase}
            onClick={() => navigate(`/mission/${missionId}/${step.phase}`)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-text text-base'
                : isPast
                  ? 'text-good hover:bg-surface-alt'
                  : 'text-text-muted hover:bg-surface-alt hover:text-text'
            }`}
          >
            <span className="text-sm">{step.icon}</span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        )
      })}
    </div>
  )
}
