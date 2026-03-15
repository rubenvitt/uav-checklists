import { useState } from 'react'
import { PiCheck, PiChecks, PiArrowCounterClockwise, PiClipboardText, PiChatText, PiX } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import type { MetricStatus } from '../../types/assessment'
import { getChecklistAnswer, getNextChecklistAnswer, isAnswered, type ChecklistState } from '../../utils/checklistState'
import ChecklistSection from '../ChecklistSection'

interface InspectionItem {
  key: string
  label: string
  hint?: string
}

const POST_FLIGHT_ITEMS: InspectionItem[] = [
  { key: 'motoren', label: 'Motoren laufen gleichmäßig aus' },
  { key: 'uav_beschaedigung', label: 'UAV auf Beschädigungen prüfen', hint: 'Gehäuse, Rahmen, Klappmechanismus' },
  { key: 'ueberwarmung', label: 'Überwärmung prüfen', hint: 'Motoren, ESCs, Akku-Fach' },
  { key: 'akkus', label: 'Akkus auf Beschädigungen prüfen', hint: 'Aufblähung, Verformung, Verfärbung' },
  { key: 'rotoren', label: 'Rotoren auf Beschädigungen prüfen', hint: 'Kerben, Risse, Verformungen' },
  { key: 'payload', label: 'Payload auf Beschädigungen prüfen', hint: 'Kamera, Gimbal, Sensoren' },
  { key: 'fernbedienung', label: 'Fernbedienungen auf Schäden prüfen', hint: 'Sticks, Display, Antennen' },
  { key: 'kabel', label: 'Verbindungskabel sauber', hint: 'Steckverbindungen, Knickschutz' },
]

export default function PostFlightInspectionSection({ open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  const [checked, setChecked] = useMissionPersistedState<ChecklistState>('postflight:checked', {})
  const [notes, setNotes] = useMissionPersistedState<Record<string, string>>('postflight:notes', {})
  const [remarks, setRemarks] = useMissionPersistedState<string>('postflight:remarks', '')
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const answeredCount = POST_FLIGHT_ITEMS.filter((item) => isAnswered(checked[item.key])).length
  const negativeCount = POST_FLIGHT_ITEMS.filter((item) => getChecklistAnswer(checked[item.key]) === 'negative').length
  const totalCount = POST_FLIGHT_ITEMS.length
  const allChecked = answeredCount === totalCount

  const badge: { label: string; status: MetricStatus } = {
    label: allChecked ? (negativeCount > 0 ? `${negativeCount} negativ` : 'Abgeschlossen') : `${answeredCount}/${totalCount}`,
    status: allChecked ? (negativeCount > 0 ? 'warning' : 'good') : answeredCount === 0 ? 'warning' : 'caution',
  }

  function toggleCheck(key: string) {
    setChecked((prev) => {
      const nextValue = getNextChecklistAnswer(prev[key])
      const next = { ...prev }
      if (!nextValue) delete next[key]
      else next[key] = nextValue
      return next
    })
  }

  function confirmAll() {
    const all: ChecklistState = {}
    for (const item of POST_FLIGHT_ITEMS) all[item.key] = 'positive'
    setChecked(all)
  }

  function resetAll() {
    setChecked({})
    setNotes({})
    setRemarks('')
    setExpandedNote(null)
  }

  function toggleNote(key: string) {
    setExpandedNote((prev) => (prev === key ? null : key))
  }

  function updateNote(key: string, text: string) {
    setNotes((prev) => ({ ...prev, [key]: text }))
  }

  function clearNote(key: string) {
    setNotes((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setExpandedNote(null)
  }

  const hasAnyNotes = Object.values(notes).some((n) => n.trim())

  return (
    <ChecklistSection title="Nachflugkontrolle" icon={<PiClipboardText />} badge={badge} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      <p className="text-xs text-text-muted -mt-1 mb-1">Punkte nach dem Flug bewerten (positiv/negativ) und Auffälligkeiten dokumentieren.</p>
      <div className="-mx-5 -mb-5">
        <div className="px-4 pb-2">
          {allChecked ? (
            <button onClick={resetAll} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors">
              <PiArrowCounterClockwise className="text-xs" />Zurücksetzen
            </button>
          ) : (
            <button onClick={confirmAll} className="flex w-full items-center justify-center gap-2 rounded-lg bg-good/10 px-4 py-2.5 text-sm font-medium text-good transition-colors hover:bg-good/20 active:scale-[0.99]">
              <PiChecks className="text-[1rem]" />Alle positiv
              {answeredCount > 0 && <span className="text-good/60">({totalCount - answeredCount} offen)</span>}
            </button>
          )}
        </div>

        <div className="divide-y divide-surface-alt">
          {POST_FLIGHT_ITEMS.map((item) => {
            const answer = getChecklistAnswer(checked[item.key])
            const hasNote = !!notes[item.key]?.trim()
            const isNoteExpanded = expandedNote === item.key

            return (
              <div key={item.key}>
                <div className="flex items-center">
                  <button onClick={() => toggleCheck(item.key)} className="flex flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-alt">
                    {answer === 'positive' ? (
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-good bg-good text-[0.6rem] text-white"><PiCheck /></span>
                    ) : answer === 'negative' ? (
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-warning bg-warning text-[0.6rem] text-white"><PiX /></span>
                    ) : (
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-text-muted/30 text-[0.6rem] text-transparent"><PiCheck /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm transition-colors ${isAnswered(checked[item.key]) ? 'text-text-muted' : 'text-text'}`}>{item.label}</p>
                      {item.hint && <p className="text-xs text-text-muted/70">{item.hint}</p>}
                    </div>
                  </button>

                  <button
                    onClick={() => toggleNote(item.key)}
                    className={`shrink-0 p-3 transition-colors ${
                      hasNote ? 'text-caution' : isNoteExpanded ? 'text-text' : 'text-text-muted hover:text-text'
                    }`}
                    title="Bemerkung hinzufügen"
                  >
                    <PiChatText className="text-[1rem]" />
                    {hasNote && <span className="absolute -mt-3 ml-2 h-1.5 w-1.5 rounded-full bg-caution" />}
                  </button>
                </div>

                {isNoteExpanded && (
                  <div className="px-4 pb-3 pt-0">
                    <div className="ml-7.5 flex items-start gap-2">
                      <textarea
                        value={notes[item.key] ?? ''}
                        onChange={(e) => updateNote(item.key, e.target.value)}
                        placeholder="Bemerkung zu diesem Punkt..."
                        rows={2}
                        autoFocus
                        className="flex-1 resize-none rounded-lg bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 outline-none focus:ring-1 focus:ring-text-muted/40"
                      />
                      {hasNote && (
                        <button onClick={() => clearNote(item.key)} className="shrink-0 rounded-lg p-2 text-text-muted/60 transition-colors hover:text-warning hover:bg-warning-bg" title="Bemerkung entfernen">
                          <PiX className="text-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-4 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <PiChatText className="text-sm text-text-muted" />
            <p className="text-xs font-medium text-text-muted">Allgemeine Bemerkungen</p>
            {(hasAnyNotes || remarks.trim()) && <span className="h-1.5 w-1.5 rounded-full bg-caution" />}
          </div>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Allgemeine Bemerkungen zur Nachflugkontrolle..."
            rows={3}
            className="w-full resize-none rounded-lg bg-surface-alt px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none focus:ring-1 focus:ring-text-muted/40"
          />
        </div>
      </div>
    </ChecklistSection>
  )
}
