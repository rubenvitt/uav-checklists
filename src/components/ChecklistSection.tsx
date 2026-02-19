import { useState } from 'react'
import type { MetricStatus } from '../types/assessment'

interface ChecklistSectionProps {
  title: string
  icon: string
  badge?: { label: string; status: MetricStatus }
  loading?: boolean
  defaultOpen?: boolean
  children: React.ReactNode
}

const badgeColors: Record<MetricStatus, string> = {
  good: 'bg-good-bg text-good',
  caution: 'bg-caution-bg text-caution',
  warning: 'bg-warning-bg text-warning',
}

export default function ChecklistSection({ title, icon, badge, loading, defaultOpen = false, children }: ChecklistSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="rounded-xl bg-surface overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-alt"
      >
        <span className="text-lg">{icon}</span>
        <span className="flex-1 font-semibold text-text">{title}</span>
        {loading && (
          <svg className="h-4 w-4 animate-spin text-text-muted" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {!loading && badge && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColors[badge.status]}`}>
            {badge.label}
          </span>
        )}
        <span className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && <div className="space-y-4 px-5 pt-1 pb-5">{children}</div>}
    </section>
  )
}
