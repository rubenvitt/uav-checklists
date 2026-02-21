import { type ReactNode } from 'react'
import { PiCaretDown, PiLock } from 'react-icons/pi'
import type { MetricStatus } from '../types/assessment'
import { useSectionExpansion } from '../hooks/useSectionExpansion'

interface ChecklistSectionProps {
  title: string
  icon: ReactNode
  badge?: { label: string; status: MetricStatus }
  loading?: boolean
  locked?: boolean
  defaultOpen?: boolean
  /** Unique identifier for persisting expansion state per mission. */
  sectionId?: string
  children: React.ReactNode
}

const badgeColors: Record<MetricStatus, string> = {
  good: 'bg-good-bg text-good',
  caution: 'bg-caution-bg text-caution',
  warning: 'bg-warning-bg text-warning',
}

export default function ChecklistSection({ title, icon, badge, loading, locked, defaultOpen = false, sectionId, children }: ChecklistSectionProps) {
  const { isOpen, toggle } = useSectionExpansion(sectionId, { defaultOpen, badge, locked })

  return (
    <section className={`rounded-xl bg-surface overflow-hidden${locked ? ' opacity-50' : ''}`}>
      <button
        onClick={toggle}
        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors ${locked ? 'cursor-not-allowed' : 'hover:bg-surface-alt'}`}
      >
        <span className="text-lg flex items-center">{icon}</span>
        <span className="flex-1 font-semibold text-text">{title}</span>
        {locked && (
          <span className="text-xs text-text-muted flex items-center gap-1">
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
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColors[badge.status]}`}>
            {badge.label}
          </span>
        )}
        <span className={`text-text-muted transition-transform duration-200 flex items-center ${isOpen && !locked ? 'rotate-180' : ''}`}>
          <PiCaretDown />
        </span>
      </button>
      {!locked && (
        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="space-y-4 px-5 pt-1 pb-5">{children}</div>
          </div>
        </div>
      )}
    </section>
  )
}
