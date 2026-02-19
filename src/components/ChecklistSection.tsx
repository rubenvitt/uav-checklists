import { useState } from 'react'
import type { MetricStatus } from '../types/assessment'

interface ChecklistSectionProps {
  title: string
  icon: string
  badge?: { label: string; status: MetricStatus }
  defaultOpen?: boolean
  children: React.ReactNode
}

const badgeColors: Record<MetricStatus, string> = {
  good: 'bg-good-bg text-good',
  caution: 'bg-caution-bg text-caution',
  warning: 'bg-warning-bg text-warning',
}

export default function ChecklistSection({ title, icon, badge, defaultOpen = false, children }: ChecklistSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="rounded-xl bg-surface overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-alt"
      >
        <span className="text-lg">{icon}</span>
        <span className="flex-1 font-semibold text-text">{title}</span>
        {badge && (
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
