import { useState } from 'react'
import { PiAirplaneTakeoff, PiAirplaneLanding, PiTrash, PiWarning, PiInfo, PiCheck, PiCaretDown } from 'react-icons/pi'
import { useMissionPersistedState } from '../hooks/useMissionPersistedState'
import type { FlightLogEntry } from '../types/flightLog'

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

export default function FluegePhase() {
  const [entries, setEntries] = useMissionPersistedState<FlightLogEntry[]>('flightlog:entries', [])
  const [defaultFp] = useMissionPersistedState<string>('crew_fp', '')
  const [defaultLrb] = useMissionPersistedState<string>('crew_lrb', '')

  const activeEntry = entries.find((e) => e.blockOn === null)
  const completedEntries = entries.filter((e) => e.blockOn !== null)

  function startFlight() {
    const entry: FlightLogEntry = {
      id: generateId(),
      blockOff: new Date().toISOString(),
      blockOn: null,
      fernpilot: defaultFp,
      lrb: defaultLrb,
      landungOk: true,
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

  return (
    <div className="space-y-4">
      {/* Hinweis: Start und Landung melden */}
      <div className="flex items-start gap-3 rounded-xl bg-surface p-4">
        <PiInfo className="mt-0.5 shrink-0 text-lg text-text-muted" />
        <div>
          <p className="text-sm font-medium text-text">Meldepflicht Start & Landung</p>
          <p className="mt-0.5 text-xs text-text-muted">
            Jeden Start und jede Landung an die zuständige Stelle melden (z.B. Leitstelle, Polizei).
          </p>
        </div>
      </div>

      {/* Aktiver Flug */}
      {activeEntry && (
        <ActiveFlightCard
          entry={activeEntry}
          onLand={() => landFlight(activeEntry.id)}
          onUpdate={(updates) => updateEntry(activeEntry.id, updates)}
          onRemove={() => removeEntry(activeEntry.id)}
        />
      )}

      {/* Neuen Flug starten */}
      {!activeEntry && (
        <button
          onClick={startFlight}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-text px-4 py-3.5 text-sm font-medium text-base transition-colors active:scale-[0.99]"
        >
          <PiAirplaneTakeoff className="text-lg" />
          Flug starten
        </button>
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
              index={idx + 1}
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

/* ── Aktiver Flug ─────────────────────────────────────────── */

function ActiveFlightCard({
  entry,
  onLand,
  onUpdate,
  onRemove,
}: {
  entry: FlightLogEntry
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
        <div className="px-4 py-3">
          <label className="mb-1 block text-xs text-text-muted">Fernpilot</label>
          <input
            type="text"
            value={entry.fernpilot}
            onChange={(e) => onUpdate({ fernpilot: e.target.value })}
            placeholder="Name des Fernpiloten"
            className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
          />
        </div>
        <div className="px-4 py-3">
          <label className="mb-1 block text-xs text-text-muted">Luftraumbeobachter</label>
          <input
            type="text"
            value={entry.lrb}
            onChange={(e) => onUpdate({ lrb: e.target.value })}
            placeholder="Name des LRB"
            className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
          />
        </div>
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
  onUpdate,
  onRemove,
}: {
  entry: FlightLogEntry
  index: number
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
        {entry.landungOk ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-good-bg text-good">
            <PiCheck className="text-xs" />
          </span>
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning">
            <PiWarning className="text-xs" />
          </span>
        )}
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
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-text-muted">Fernpilot</label>
              <input
                type="text"
                value={entry.fernpilot}
                onChange={(e) => onUpdate({ fernpilot: e.target.value })}
                placeholder="Name"
                className="w-full rounded bg-surface-alt px-2 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-text-muted"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-text-muted">LRB</label>
              <input
                type="text"
                value={entry.lrb}
                onChange={(e) => onUpdate({ lrb: e.target.value })}
                placeholder="Name"
                className="w-full rounded bg-surface-alt px-2 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-text-muted"
              />
            </div>
          </div>

          {/* Landung OK toggle */}
          <div className="px-4 py-2.5">
            <button
              onClick={() => onUpdate({ landungOk: !entry.landungOk })}
              className="flex w-full items-center gap-2 text-left"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                  entry.landungOk
                    ? 'border-good bg-good text-white'
                    : 'border-warning bg-warning text-white'
                }`}
              >
                {entry.landungOk ? <PiCheck /> : <PiWarning />}
              </span>
              <span className={`text-xs ${entry.landungOk ? 'text-good' : 'text-warning'}`}>
                {entry.landungOk ? 'Landung in Ordnung' : 'Landung mit Auffälligkeiten'}
              </span>
            </button>
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
