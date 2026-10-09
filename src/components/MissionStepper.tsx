import { useNavigate, useParams } from 'react-router'
import { PiCheck, PiLock } from 'react-icons/pi'
import { usePhaseAccess } from '../hooks/usePhaseAccess'
import type { MissionPhase } from '../types/mission'

const STEPS: Array<{ phase: MissionPhase; label: string; short: string }> = [
  { phase: 'einsatzdaten', label: 'Einsatzdaten', short: 'Daten' },
  { phase: 'vorflugkontrolle', label: 'Vorflugkontrolle', short: 'Vorflug' },
  { phase: 'fluege', label: 'Flüge', short: 'Flüge' },
  { phase: 'nachbereitung', label: 'Nachbereitung', short: 'Abschluss' },
]

interface MissionStepperProps {
  currentPhase: MissionPhase
}

/**
 * Phasenleiste als Segmentleiste im Fugenraster (Lifeline Hub): Nummer in Mono,
 * Name immer sichtbar (auf schmalen Schirmen in Kurzform), aktiv mit
 * 2-px-Bedienkante oben, erledigt mit Haken, gesperrt mit Schloss und Grund.
 */
export default function MissionStepper({ currentPhase }: MissionStepperProps) {
  const navigate = useNavigate()
  const { missionId } = useParams()
  const currentIndex = STEPS.findIndex((s) => s.phase === currentPhase)
  const { canAccess, lockReason } = usePhaseAccess()

  return (
    <nav aria-label="Einsatzphasen" className="fugen grid grid-cols-4">
      {STEPS.map((step, i) => {
        const isActive = step.phase === currentPhase
        const isPast = i < currentIndex
        const isLocked = !canAccess[step.phase]
        const nr = String(i + 1).padStart(2, '0')
        return (
          <button
            key={step.phase}
            disabled={isLocked}
            aria-current={isActive ? 'step' : undefined}
            onClick={() => !isLocked && navigate(`/mission/${missionId}/${step.phase}`)}
            title={lockReason[step.phase] ?? step.label}
            className={`relative flex min-h-14 flex-col items-start justify-center gap-0.5 px-3 py-2 text-left transition-colors ${
              isLocked
                ? 'cursor-not-allowed bg-surface text-faint'
                : isActive
                  ? 'bg-surface-alt text-text'
                  : 'bg-surface text-text-muted hover:bg-surface-alt hover:text-text'
            }`}
          >
            {isActive && <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" aria-hidden="true" />}
            <span className="num flex items-center gap-1.5 text-[11px] leading-none">
              <span className={isActive ? 'text-accent-text' : isPast ? 'text-good' : ''}>{nr}</span>
              {isLocked ? (
                <PiLock className="text-[11px]" aria-label="gesperrt" />
              ) : isPast ? (
                <PiCheck className="text-[11px] text-good" aria-label="erledigt" />
              ) : null}
            </span>
            <span className={`text-[13px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
              <span className="sm:hidden">{step.short}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
