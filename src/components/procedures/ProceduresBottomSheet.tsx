import { useState, useEffect, useRef } from 'react'
import { PiX, PiBookOpenText, PiCaretDown, PiShieldCheckered, PiListChecks, PiInfo, PiWarningOctagon, PiFirstAidKit } from 'react-icons/pi'
import { PROCEDURES, GENERAL_RULES, type ProcedureCategory } from '../../data/procedures'
import ProcedureCard from './ProcedureCard'

const CATEGORY_CONFIG: Record<ProcedureCategory, { label: string; icon: React.ReactNode; headerColor: string; borderColor: string }> = {
  normal: {
    label: 'Normale Verfahren',
    icon: <PiListChecks />,
    headerColor: 'text-text',
    borderColor: 'border-surface-alt',
  },
  contingency: {
    label: 'Contingency Procedures',
    icon: <PiShieldCheckered />,
    headerColor: 'text-caution',
    borderColor: 'border-caution/20',
  },
  emergency: {
    label: 'Emergency Procedures',
    icon: <PiWarningOctagon />,
    headerColor: 'text-warning',
    borderColor: 'border-warning/20',
  },
  erp: {
    label: 'Notfallplan (ERP)',
    icon: <PiFirstAidKit />,
    headerColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-300/20 dark:border-orange-700/20',
  },
}

const CATEGORIES: ProcedureCategory[] = ['normal', 'contingency', 'emergency', 'erp']

// Default: normal + contingency expanded, emergency + erp collapsed (Hauptzugang über FAB)
const DEFAULT_COLLAPSED = new Set<ProcedureCategory>(['emergency', 'erp'])

export default function ProceduresBottomSheet({ onClose }: { onClose: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ProcedureCategory>>(new Set(DEFAULT_COLLAPSED))
  const contentRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function toggleCategory(cat: ProcedureCategory) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function handleNavigate(id: string) {
    const target = PROCEDURES.find((p) => p.id === id)
    if (!target) return

    // Expand target category
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      next.delete(target.category)
      return next
    })

    setExpandedId(id)
    setHighlightedId(id)

    // Scroll to target after category expansion renders
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = contentRef.current?.querySelector(`[data-procedure-id="${id}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    })

    // Clear highlight after 2s
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 2000)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    }
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-base shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-text-muted/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pb-3">
          <PiBookOpenText className="text-xl text-text-muted" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-text">Flugprozeduren</h2>
            <p className="text-[10px] text-text-muted">Standard- und Notfallverfahren</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2.5 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <PiX className="text-lg" />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto border-t border-surface-alt">
          <div className="mx-auto max-w-2xl space-y-1 px-4 py-4 pb-20">
            {/* Allgemeine Regeln */}
            <div className="mb-3 rounded-xl bg-surface p-3 space-y-2">
              <div className="flex items-center gap-2">
                <PiInfo className="text-xs text-text-muted" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Allgemeine Regeln</span>
              </div>
              <ul className="space-y-1">
                {GENERAL_RULES.map((rule, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-text-muted leading-relaxed">
                    <span className="shrink-0 mt-1.5 h-1 w-1 rounded-full bg-text-muted/40" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat]
              const procs = PROCEDURES.filter((p) => p.category === cat)
              const isCollapsed = collapsedCategories.has(cat)

              return (
                <div key={cat}>
                  {/* Category header — ChecklistSection style */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className={`flex w-full items-center gap-3 rounded-xl bg-surface border ${cfg.borderColor} px-4 py-3.5 transition-colors hover:bg-surface-alt/50`}
                  >
                    <span className={`text-base ${cfg.headerColor}`}>{cfg.icon}</span>
                    <span className={`flex-1 text-left text-xs font-semibold ${cfg.headerColor}`}>
                      {cfg.label}
                    </span>
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-medium text-text-muted">
                      {procs.length}
                    </span>
                    <PiCaretDown className={`text-sm text-text-muted transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
                  </button>

                  {/* Procedures */}
                  {!isCollapsed && (
                    <div className="space-y-2 py-3">
                      {procs.map((proc) => (
                        <ProcedureCard
                          key={proc.id}
                          procedure={proc}
                          defaultOpen={proc.id === expandedId}
                          highlighted={proc.id === highlightedId}
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
