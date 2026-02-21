import { useState, useEffect, useRef } from 'react'
import { PiX, PiSiren, PiWarningOctagon } from 'react-icons/pi'
import { PROCEDURES } from '../../data/procedures'
import ProcedureCard from './ProcedureCard'

export default function EmergencyModal({ onClose }: { onClose: () => void }) {
  const emergencyProcs = PROCEDURES.filter((p) => p.category === 'emergency')
  const contingencyProcs = PROCEDURES.filter((p) => p.category === 'contingency')
  const erpProcs = PROCEDURES.filter((p) => p.category === 'erp')

  const [expandedId, setExpandedId] = useState<string | null>('E1')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scrollToProcedure(id: string) {
    setExpandedId(id)
    setHighlightedId(id)

    // Scroll to target
    requestAnimationFrame(() => {
      const el = contentRef.current?.querySelector(`[data-procedure-id="${id}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
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
    <div className="fixed inset-0 z-[60] flex flex-col bg-base">
      {/* Red header */}
      <div className="shrink-0 bg-warning px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-2.5 text-white/80 transition-colors hover:text-white hover:bg-white/10"
          >
            <PiX className="text-xl" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PiSiren className="text-lg" />
              Notfall-Prozeduren
            </h2>
            <p className="text-[10px] text-white/70">Emergency & Contingency</p>
          </div>
        </div>

        {/* Quick-index chips */}
        <div className="mt-3 flex gap-2">
          {emergencyProcs.map((proc) => (
            <button
              key={proc.id}
              onClick={() => scrollToProcedure(proc.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                expandedId === proc.id
                  ? 'bg-white text-warning'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {proc.id}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-3 px-4 py-4 pb-20">
          {/* Emergency Sektion */}
          <div className="flex items-start gap-3 rounded-xl bg-warning-bg p-3">
            <PiWarningOctagon className="mt-0.5 shrink-0 text-lg text-warning" />
            <div>
              <p className="text-xs font-bold text-warning">Emergency – Sofortmaßnahmen</p>
              <p className="mt-0.5 text-[10px] text-warning/70">Kritische Notfälle. Ruhe bewahren.</p>
            </div>
          </div>

          {emergencyProcs.map((proc) => (
            <ProcedureCard
              key={proc.id}
              procedure={proc}
              defaultOpen={proc.id === 'E1' || proc.id === expandedId}
              highlighted={proc.id === highlightedId}
              onNavigate={scrollToProcedure}
            />
          ))}

          {/* Trennlinie Contingency */}
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-surface-alt" />
            <span className="text-[10px] font-medium text-caution">Contingency</span>
            <div className="h-px flex-1 bg-surface-alt" />
          </div>

          {contingencyProcs.map((proc) => (
            <ProcedureCard
              key={proc.id}
              procedure={proc}
              defaultOpen={proc.id === expandedId}
              highlighted={proc.id === highlightedId}
              onNavigate={scrollToProcedure}
            />
          ))}

          {/* Trennlinie ERP */}
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-surface-alt" />
            <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">Notfallplan (ERP)</span>
            <div className="h-px flex-1 bg-surface-alt" />
          </div>

          {erpProcs.map((proc) => (
            <ProcedureCard
              key={proc.id}
              procedure={proc}
              defaultOpen={proc.id === expandedId}
              highlighted={proc.id === highlightedId}
              onNavigate={scrollToProcedure}
            />
          ))}
        </div>
      </div>

      {/* Prominent close button at bottom */}
      <div className="shrink-0 border-t border-surface-alt bg-base px-4 py-3">
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-surface-alt py-3 text-sm font-medium text-text transition-colors hover:bg-surface-alt/80 active:scale-[0.99]"
        >
          Schließen
        </button>
      </div>
    </div>
  )
}
