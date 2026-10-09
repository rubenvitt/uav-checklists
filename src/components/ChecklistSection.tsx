import { useState, type ReactNode } from 'react'
import { PiCaretDown, PiCaretRight, PiCheckCircle, PiLock } from 'react-icons/pi'
import type { MetricStatus } from '../types/assessment'

interface ChecklistSectionProps {
  title: string
  icon: ReactNode
  badge?: { label: ReactNode; status: MetricStatus }
  loading?: boolean
  locked?: boolean
  defaultOpen?: boolean
  open?: boolean
  onToggle?: () => void
  isComplete?: boolean
  onContinue?: () => void
  continueLabel?: string
  isPhaseComplete?: boolean
  children: React.ReactNode
}

/** Status-Chip nach Lifeline Hub: getönte Fläche, getönter Text, Wort Pflicht. */
const badgeColors: Record<MetricStatus, string> = {
  good: 'bg-good-bg text-good border-good/40',
  caution: 'bg-caution-bg text-caution border-caution/40',
  warning: 'bg-warning-bg text-warning border-warning/40',
}

/** Statuskante links am Paneel — zweiter Kanal neben dem Chip-Wort. */
const edgeColors: Record<MetricStatus, string> = {
  good: 'bg-good',
  caution: 'bg-caution',
  warning: 'bg-warning',
}

export default function ChecklistSection({ title, icon, badge, loading, locked, defaultOpen = false, open: controlledOpen, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete, children }: ChecklistSectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen

  const handleToggle = () => {
    if (locked) return
    if (isControlled && onToggle) onToggle()
    else setUncontrolledOpen(o => !o)
  }

  return (
    <section className={`relative border border-line bg-surface${locked ? ' opacity-55' : ''}`}>
      {!locked && !loading && badge && (
        <span className={`absolute -left-px top-0 bottom-0 w-0.5 ${edgeColors[badge.status]}`} aria-hidden="true" />
      )}
      <button
        onClick={handleToggle}
        aria-expanded={!locked ? isOpen : undefined}
        className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors ${locked ? 'cursor-not-allowed' : 'hover:bg-surface-alt'} ${isOpen && !locked ? 'border-b border-line' : ''}`}
      >
        <span className="flex items-center text-lg text-text-muted">{icon}</span>
        <span className="flex-1 text-[15px] leading-5 font-semibold text-text">{title}</span>
        {locked && (
          <span className="num flex items-center gap-1 text-[11px] text-faint">
            <PiLock /> Standort wählen
          </span>
        )}
        {!locked && loading && (
          <svg className="h-4 w-4 animate-spin text-text-muted" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {!locked && !loading && badge && (
          <span className={`num border px-2 py-0.5 text-[11px] font-medium ${badgeColors[badge.status]}`}>
            {badge.label}
          </span>
        )}
        <span className={`text-text-muted transition-transform duration-200 flex items-center ${isOpen && !locked ? 'rotate-180' : ''}`}>
          <PiCaretDown />
        </span>
      </button>
      {!locked && (
        <div className={isOpen ? '' : 'hidden'}>
          <div className="space-y-4 px-4 pt-4 pb-5">
            {children}
          </div>
          {isComplete && onContinue && (
            <button
              onClick={onContinue}
              className={`flex min-h-12 w-full items-center justify-center gap-2 border-t border-line text-sm font-medium transition-colors ${
                isPhaseComplete
                  ? 'bg-accent text-on-accent hover:bg-accent-hover'
                  : 'bg-accent-bg text-accent-text hover:bg-surface-alt'
              }`}
            >
              <PiCheckCircle className="text-base" />
              {continueLabel ?? 'Weiter'}
              <PiCaretRight className="text-base" />
            </button>
          )}
        </div>
      )}
    </section>
  )
}
