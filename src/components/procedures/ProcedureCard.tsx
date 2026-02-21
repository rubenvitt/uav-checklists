import { useState, useEffect } from 'react'
import { PiCaretDown, PiArrowRight, PiWarningCircle, PiInfo, PiUserCircle } from 'react-icons/pi'
import type { Procedure, ProcedureCategory } from '../../data/procedures'
import { getProcedureById } from '../../data/procedures'

const CATEGORY_ACCENT: Record<ProcedureCategory, { border: string; badge: string; badgeText: string; icon: string }> = {
  normal: {
    border: 'border-text-muted/10',
    badge: 'bg-surface-alt text-text-muted',
    badgeText: 'text-text-muted',
    icon: 'text-text-muted',
  },
  contingency: {
    border: 'border-caution/20',
    badge: 'bg-caution-bg text-caution',
    badgeText: 'text-caution',
    icon: 'text-caution',
  },
  emergency: {
    border: 'border-warning/30',
    badge: 'bg-warning-bg text-warning',
    badgeText: 'text-warning',
    icon: 'text-warning',
  },
  erp: {
    border: 'border-warning/20',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    badgeText: 'text-orange-700 dark:text-orange-300',
    icon: 'text-orange-600 dark:text-orange-400',
  },
}

const ROLE_COLORS: Record<string, string> = {
  RPIC: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  RP: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Bodenpersonal: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'RPIC oder Bodenpersonal': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  Alle: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300',
}

export default function ProcedureCard({
  procedure,
  defaultOpen = false,
  highlighted = false,
  onNavigate,
}: {
  procedure: Procedure
  defaultOpen?: boolean
  highlighted?: boolean
  onNavigate?: (id: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const accent = CATEGORY_ACCENT[procedure.category]

  // Open card when defaultOpen becomes true (for cross-reference navigation)
  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  return (
    <div
      data-procedure-id={procedure.id}
      className={`overflow-hidden rounded-xl border ${accent.border} bg-surface transition-all ${open ? 'shadow-sm' : ''} ${highlighted ? 'ring-2 ring-text shadow-md' : ''}`}
    >
      {/* Header — min 44px touch target */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-alt/50"
      >
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${accent.badge}`}>
          {procedure.id}
        </span>
        <span className="flex-1 text-sm font-medium text-text">{procedure.title}</span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} text-text-muted`}>
          <PiCaretDown className="text-sm" />
        </span>
      </button>

      {/* Content */}
      {open && (
        <div className="border-t border-surface-alt px-4 pb-4 pt-3 space-y-3">
          {/* Beschreibung */}
          <p className="text-xs text-text-muted leading-relaxed">{procedure.description}</p>

          {/* Allgemeine Hinweise */}
          {procedure.generalNotes && procedure.generalNotes.length > 0 && (
            <div className="rounded-lg bg-surface-alt/60 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <PiInfo className="text-xs text-text-muted" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Hinweise</span>
              </div>
              <ul className="space-y-1">
                {procedure.generalNotes.map((note, i) => (
                  <li key={i} className="flex gap-2 text-xs text-text-muted leading-relaxed">
                    <span className="shrink-0 mt-1 h-1 w-1 rounded-full bg-text-muted/40" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aktionen nach Rolle */}
          {procedure.actions.map((action, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <PiUserCircle className="text-sm text-text-muted" />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[action.role] ?? 'bg-surface-alt text-text-muted'}`}>
                  {action.role}
                </span>
              </div>
              <ul className="ml-1 space-y-1.5 border-l-2 border-surface-alt pl-3">
                {action.steps.map((step, j) => {
                  const isCallOut = step.startsWith('Call Out:')
                  return (
                    <li key={j} className={`text-xs leading-relaxed ${isCallOut ? 'font-bold text-text' : 'text-text/90'}`}>
                      {isCallOut ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block rounded bg-text px-1.5 py-0.5 text-[10px] font-bold text-base uppercase">
                            Call Out
                          </span>
                          <span>{step.replace('Call Out: ', '').replace('Call Out:', '')}</span>
                        </span>
                      ) : (
                        <>
                          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-text-muted/30 align-middle" />
                          {step}
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          {/* Bedingte Aktionen */}
          {procedure.conditionals && procedure.conditionals.length > 0 && (
            <div className="space-y-1.5">
              {procedure.conditionals.map((cond, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-caution-bg/50 p-2.5">
                  <PiWarningCircle className="mt-0.5 shrink-0 text-sm text-caution" />
                  <div className="text-xs leading-relaxed">
                    <span className="font-semibold text-caution">Wenn: </span>
                    <span className="text-text/80">{cond.condition}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <PiArrowRight className="text-[10px] text-caution" />
                      <span className="font-medium text-text">{cond.action}</span>
                      {cond.referenceId && onNavigate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const ref = getProcedureById(cond.referenceId!)
                            if (ref) onNavigate(cond.referenceId!)
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-1.5 text-[10px] font-bold text-text-muted hover:text-text hover:bg-surface-alt/80 transition-colors"
                        >
                          <PiArrowRight className="text-[9px]" />
                          {cond.referenceId}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Anmerkungen */}
          {procedure.notes && procedure.notes.length > 0 && (
            <div className="rounded-lg bg-surface-alt/40 p-2.5">
              {procedure.notes.map((note, i) => (
                <p key={i} className="flex items-start gap-2 text-xs text-text-muted italic leading-relaxed">
                  <PiInfo className="mt-0.5 shrink-0 text-xs" />
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
