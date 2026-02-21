import { useState } from 'react'
import {
  PiCheck,
  PiChecks,
  PiArrowCounterClockwise,
  PiChatText,
  PiX,
  PiClipboardText,
  PiInfo,
  PiArrowSquareOut,
  PiPackage,
  PiMegaphone,
  PiFileText,
  PiUsers,
  PiWarning,
} from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { useMissionId } from '../../context/MissionContext'
import { readStorage } from '../../hooks/usePersistedState'
import { getDroneById } from '../../data/drones'
import type { DroneId } from '../../types/drone'
import type { FlightLogEntry } from '../../types/flightLog'
import type { MetricStatus } from '../../types/assessment'
import ChecklistSection from '../ChecklistSection'

/* ── Cross-phase data reading ─────────────────────────────── */

interface AdditionalNotification {
  label: string
  detail: string
}

interface WrapupItem {
  key: string
  label: string
  hint?: string
  group: 'abmeldungen' | 'dokumentation' | 'feedback' | 'rueckbau'
  hasNote?: boolean
  externalLink?: { href: string; label: string }
  conditional?: boolean
}

function useWrapupItems(): { items: WrapupItem[]; noAnmeldungen: boolean } {
  const missionId = useMissionId()

  // --- Anmeldungen aus Vorflugkontrolle ---
  const anmeldungenChecked = readStorage<Record<string, boolean>>('anmeldungen:checked', {}, missionId)
  const anmeldungenAdditional = readStorage<AdditionalNotification[]>('anmeldungen:additional', [], missionId)

  // --- Flugdaten ---
  const entries = readStorage<FlightLogEntry[]>('flightlog:entries', [], missionId)

  // --- Störungen ---
  const disruptionCategories = readStorage<string[]>('disruptions:categories', [], missionId)
  const disruptionsNone = readStorage<boolean>('disruptions:none', false, missionId)
  const hasDisruptions = !disruptionsNone && disruptionCategories.length > 0
  const hasAbnormalLanding = entries.some(e => e.landungStatus !== 'ok')

  // --- Drohne ---
  const selectedDrone = readStorage<DroneId>('selectedDrone', 'matrice-350-rtk', missionId)
  const drone = getDroneById(selectedDrone)

  // --- Piloten-Statistik ---
  const pilotFlights: Record<string, number> = {}
  for (const e of entries) {
    if (e.fernpilot) {
      pilotFlights[e.fernpilot] = (pilotFlights[e.fernpilot] ?? 0) + 1
    }
  }
  const pilotHint = Object.entries(pilotFlights)
    .map(([name, count]) => `${name}: ${count} ${count === 1 ? 'Flug' : 'Flüge'}`)
    .join(', ')

  // --- Abmeldungen dynamisch aus Anmeldungen ---
  const abmeldungItems: WrapupItem[] = []
  const registeredKeys = Object.entries(anmeldungenChecked).filter(([, v]) => v).map(([k]) => k)

  const LABEL_MAP: Record<string, string> = {
    leitstelle: 'Abmeldung Leitstelle',
    polizei: 'Abmeldung Polizei',
    bahn: 'Abmeldung Bahn (DB Netz)',
    wsa: 'Abmeldung WSA',
  }

  for (const key of registeredKeys) {
    if (key.startsWith('custom_')) {
      const idx = parseInt(key.split('_')[1], 10)
      const custom = anmeldungenAdditional[idx]
      if (custom?.label) {
        abmeldungItems.push({
          key: `abmeldung_${key}`,
          label: `Abmeldung ${custom.label}`,
          hint: custom.detail || undefined,
          group: 'abmeldungen',
          hasNote: true,
        })
      }
    } else if (LABEL_MAP[key]) {
      abmeldungItems.push({
        key: `abmeldung_${key}`,
        label: LABEL_MAP[key],
        group: 'abmeldungen',
        hasNote: true,
      })
    }
  }

  const noAnmeldungen = abmeldungItems.length === 0

  // --- Dokumentation & Meldungen ---
  const dokumentationItems: WrapupItem[] = [
    {
      key: 'datensicherung',
      label: 'Datensicherung durchgeführt',
      hint: entries.length > 0 ? `${entries.length} ${entries.length === 1 ? 'Flug' : 'Flüge'} aufgezeichnet` : 'Keine Flüge aufgezeichnet',
      group: 'dokumentation',
    },
    {
      key: 'flugbuecher',
      label: 'Flugbücher aktualisiert',
      hint: pilotHint || 'Keine Piloten erfasst',
      group: 'dokumentation',
    },
  ]

  // Ereignis-/Unfallmeldung nur bei Störungen oder Landungsproblemen
  if (hasDisruptions || hasAbnormalLanding) {
    dokumentationItems.push({
      key: 'ereignismeldung_bfu',
      label: 'Ereignis-/Unfallmeldung BFU',
      hint: 'Meldepflicht bei Unfall oder schwerer Störung — Tel: +49 (0)531-3548-0',
      group: 'dokumentation',
      conditional: true,
      externalLink: {
        href: 'https://www.bfu-web.de/DE/Unfallmeldung/Onlinemeldung/onlinemeldung_node.html',
        label: 'BFU Unfallmeldung',
      },
    })
  }

  // --- Rückbau ---
  const rueckbauItems: WrapupItem[] = [
    {
      key: 'uav_eingepackt',
      label: 'UAV eingepackt',
      hint: drone.name,
      group: 'rueckbau',
    },
    {
      key: 'akkus_verstaut',
      label: 'Akkus entfernt und sicher verstaut',
      group: 'rueckbau',
    },
    {
      key: 'fernbedienungen_verstaut',
      label: 'Fernbedienungen verstaut',
      group: 'rueckbau',
    },
    {
      key: 'zubehoer_eingepackt',
      label: 'Zubehör und Payload eingepackt',
      group: 'rueckbau',
    },
    {
      key: 'einsatzstelle_aufgeraeumt',
      label: 'Einsatzstelle aufgeräumt',
      group: 'rueckbau',
    },
  ]

  const items: WrapupItem[] = [
    ...abmeldungItems,
    ...dokumentationItems,
    ...rueckbauItems,
  ]

  return { items, noAnmeldungen }
}

/* ── Group definitions ────────────────────────────────────── */

const GROUPS = [
  { key: 'abmeldungen' as const, label: 'Abmeldungen', icon: <PiMegaphone /> },
  { key: 'dokumentation' as const, label: 'Dokumentation & Meldungen', icon: <PiFileText /> },
  { key: 'feedback' as const, label: 'Feedback', icon: <PiUsers /> },
  { key: 'rueckbau' as const, label: 'Rückbau', icon: <PiPackage /> },
]

/* ── Component ────────────────────────────────────────────── */

export default function EinsatzabschlussSection() {
  const { items, noAnmeldungen } = useWrapupItems()
  const [checked, setChecked] = useMissionPersistedState<Record<string, boolean>>('wrapup:checked', {})
  const [notes, setNotes] = useMissionPersistedState<Record<string, string>>('wrapup:notes', {})
  const [feedback, setFeedback] = useMissionPersistedState<string>('wrapup:feedback', '')
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const checkedCount = items.filter(i => checked[i.key]).length
  const totalCount = items.length
  const allChecked = totalCount > 0 && checkedCount === totalCount

  const badge: { label: string; status: MetricStatus } = {
    label: allChecked ? 'Abgeschlossen' : `${checkedCount}/${totalCount}`,
    status: allChecked ? 'good' : checkedCount === 0 ? 'warning' : 'caution',
  }

  function toggleCheck(key: string) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function confirmAll() {
    const all: Record<string, boolean> = {}
    for (const item of items) all[item.key] = true
    setChecked(all)
  }

  function resetAll() {
    setChecked({})
    setNotes({})
    setFeedback('')
    setExpandedNote(null)
  }

  function toggleNote(key: string) {
    setExpandedNote(prev => prev === key ? null : key)
  }

  function updateNote(key: string, text: string) {
    setNotes(prev => ({ ...prev, [key]: text }))
  }

  function clearNote(key: string) {
    setNotes(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setExpandedNote(null)
  }

  const groupedItems = GROUPS.map(g => ({
    ...g,
    items: items.filter(i => i.group === g.key),
  }))

  return (
    <ChecklistSection
      title="Einsatzabschluss"
      icon={<PiClipboardText />}
      sectionId="einsatzabschluss"
      badge={badge}
      defaultOpen
    >
      <div className="-mx-5 -mb-5">
        {/* Confirm-all / Reset */}
        <div className="px-4 pb-2">
          {allChecked ? (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              <PiArrowCounterClockwise className="text-xs" />
              Zurücksetzen
            </button>
          ) : (
            <button
              onClick={confirmAll}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-good/10 px-4 py-2.5 text-sm font-medium text-good transition-colors hover:bg-good/20 active:scale-[0.99]"
            >
              <PiChecks className="text-[1rem]" />
              Alle bestätigen
              {checkedCount > 0 && (
                <span className="text-good/60">({totalCount - checkedCount} offen)</span>
              )}
            </button>
          )}
        </div>

        {/* Grouped items */}
        {groupedItems.map(group => {
          // Skip feedback group here — rendered separately
          if (group.key === 'feedback') return null

          // No-anmeldungen hint
          if (group.key === 'abmeldungen' && noAnmeldungen) {
            return (
              <div key={group.key}>
                <GroupHeader icon={group.icon} label={group.label} />
                <div className="flex items-start gap-2.5 px-4 py-3">
                  <PiInfo className="mt-0.5 shrink-0 text-sm text-text-muted" />
                  <p className="text-xs text-text-muted">
                    Keine Anmeldungen in der Vorflugkontrolle erfasst
                  </p>
                </div>
              </div>
            )
          }

          if (group.items.length === 0) return null

          return (
            <div key={group.key}>
              <GroupHeader icon={group.icon} label={group.label} />
              <div className="divide-y divide-surface-alt">
                {group.items.map(item => (
                  <CheckItem
                    key={item.key}
                    item={item}
                    isChecked={!!checked[item.key]}
                    onToggle={() => toggleCheck(item.key)}
                    hasNote={!!notes[item.key]?.trim()}
                    isNoteExpanded={expandedNote === item.key}
                    noteValue={notes[item.key] ?? ''}
                    onToggleNote={item.hasNote ? () => toggleNote(item.key) : undefined}
                    onUpdateNote={text => updateNote(item.key, text)}
                    onClearNote={() => clearNote(item.key)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Feedback group */}
        <div>
          <GroupHeader icon={<PiUsers />} label="Feedback" />
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <PiChatText className="text-sm text-text-muted" />
              <p className="text-xs font-medium text-text-muted">
                Team-Feedback / Nachbesprechung
              </p>
              {feedback.trim() && (
                <span className="h-1.5 w-1.5 rounded-full bg-good" />
              )}
            </div>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Kurzes Feedback zum Einsatz, Verbesserungsvorschläge, Lessons Learned..."
              rows={3}
              className="w-full resize-none rounded-lg bg-surface-alt px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none focus:ring-1 focus:ring-text-muted/40"
            />
          </div>
        </div>
      </div>
    </ChecklistSection>
  )
}

/* ── Group header ─────────────────────────────────────────── */

function GroupHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-1">
      <span className="text-sm text-text-muted">{icon}</span>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</p>
    </div>
  )
}

/* ── Checklist item ───────────────────────────────────────── */

function CheckItem({
  item,
  isChecked,
  onToggle,
  hasNote,
  isNoteExpanded,
  noteValue,
  onToggleNote,
  onUpdateNote,
  onClearNote,
}: {
  item: WrapupItem
  isChecked: boolean
  onToggle: () => void
  hasNote: boolean
  isNoteExpanded: boolean
  noteValue: string
  onToggleNote?: () => void
  onUpdateNote: (text: string) => void
  onClearNote: () => void
}) {
  return (
    <div>
      <div className="flex items-center">
        {/* Checkbox + label */}
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-alt"
        >
          <span
            className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border text-[0.6rem] transition-colors ${
              isChecked
                ? 'border-good bg-good text-white'
                : 'border-text-muted/30 text-transparent'
            }`}
          >
            <PiCheck />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm transition-colors ${isChecked ? 'text-text-muted' : 'text-text'}`}>
              {item.label}
            </p>
            {item.hint && (
              <p className="text-xs text-text-muted/70">{item.hint}</p>
            )}
            {item.conditional && (
              <p className="text-xs text-warning/80 flex items-center gap-1 mt-0.5">
                <PiWarning className="shrink-0" />
                Prüfung empfohlen
              </p>
            )}
            {item.externalLink && (
              <a
                href={item.externalLink.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 mt-1 text-xs text-text-muted hover:text-text transition-colors"
              >
                <PiArrowSquareOut className="text-[0.65rem]" />
                {item.externalLink.label}
              </a>
            )}
          </div>
        </button>

        {/* Note toggle button (only for items with notes) */}
        {onToggleNote && (
          <button
            onClick={onToggleNote}
            className={`shrink-0 p-3 transition-colors ${
              hasNote
                ? 'text-caution'
                : isNoteExpanded
                  ? 'text-text'
                  : 'text-text-muted hover:text-text'
            }`}
            title="Bemerkung hinzufügen"
          >
            <PiChatText className="text-[1rem]" />
            {hasNote && (
              <span className="absolute -mt-3 ml-2 h-1.5 w-1.5 rounded-full bg-caution" />
            )}
          </button>
        )}
      </div>

      {/* Inline note field */}
      {isNoteExpanded && onToggleNote && (
        <div className="px-4 pb-3 pt-0">
          <div className="ml-7.5 flex items-start gap-2">
            <textarea
              value={noteValue}
              onChange={e => onUpdateNote(e.target.value)}
              placeholder="Bemerkung zu diesem Punkt..."
              rows={2}
              autoFocus
              className="flex-1 resize-none rounded-lg bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 outline-none focus:ring-1 focus:ring-text-muted/40"
            />
            {hasNote && (
              <button
                onClick={onClearNote}
                className="shrink-0 rounded-lg p-2 text-text-muted/60 transition-colors hover:text-warning hover:bg-warning-bg"
                title="Bemerkung entfernen"
              >
                <PiX className="text-sm" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
