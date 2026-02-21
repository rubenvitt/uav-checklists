import { useState, useRef, useEffect } from 'react'
import { PiAirplaneTakeoff, PiAirplaneLanding, PiTrash, PiWarning, PiInfo, PiCheck, PiCaretDown, PiSiren, PiNotePencil, PiClock } from 'react-icons/pi'
import { useMissionPersistedState } from '../hooks/useMissionPersistedState'
import type { FlightLogEntry, LandingStatus, EventNote } from '../types/flightLog'

const LANDING_STATUS_CONFIG: Record<LandingStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  ok: { label: 'In Ordnung', color: 'text-good', bgColor: 'bg-good', borderColor: 'border-good', icon: <PiCheck /> },
  auffaellig: { label: 'Mit Auffälligkeiten', color: 'text-caution', bgColor: 'bg-caution', borderColor: 'border-caution', icon: <PiWarning /> },
  notfall: { label: 'Notfall', color: 'text-warning', bgColor: 'bg-warning', borderColor: 'border-warning', icon: <PiSiren /> },
}

const LANDING_STATUS_ORDER: LandingStatus[] = ['ok', 'auffaellig', 'notfall']

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function computeDuration(blockOff: string, blockOn: string): string {
  const diff = new Date(blockOn).getTime() - new Date(blockOff).getTime()
  if (diff < 0) return '—'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m.toString().padStart(2, '0')}min`
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

interface AdditionalMember {
  role: string
  name: string
}

function useCrewSuggestions(): string[] {
  const [fk] = useMissionPersistedState<string>('crew_fk', '')
  const [fp] = useMissionPersistedState<string>('crew_fp', '')
  const [lrb] = useMissionPersistedState<string>('crew_lrb', '')
  const [ba] = useMissionPersistedState<string>('crew_ba', '')
  const [additional] = useMissionPersistedState<AdditionalMember[]>('crew_additional', [])

  const names = [fk, fp, lrb, ba, ...additional.map((m) => m.name)]
  return [...new Set(names.filter((n) => n.trim()))]
}

/** Migrate legacy entries that used `landungOk: boolean` to `landungStatus` */
function migrateEntries(raw: FlightLogEntry[]): FlightLogEntry[] {
  return raw.map((e) => {
    if (e.landungStatus) return e
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacy = e as any
    const status: LandingStatus = legacy.landungOk === false ? 'auffaellig' : 'ok'
    const { landungOk: _, ...rest } = legacy
    return { ...rest, landungStatus: status }
  })
}

export default function FluegePhase() {
  const [rawEntries, setEntries] = useMissionPersistedState<FlightLogEntry[]>('flightlog:entries', [])
  const entries = migrateEntries(rawEntries)
  const [defaultFp] = useMissionPersistedState<string>('crew_fp', '')
  const [defaultLrb] = useMissionPersistedState<string>('crew_lrb', '')
  const crewSuggestions = useCrewSuggestions()

  const [eventNotes, setEventNotes] = useMissionPersistedState<EventNote[]>('flightlog:events', [])

  const activeEntry = entries.find((e) => e.blockOn === null)
  const completedEntries = entries.filter((e) => e.blockOn !== null).slice().reverse()

  function startFlight() {
    const entry: FlightLogEntry = {
      id: generateId(),
      blockOff: new Date().toISOString(),
      blockOn: null,
      fernpilot: defaultFp,
      lrb: defaultLrb,
      landungStatus: 'ok',
      bemerkung: '',
    }
    setEntries((prev) => [...prev, entry])
  }

  function landFlight(id: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, blockOn: new Date().toISOString() } : e,
      ),
    )
  }

  function updateEntry(id: string, updates: Partial<FlightLogEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    )
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function addEvent() {
    const note: EventNote = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      text: '',
    }
    setEventNotes((prev) => [...prev, note])
  }

  function updateEvent(id: string, text: string) {
    setEventNotes((prev) => prev.map((e) => (e.id === id ? { ...e, text } : e)))
  }

  function removeEvent(id: string) {
    setEventNotes((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Hinweis: Start und Landung melden */}
      <div className="flex items-start gap-3 rounded-xl bg-surface p-4">
        <PiInfo className="mt-0.5 shrink-0 text-lg text-text-muted" />
        <div>
          <p className="text-sm font-medium text-text">Meldepflicht Start & Landung</p>
          <p className="mt-0.5 text-xs text-text-muted">
            Jeden Start und jede Landung an FüKw oder Abschnittsleiter melden.
          </p>
        </div>
      </div>

      {/* Aktiver Flug */}
      {activeEntry && (
        <ActiveFlightCard
          entry={activeEntry}
          suggestions={crewSuggestions}
          onLand={() => landFlight(activeEntry.id)}
          onUpdate={(updates) => updateEntry(activeEntry.id, updates)}
          onRemove={() => removeEntry(activeEntry.id)}
        />
      )}

      {/* Neuen Flug starten + Ereignis notieren */}
      <div className={`flex gap-2 ${activeEntry ? 'flex-row-reverse' : ''}`}>
        {!activeEntry && (
          <button
            onClick={startFlight}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-text px-4 py-3.5 text-sm font-medium text-base transition-colors active:scale-[0.99]"
          >
            <PiAirplaneTakeoff className="text-lg" />
            Flug starten
          </button>
        )}
        <button
          onClick={addEvent}
          className="flex items-center justify-center gap-2 rounded-xl border border-surface-alt bg-surface px-4 py-3 text-sm text-text-muted transition-colors hover:text-text active:scale-[0.99]"
        >
          <PiNotePencil className="text-lg" />
          Ereignis
        </button>
      </div>

      {/* Ereignisse */}
      {eventNotes.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium text-text-muted">
            Ereignisse ({eventNotes.length})
          </p>
          {[...eventNotes].reverse().map((note) => (
            <EventNoteCard
              key={note.id}
              note={note}
              onUpdate={(text) => updateEvent(note.id, text)}
              onRemove={() => removeEvent(note.id)}
            />
          ))}
        </div>
      )}

      {/* Abgeschlossene Flüge */}
      {completedEntries.length > 0 && (
        <div className="space-y-3">
          <p className="px-1 text-xs font-medium text-text-muted">
            Flugtagebuch ({completedEntries.length} {completedEntries.length === 1 ? 'Flug' : 'Flüge'})
          </p>
          {completedEntries.map((entry, idx) => (
            <CompletedFlightCard
              key={entry.id}
              entry={entry}
              index={completedEntries.length - idx}
              suggestions={crewSuggestions}
              onUpdate={(updates) => updateEntry(entry.id, updates)}
              onRemove={() => removeEntry(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Leer-Zustand */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-surface py-12 text-center">
          <PiAirplaneTakeoff className="text-3xl text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text">Noch keine Flüge</p>
            <p className="mt-1 text-xs text-text-muted">
              Starte den ersten Flug, um das Flugtagebuch zu füllen.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Ereignis-Notiz ───────────────────────────────────────── */

function EventNoteCard({
  note,
  onUpdate,
  onRemove,
}: {
  note: EventNote
  onUpdate: (text: string) => void
  onRemove: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!note.text && textareaRef.current) {
      textareaRef.current.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus only on mount
  }, [])

  return (
    <div className="rounded-xl bg-surface">
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <PiClock className="text-xs text-text-muted" />
        <span className="text-[10px] text-text-muted">
          {formatTime(note.timestamp)}
        </span>
        <button
          onClick={onRemove}
          className="ml-auto flex items-center text-text-muted transition-colors hover:text-warning"
        >
          <PiTrash className="text-xs" />
        </button>
      </div>
      <div className="px-4 pb-3">
        <textarea
          ref={textareaRef}
          value={note.text}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="Ereignis beschreiben..."
          rows={2}
          className="w-full resize-none rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-1 focus:ring-text-muted"
        />
      </div>
    </div>
  )
}

/* ── Aktiver Flug ─────────────────────────────────────────── */

function ActiveFlightCard({
  entry,
  suggestions,
  onLand,
  onUpdate,
  onRemove,
}: {
  entry: FlightLogEntry
  suggestions: string[]
  onLand: () => void
  onUpdate: (u: Partial<FlightLogEntry>) => void
  onRemove: () => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-good/40 bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 bg-good-bg px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-good" />
        </span>
        <span className="flex-1 text-sm font-semibold text-good">Flug aktiv</span>
        <span className="text-xs text-good">
          Start: {formatTime(entry.blockOff)}
        </span>
      </div>

      {/* Felder */}
      <div className="divide-y divide-surface-alt">
        <div className="px-4 py-3">
          <label className="mb-1 block text-xs text-text-muted">Block Off (Start)</label>
          <input
            type="datetime-local"
            value={toLocalInput(entry.blockOff)}
            onChange={(e) => {
              if (e.target.value) onUpdate({ blockOff: new Date(e.target.value).toISOString() })
            }}
            className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
          />
        </div>
        <NameAutocomplete
          label="Fernpilot"
          value={entry.fernpilot}
          onChange={(v) => onUpdate({ fernpilot: v })}
          suggestions={suggestions}
          placeholder="Name des Fernpiloten"
          size="normal"
        />
        <NameAutocomplete
          label="Luftraumbeobachter"
          value={entry.lrb}
          onChange={(v) => onUpdate({ lrb: v })}
          suggestions={suggestions}
          placeholder="Name des LRB"
          size="normal"
        />
        <div className="px-4 py-3">
          <label className="mb-1 block text-xs text-text-muted">Bemerkung</label>
          <input
            type="text"
            value={entry.bemerkung}
            onChange={(e) => onUpdate({ bemerkung: e.target.value })}
            placeholder="Optional..."
            className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
          />
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-2 px-4 py-3">
        <button
          onClick={onLand}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-good px-4 py-3 text-sm font-medium text-white transition-colors active:scale-[0.99]"
        >
          <PiAirplaneLanding className="text-lg" />
          Landung
        </button>
        <button
          onClick={onRemove}
          className="flex items-center justify-center rounded-xl bg-surface-alt px-3 py-3 text-text-muted transition-colors hover:text-warning"
        >
          <PiTrash />
        </button>
      </div>
    </div>
  )
}

/* ── Abgeschlossener Flug ─────────────────────────────────── */

function CompletedFlightCard({
  entry,
  index,
  suggestions,
  onUpdate,
  onRemove,
}: {
  entry: FlightLogEntry
  index: number
  suggestions: string[]
  onUpdate: (u: Partial<FlightLogEntry>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl bg-surface">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-semibold text-text-muted">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <span>{formatTime(entry.blockOff)}</span>
            <span className="text-text-muted">→</span>
            <span>{entry.blockOn ? formatTime(entry.blockOn) : '—'}</span>
            {entry.blockOn && (
              <span className="ml-auto text-xs text-text-muted">
                {computeDuration(entry.blockOff, entry.blockOn)}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-text-muted">
            {entry.fernpilot || '—'} / {entry.lrb || '—'}
          </p>
        </div>
        <LandingStatusBadge status={entry.landungStatus} />
        <span className={`text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <PiCaretDown className="text-sm" />
        </span>
      </button>

      {/* Expanded edit area */}
      {expanded && (
        <div className="divide-y divide-surface-alt border-t border-surface-alt">
          {/* Block times */}
          <div className="flex gap-4 px-4 py-2.5">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-text-muted">Block Off</label>
              <input
                type="datetime-local"
                value={toLocalInput(entry.blockOff)}
                onChange={(e) => {
                  if (e.target.value) onUpdate({ blockOff: new Date(e.target.value).toISOString() })
                }}
                className="w-full rounded bg-surface-alt px-2 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-text-muted"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-text-muted">Block On</label>
              <input
                type="datetime-local"
                value={entry.blockOn ? toLocalInput(entry.blockOn) : ''}
                onChange={(e) => {
                  if (e.target.value) onUpdate({ blockOn: new Date(e.target.value).toISOString() })
                }}
                className="w-full rounded bg-surface-alt px-2 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-text-muted"
              />
            </div>
          </div>

          {/* Fernpilot + LRB */}
          <div className="flex gap-4 px-4 py-2.5">
            <NameAutocomplete
              label="Fernpilot"
              value={entry.fernpilot}
              onChange={(v) => onUpdate({ fernpilot: v })}
              suggestions={suggestions}
              placeholder="Name"
              size="compact"
            />
            <NameAutocomplete
              label="LRB"
              value={entry.lrb}
              onChange={(v) => onUpdate({ lrb: v })}
              suggestions={suggestions}
              placeholder="Name"
              size="compact"
            />
          </div>

          {/* Landungsstatus */}
          <div className="px-4 py-2.5">
            <label className="mb-1.5 block text-[10px] text-text-muted">Landung</label>
            <LandingStatusSelector
              value={entry.landungStatus}
              onChange={(v) => onUpdate({ landungStatus: v })}
            />
          </div>

          {/* Bemerkung */}
          <div className="px-4 py-2.5">
            <label className="mb-1 block text-[10px] text-text-muted">Bemerkung</label>
            <input
              type="text"
              value={entry.bemerkung}
              onChange={(e) => onUpdate({ bemerkung: e.target.value })}
              placeholder="Optional..."
              className="w-full rounded bg-surface-alt px-2 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-text-muted"
            />
          </div>

          {/* Löschen */}
          <div className="px-4 py-2.5">
            <button
              onClick={onRemove}
              className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-warning"
            >
              <PiTrash className="text-[0.6rem]" />
              Eintrag löschen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Landungsstatus ────────────────────────────────────────── */

function LandingStatusBadge({ status }: { status: LandingStatus }) {
  const cfg = LANDING_STATUS_CONFIG[status]
  const bgMap: Record<LandingStatus, string> = {
    ok: 'bg-good-bg text-good',
    auffaellig: 'bg-caution-bg text-caution',
    notfall: 'bg-warning-bg text-warning',
  }
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${bgMap[status]}`}>
      {cfg.icon}
    </span>
  )
}

function LandingStatusSelector({
  value,
  onChange,
}: {
  value: LandingStatus
  onChange: (v: LandingStatus) => void
}) {
  return (
    <div className="flex gap-1.5">
      {LANDING_STATUS_ORDER.map((status) => {
        const cfg = LANDING_STATUS_CONFIG[status]
        const isActive = value === status
        return (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? `${cfg.bgColor} text-white`
                : 'bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            <span className="text-[0.65rem]">{cfg.icon}</span>
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Name-Autocomplete ────────────────────────────────────── */

function NameAutocomplete({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  size,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  size: 'normal' | 'compact'
}) {
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = focused
    ? value.trim()
      ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
      : suggestions.filter((s) => s !== value)
    : []

  useEffect(() => {
    setActiveIndex(-1)
  }, [filtered.length, value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (filtered.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          onChange(filtered[activeIndex])
          setFocused(false)
        }
        break
      case 'Escape':
        setFocused(false)
        break
    }
  }

  const isCompact = size === 'compact'

  return (
    <div className={isCompact ? 'flex-1' : 'px-4 py-3'}>
      <label className={`mb-1 block ${isCompact ? 'text-[10px]' : 'text-xs'} text-text-muted`}>
        {label}
      </label>
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={filtered.length > 0}
          aria-activedescendant={activeIndex >= 0 ? `flight-${label}-${activeIndex}` : undefined}
          aria-autocomplete="list"
          className={
            isCompact
              ? 'w-full rounded bg-surface-alt px-2 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-text-muted'
              : 'w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted'
          }
        />
        {filtered.length > 0 && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute left-0 right-0 z-10 mt-1 max-h-36 overflow-y-auto rounded-lg border border-surface-alt bg-surface shadow-lg"
          >
            {filtered.map((s, i) => (
              <li
                key={s}
                id={`flight-${label}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onChange(s)
                    setFocused(false)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full px-3 py-2 text-left ${isCompact ? 'text-xs' : 'text-sm'} text-text transition-colors ${
                    i === activeIndex ? 'bg-surface-alt' : ''
                  }`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
