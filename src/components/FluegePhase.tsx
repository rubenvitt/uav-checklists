import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { PiAirplaneTakeoff, PiAirplaneLanding, PiTrash, PiWarning, PiInfo, PiCheck, PiCaretDown, PiSiren, PiNotePencil, PiClock, PiPencilSimple, PiCheckCircle, PiArrowRight, PiSkipForward, PiMapPinArea } from 'react-icons/pi'
import { useMissionPersistedState } from '../hooks/useMissionPersistedState'
import { useMissionId } from '../context/MissionContext'
import { useMissionSegment } from '../hooks/useMissionSegment'
import type { FlightLogEntry, LandingStatus, EventNote } from '../types/flightLog'
import ProceduresButton from './procedures/ProceduresButton'
import EmergencyFAB from './procedures/EmergencyFAB'
import SegmentBanner from './SegmentBanner'
import RelocationConfirmDialog from './RelocationConfirmDialog'

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
  const missionId = useMissionId()
  const navigate = useNavigate()
  const { segments, activeSegment, activeSegmentId, isMultiSegment, startRelocation } = useMissionSegment()
  const [rawEntries, setEntries] = useMissionPersistedState<FlightLogEntry[]>('flightlog:entries', [])
  const entries = migrateEntries(rawEntries)
  const [defaultFp] = useMissionPersistedState<string>('crew_fp', '')
  const [defaultLrb] = useMissionPersistedState<string>('crew_lrb', '')
  const crewSuggestions = useCrewSuggestions()
  const [, setFluegeAbgeschlossen] = useMissionPersistedState<boolean>('fluegeAbgeschlossen', false)

  const [showRelocationDialog, setShowRelocationDialog] = useState(false)

  const [eventNotes, setEventNotes] = useMissionPersistedState<EventNote[]>('flightlog:events', [])

  const activeEntry = entries.find((e) => e.blockOn === null)
  const completedEntries = entries.filter((e) => e.blockOn !== null).slice().reverse()

  function startFlight() {
    setFluegeAbgeschlossen(false)
    const entry: FlightLogEntry = {
      id: generateId(),
      blockOff: new Date().toISOString(),
      blockOn: null,
      fernpilot: defaultFp,
      lrb: defaultLrb,
      landungStatus: 'ok',
      bemerkung: '',
      segmentId: activeSegmentId ?? undefined,
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
      <SegmentBanner segments={segments} activeSegment={activeSegment} segmentFlightCounts={
        entries.reduce<Record<string, number>>((acc, e) => {
          if (e.segmentId && e.blockOn) {
            acc[e.segmentId] = (acc[e.segmentId] ?? 0) + 1
          }
          return acc
        }, {})
      } />

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

      {/* Neuen Flug starten + Verlegen + Ereignis notieren */}
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
        <RelocationButton
          disabled={!!activeEntry}
          onRelocate={() => setShowRelocationDialog(true)}
        />
        <button
          onClick={addEvent}
          className="flex items-center justify-center gap-2 rounded-xl border border-surface-alt bg-surface px-4 py-3 text-sm text-text-muted transition-colors hover:text-text active:scale-[0.99]"
        >
          <PiNotePencil className="text-lg" />
          Ereignis
        </button>
        <ProceduresButton />
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
          {isMultiSegment ? (
            <GroupedFlightList
              entries={completedEntries}
              segments={segments}
              suggestions={crewSuggestions}
              onUpdate={updateEntry}
              onRemove={removeEntry}
            />
          ) : (
            completedEntries.map((entry, idx) => (
              <CompletedFlightCard
                key={entry.id}
                entry={entry}
                index={completedEntries.length - idx}
                suggestions={crewSuggestions}
                onUpdate={(updates) => updateEntry(entry.id, updates)}
                onRemove={() => removeEntry(entry.id)}
              />
            ))
          )}
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

      {/* Weiter zur Nachbereitung */}
      {!activeEntry && <NextPhaseButton hasFlights={completedEntries.length > 0} onProceed={() => {
        setFluegeAbgeschlossen(true)
        navigate(`/mission/${missionId}/nachbereitung`)
      }} />}

      {/* Emergency FAB — immer sichtbar */}
      <EmergencyFAB />

      <RelocationConfirmDialog
        open={showRelocationDialog}
        segmentNumber={segments.length + 1}
        onConfirm={(label) => {
          setShowRelocationDialog(false)
          startRelocation(label)
          navigate(`/mission/${missionId}/vorflugkontrolle`)
        }}
        onCancel={() => setShowRelocationDialog(false)}
      />
    </div>
  )
}

/* ── Weiter zur Nachbereitung ─────────────────────────────── */

function NextPhaseButton({ hasFlights, onProceed }: { hasFlights: boolean; onProceed: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Mit Flügen: Primary Button, kein Confirm nötig
  if (hasFlights) {
    return (
      <button
        onClick={onProceed}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-text px-4 py-3.5 text-sm font-medium text-base transition-colors active:scale-[0.99]"
      >
        Weiter zur Nachbereitung
        <PiArrowRight className="text-lg" />
      </button>
    )
  }

  // Ohne Flüge: Secondary Button mit Rückfrage
  if (confirming) {
    return (
      <div className="space-y-2 rounded-xl border border-caution/30 bg-caution-bg p-4">
        <p className="text-sm font-medium text-caution">Ohne Flüge fortfahren?</p>
        <p className="text-xs text-text-muted">Es wurden keine Flüge durchgeführt. Trotzdem zur Nachbereitung wechseln?</p>
        <div className="flex gap-2">
          <button
            onClick={onProceed}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-caution px-3 py-2 text-sm font-medium text-white transition-colors active:scale-[0.99]"
          >
            <PiSkipForward className="text-base" />
            Ja, fortfahren
          </button>
          <button
            onClick={() => { setConfirming(false); if (timerRef.current) clearTimeout(timerRef.current) }}
            className="flex-1 rounded-lg bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:text-text active:scale-[0.99]"
          >
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setConfirming(true)
        timerRef.current = setTimeout(() => setConfirming(false), 10000)
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-surface-alt bg-surface px-4 py-3 text-sm text-text-muted transition-colors hover:text-text active:scale-[0.99]"
    >
      <PiSkipForward className="text-base" />
      Ohne Flüge zur Nachbereitung
    </button>
  )
}

/* ── Verlegen-Button ─────────────────────────────────────── */

function RelocationButton({ onRelocate, disabled }: { onRelocate: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => { if (!disabled) onRelocate() }}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm transition-colors active:scale-[0.99] ${
        disabled
          ? 'cursor-not-allowed border-surface-alt bg-surface-alt text-text-muted/40'
          : 'border-caution/30 bg-caution-bg text-caution hover:bg-caution/20'
      }`}
      title={disabled ? 'Flug zuerst beenden' : 'Standort verlegen'}
    >
      <PiMapPinArea className="text-base" />
      Verlegen
    </button>
  )
}

/* ── Gruppierte Flugliste nach Standort ──────────────────── */

function GroupedFlightList({
  entries,
  segments,
  suggestions,
  onUpdate,
  onRemove,
}: {
  entries: FlightLogEntry[]
  segments: import('../types/mission').MissionSegment[]
  suggestions: string[]
  onUpdate: (id: string, updates: Partial<FlightLogEntry>) => void
  onRemove: (id: string) => void
}) {
  // Group by segmentId
  const groups: Array<{ segmentId: string | undefined; label: string; entries: FlightLogEntry[] }> = []
  const segmentMap = new Map(segments.map(s => [s.id, s]))

  for (const entry of entries) {
    const sid = entry.segmentId
    const existing = groups.find(g => g.segmentId === sid)
    if (existing) {
      existing.entries.push(entry)
    } else {
      const seg = sid ? segmentMap.get(sid) : undefined
      groups.push({
        segmentId: sid,
        label: seg ? `${seg.label}${seg.locationName ? ` — ${seg.locationName}` : ''}` : 'Ohne Standort',
        entries: [entry],
      })
    }
  }

  let globalIndex = entries.length

  return (
    <>
      {groups.map((group) => (
        <div key={group.segmentId ?? 'none'}>
          <div className="flex items-center gap-2 px-1 pb-1">
            <PiMapPinArea className="shrink-0 text-xs text-text-muted/60" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted/60">
              {group.label}
            </span>
          </div>
          <div className="space-y-3">
            {group.entries.map((entry) => {
              const idx = globalIndex--
              return (
                <CompletedFlightCard
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  suggestions={suggestions}
                  onUpdate={(updates) => onUpdate(entry.id, updates)}
                  onRemove={() => onRemove(entry.id)}
                />
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

/* ── Confirm-Delete-Button ────────────────────────────────── */

function ConfirmDeleteButton({
  onConfirm,
  useMouseDown,
}: {
  onConfirm: () => void
  useMouseDown?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startConfirm() {
    setConfirming(true)
    timerRef.current = setTimeout(() => setConfirming(false), 3000)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (confirming) {
    const handler = useMouseDown
      ? { onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onConfirm() } }
      : { onClick: (e: React.MouseEvent) => { e.stopPropagation(); onConfirm() } }

    return (
      <button
        {...handler}
        className="flex items-center gap-1 rounded-lg bg-warning px-2.5 py-1.5 text-xs font-medium text-white transition-colors active:scale-95"
        title="Löschen bestätigen"
      >
        <PiTrash className="text-sm" />
        Löschen?
      </button>
    )
  }

  const handler = useMouseDown
    ? { onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); startConfirm() } }
    : { onClick: (e: React.MouseEvent) => { e.stopPropagation(); startConfirm() } }

  return (
    <button
      {...handler}
      className="flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:text-warning hover:bg-warning-bg active:scale-95"
      title="Löschen"
    >
      <PiTrash className="text-sm" />
    </button>
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
  const [editing, setEditing] = useState(!note.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  function handleBlur() {
    if (note.text.trim()) {
      setEditing(false)
    }
  }

  function handleDone() {
    if (note.text.trim()) {
      setEditing(false)
    }
  }

  const isEmpty = !note.text.trim()

  if (editing) {
    return (
      <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-text-muted/20">
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <PiClock className="shrink-0 text-sm text-text-muted" />
          <span className="text-xs font-medium text-text">
            {formatTime(note.timestamp)}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                handleDone()
              }}
              className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                isEmpty
                  ? 'text-text-muted/30'
                  : 'text-good hover:bg-good-bg active:scale-95'
              }`}
              title="Fertig"
              disabled={isEmpty}
            >
              <PiCheckCircle className="text-[1.1rem]" />
            </button>
            <ConfirmDeleteButton onConfirm={onRemove} useMouseDown />
          </span>
        </div>
        <div className="px-4 pb-3">
          <textarea
            ref={textareaRef}
            value={note.text}
            onChange={(e) => onUpdate(e.target.value)}
            onBlur={handleBlur}
            placeholder="Ereignis beschreiben..."
            rows={3}
            className="w-full resize-none rounded-lg bg-surface-alt px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none focus:ring-1 focus:ring-text-muted/40"
          />
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex w-full items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-alt active:scale-[0.99]"
    >
      <div className="flex shrink-0 flex-col items-center">
        <PiClock className="text-sm text-text-muted" />
        <span className="mt-0.5 text-[10px] font-medium tabular-nums text-text-muted">
          {formatTime(note.timestamp)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        {isEmpty ? (
          <span className="text-sm italic text-text-muted/60">
            Keine Beschreibung...
          </span>
        ) : (
          <p className="truncate text-sm text-text">{note.text}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <PiPencilSimple className="text-sm text-text-muted/50" />
        <ConfirmDeleteButton onConfirm={onRemove} />
      </div>
    </button>
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
        <ConfirmDeleteButton onConfirm={onRemove} />
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
            <ConfirmDeleteButton onConfirm={onRemove} />
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
