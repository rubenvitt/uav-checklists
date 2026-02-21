import { PiWarning, PiCheck, PiLightningSlash, PiCloudRain, PiWrench, PiRadio, PiNavigationArrow, PiAirplaneTilt, PiNotePencil, PiInfo, PiAirplaneLanding, PiClock } from 'react-icons/pi'
import type { ReactNode } from 'react'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { useMissionId } from '../../context/MissionContext'
import { readStorage } from '../../hooks/usePersistedState'
import type { FlightLogEntry, EventNote } from '../../types/flightLog'
import type { MetricStatus } from '../../types/assessment'
import ChecklistSection from '../ChecklistSection'

/* ── Disruption category definitions ─────────────────────── */

interface DisruptionCategory {
  key: string
  label: string
  icon: ReactNode
  hint: string
}

const DISRUPTION_CATEGORIES: DisruptionCategory[] = [
  { key: 'wetter', label: 'Wetter', icon: <PiCloudRain />, hint: 'Wind, Regen, Sicht, Temperatur, ...' },
  { key: 'technik', label: 'Technik', icon: <PiWrench />, hint: 'UAV, Kamera, Akku, RC, ...' },
  { key: 'funk', label: 'Funk / Jamming', icon: <PiRadio />, hint: 'Funkstörungen, WLAN, Jamming, ...' },
  { key: 'gps', label: 'GPS', icon: <PiNavigationArrow />, hint: 'GPS-Ausfall, Drift, Störsender, ...' },
  { key: 'luftverkehr', label: 'Luftverkehr', icon: <PiAirplaneTilt />, hint: 'Andere Luftfahrzeuge, Hubschrauber, ...' },
  { key: 'sonstiges', label: 'Sonstiges', icon: <PiNotePencil />, hint: 'Personen, Tiere, Hindernisse, ...' },
]

/* ── Context data reading ────────────────────────────────── */

interface FlightContext {
  issueFlights: Array<{ index: number; status: string; bemerkung: string; time: string }>
  eventNotes: Array<{ time: string; text: string }>
}

function useFlightContext(): FlightContext {
  const missionId = useMissionId()
  const entries = readStorage<FlightLogEntry[]>('flightlog:entries', [], missionId)
  const events = readStorage<EventNote[]>('flightlog:events', [], missionId)

  const issueFlights = entries
    .map((e, i) => ({
      index: i + 1,
      status: e.landungStatus,
      bemerkung: e.bemerkung,
      time: e.blockOff,
    }))
    .filter(f => f.status !== 'ok')

  const eventNotes = events
    .filter(e => e.text.trim())
    .map(e => ({
      time: e.timestamp,
      text: e.text,
    }))

  return { issueFlights, eventNotes }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/* ── Badge computation ───────────────────────────────────── */

function computeBadge(noDisruptions: boolean, selected: string[]): { label: string; status: MetricStatus } | undefined {
  if (noDisruptions) return { label: 'Keine', status: 'good' }
  if (selected.length > 0) return { label: `${selected.length} ${selected.length === 1 ? 'Störung' : 'Störungen'}`, status: 'caution' }
  return undefined
}

/* ── Main component ──────────────────────────────────────── */

export default function FlightDisruptionsSection() {
  const [noDisruptions, setNoDisruptions] = useMissionPersistedState<boolean>('disruptions:none', false)
  const [selectedCategories, setSelectedCategories] = useMissionPersistedState<string[]>('disruptions:categories', [])
  const [categoryNotes, setCategoryNotes] = useMissionPersistedState<Record<string, string>>('disruptions:notes', {})

  const context = useFlightContext()
  const hasContextHints = context.issueFlights.length > 0 || context.eventNotes.length > 0

  const badge = computeBadge(noDisruptions, selectedCategories)

  function toggleCategory(key: string) {
    setSelectedCategories(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      return next
    })
    // When selecting a category, clear "no disruptions"
    if (!selectedCategories.includes(key)) {
      setNoDisruptions(false)
    }
  }

  function handleNoDisruptions() {
    if (noDisruptions) {
      // Undo: revert to unset state
      setNoDisruptions(false)
    } else {
      setNoDisruptions(true)
      setSelectedCategories([])
      setCategoryNotes({})
    }
  }

  function updateNote(key: string, text: string) {
    setCategoryNotes(prev => ({ ...prev, [key]: text }))
  }

  return (
    <ChecklistSection
      title="Störungen & Vorfälle"
      icon={<PiLightningSlash />}
      badge={badge}
      defaultOpen={true}
    >
      {/* Context hints from flight phase */}
      {hasContextHints && !noDisruptions && (
        <ContextHints context={context} selectedCategories={selectedCategories} onToggle={toggleCategory} />
      )}

      {/* Quick "no disruptions" toggle */}
      <button
        onClick={handleNoDisruptions}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors active:scale-[0.99] ${
          noDisruptions
            ? 'bg-good text-white'
            : 'bg-surface-alt text-text hover:bg-surface-alt/80'
        }`}
      >
        <PiCheck className="text-lg" />
        Keine Störungen oder Vorfälle
      </button>

      {/* Category chips */}
      {!noDisruptions && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            Betroffene Bereiche auswählen:
          </p>
          <div className="flex flex-wrap gap-2">
            {DISRUPTION_CATEGORIES.map(cat => {
              const isActive = selectedCategories.includes(cat.key)
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors active:scale-[0.98] ${
                    isActive
                      ? 'bg-caution text-white'
                      : 'bg-surface-alt text-text-muted hover:text-text'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Detail cards for selected categories */}
          {selectedCategories.length > 0 && (
            <div className="space-y-2">
              {DISRUPTION_CATEGORIES.filter(cat => selectedCategories.includes(cat.key)).map(cat => (
                <CategoryDetailCard
                  key={cat.key}
                  category={cat}
                  value={categoryNotes[cat.key] ?? ''}
                  onChange={text => updateNote(cat.key, text)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </ChecklistSection>
  )
}

/* ── Context Hints ───────────────────────────────────────── */

const LANDING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  auffaellig: { label: 'Mit Auffälligkeiten', color: 'text-caution' },
  notfall: { label: 'Notfall', color: 'text-warning' },
}

function ContextHints({
  context,
  selectedCategories,
  onToggle,
}: {
  context: FlightContext
  selectedCategories: string[]
  onToggle: (key: string) => void
}) {
  return (
    <div className="rounded-xl bg-surface-alt/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PiInfo className="text-sm text-text-muted shrink-0" />
        <p className="text-xs font-medium text-text-muted">
          Hinweise aus dem Flugbetrieb
        </p>
      </div>

      {/* Flights with issues */}
      {context.issueFlights.map(flight => {
        const cfg = LANDING_STATUS_LABELS[flight.status]
        return (
          <div key={flight.index} className="flex items-start gap-2.5 rounded-lg bg-surface px-3 py-2.5">
            <PiAirplaneLanding className={`mt-0.5 shrink-0 text-sm ${cfg?.color ?? 'text-text-muted'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-text">
                Flug {flight.index}: <span className={cfg?.color}>{cfg?.label}</span>
              </p>
              {flight.bemerkung && (
                <p className="mt-0.5 text-xs text-text-muted truncate">
                  „{flight.bemerkung}"
                </p>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-text-muted">{formatTime(flight.time)}</span>
          </div>
        )
      })}

      {/* Event notes */}
      {context.eventNotes.map((note, i) => (
        <div key={i} className="flex items-start gap-2.5 rounded-lg bg-surface px-3 py-2.5">
          <PiClock className="mt-0.5 shrink-0 text-sm text-text-muted" />
          <p className="min-w-0 flex-1 text-xs text-text truncate">
            {note.text}
          </p>
          <span className="shrink-0 text-[10px] text-text-muted">{formatTime(note.time)}</span>
        </div>
      ))}

      {/* Suggest relevant categories based on context */}
      <SuggestedCategories
        context={context}
        selectedCategories={selectedCategories}
        onToggle={onToggle}
      />
    </div>
  )
}

/* ── Smart suggestions based on context ──────────────────── */

function SuggestedCategories({
  context,
  selectedCategories,
  onToggle,
}: {
  context: FlightContext
  selectedCategories: string[]
  onToggle: (key: string) => void
}) {
  // Analyze event notes and flight remarks for keyword matches
  const allTexts = [
    ...context.eventNotes.map(e => e.text),
    ...context.issueFlights.map(f => f.bemerkung),
  ].join(' ').toLowerCase()

  const suggestions: Array<{ key: string; reason: string }> = []

  if (/wind|regen|sicht|nebel|gewitter|sturm|wetter|kalt|hitze|temperatur/.test(allTexts)) {
    suggestions.push({ key: 'wetter', reason: 'Wetterhinweis erkannt' })
  }
  if (/technik|akku|batterie|kamera|motor|defekt|ausfall|fehler|sensor/.test(allTexts)) {
    suggestions.push({ key: 'technik', reason: 'Technikhinweis erkannt' })
  }
  if (/funk|signal|verbindung|jamm|wlan|störung|rc|fernsteuerung/.test(allTexts)) {
    suggestions.push({ key: 'funk', reason: 'Funkhinweis erkannt' })
  }
  if (/gps|position|drift|navigat|kompass|satellit/.test(allTexts)) {
    suggestions.push({ key: 'gps', reason: 'GPS-Hinweis erkannt' })
  }
  if (/hubschrauber|flugzeug|luft|heli|drohne|uav|luftraum|flug/.test(allTexts)) {
    suggestions.push({ key: 'luftverkehr', reason: 'Luftverkehr-Hinweis erkannt' })
  }

  // Filter out already-selected categories
  const unselected = suggestions.filter(s => !selectedCategories.includes(s.key))
  if (unselected.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-text-muted">Vorschläge:</p>
      <div className="flex flex-wrap gap-1.5">
        {unselected.map(s => {
          const cat = DISRUPTION_CATEGORIES.find(c => c.key === s.key)
          if (!cat) return null
          return (
            <button
              key={s.key}
              onClick={() => onToggle(s.key)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-caution/40 bg-caution-bg/50 px-2.5 py-1.5 text-[10px] font-medium text-caution transition-colors hover:bg-caution-bg active:scale-[0.98]"
              title={s.reason}
            >
              <span className="text-xs">{cat.icon}</span>
              {cat.label}
              <PiWarning className="text-[10px]" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Category Detail Card ────────────────────────────────── */

function CategoryDetailCard({
  category,
  value,
  onChange,
}: {
  category: DisruptionCategory
  value: string
  onChange: (text: string) => void
}) {
  return (
    <div className="rounded-xl bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="text-sm text-caution">{category.icon}</span>
        <span className="text-xs font-semibold text-text">{category.label}</span>
      </div>
      <div className="px-4 pb-3">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={category.hint}
          rows={3}
          className="w-full resize-none rounded-lg bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/60 outline-none focus:ring-1 focus:ring-text-muted"
        />
      </div>
    </div>
  )
}
