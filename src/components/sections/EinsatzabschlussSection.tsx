import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  PiSignature,
  PiStamp,
  PiFilePdf,
  PiPenNib,
  PiKeyboard,
} from 'react-icons/pi'
import SignaturePad from '../SignaturePad'
import { renderTypedSignature } from '../../utils/renderTypedSignature'
import StoredSignaturePanel from '../StoredSignaturePanel'
import PdfPreviewModal from '../PdfPreviewModal'
import { generateMissionReport } from '../../utils/generateMissionReport'
import { useAuth } from '../../context/useAuth'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { useMissionId } from '../../context/useMissionId'
import { readStorage } from '../../hooks/usePersistedState'
import { getSegments } from '../../utils/missionStorage'
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

  // --- Anmeldungen aus Vorflugkontrolle (segment-scoped) ---
  const segments = getSegments(missionId)
  const anmeldungenChecked: Record<string, boolean> = {}
  const anmeldungenAdditional: AdditionalNotification[] = []
  for (const seg of segments) {
    const segChecked = readStorage<Record<string, boolean>>(`seg:${seg.id}:anmeldungen:checked`, {}, missionId)
    for (const [k, v] of Object.entries(segChecked)) {
      if (v) anmeldungenChecked[k] = true
    }
    const segAdditional = readStorage<AdditionalNotification[]>(`seg:${seg.id}:anmeldungen:additional`, [], missionId)
    for (const item of segAdditional) {
      if (item.label && !anmeldungenAdditional.some(a => a.label === item.label)) {
        anmeldungenAdditional.push(item)
      }
    }
  }

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

export default function EinsatzabschlussSection({ open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  const { items, noAnmeldungen } = useWrapupItems()
  const missionId = useMissionId()
  const queryClient = useQueryClient()
  const [checked, setChecked] = useMissionPersistedState<Record<string, boolean>>('wrapup:checked', {})
  const [notes, setNotes] = useMissionPersistedState<Record<string, string>>('wrapup:notes', {})
  const [feedback, setFeedback] = useMissionPersistedState<string>('wrapup:feedback', '')
  const [signatureFk, setSignatureFk] = useMissionPersistedState<string>('signature:fk', '')
  const [signatureEl, setSignatureEl] = useMissionPersistedState<string>('signature:el', '')
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  // Prefill the typed-signature name from the SAME crew data the PDF prints
  // below the signature line (Führungskraft / Einsatzleitung), so the
  // handwriting name above the line matches the printed name below by default.
  const prefillFk = readStorage<string>('crew_fk', '', missionId)
  const prefillEl = readStorage<string>('einsatzleiter', '', missionId)

  // Vorschau des Abschlussdokuments vor dem Unterschreiben. Zeigt den Inhalt
  // (die gezeichneten Unterschriften kommen erst danach) — wer nach dem
  // Zeichnen erneut prüft, sieht sie dann mit drin.
  const [preview, setPreview] = useState<{ blob: Blob; filename: string } | null>(null)
  const [previewError, setPreviewError] = useState(false)

  function handlePreview() {
    const result = generateMissionReport(missionId, queryClient)
    if (result) {
      setPreviewError(false)
      setPreview(result)
    } else {
      setPreviewError(true)
    }
  }

  // Optional PocketID login: when configured + logged in, the user can reuse a
  // server-stored personal signature. When logged out this stays inert and the
  // signature step behaves exactly like Phase 1.
  const { configured: authConfigured, isAuthenticated } = useAuth()
  const [storedSignature, setStoredSignature] = useState<string | null>(null)
  const showStoredSignatures = authConfigured && isAuthenticated

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
    <>
    <ChecklistSection
      title="Einsatzabschluss"
      icon={<PiClipboardText />}
      badge={badge}
      open={open}
      onToggle={onToggle}
      isComplete={isComplete}
      onContinue={onContinue}
      continueLabel={continueLabel}
      isPhaseComplete={isPhaseComplete}
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

        {/* Unterschriften group */}
        <div>
          <GroupHeader icon={<PiSignature />} label="Unterschriften" />
          <div className="px-4 py-3 space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-xs text-text-muted/80">
                Unterschriften für das Abschlussdokument (optional)
              </p>
              {(signatureFk.trim() || signatureEl.trim()) && (
                <span className="h-1.5 w-1.5 rounded-full bg-good" />
              )}
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handlePreview}
                className="flex items-center gap-2 rounded-lg bg-surface-alt px-3 py-2 text-sm text-text transition-colors hover:bg-surface active:scale-[0.99]"
              >
                <PiFilePdf className="text-base text-text-muted" />
                Dokument prüfen
              </button>
              <p className="text-[0.7rem] text-text-muted/70">
                Bitte vor dem Unterschreiben das Abschlussdokument prüfen.
              </p>
              {previewError && (
                <p className="flex items-center gap-1.5 text-xs text-warning">
                  <PiWarning className="shrink-0" /> Das PDF konnte nicht erzeugt werden.
                </p>
              )}
            </div>
            {showStoredSignatures && (
              <StoredSignaturePanel onStoredSignatureChange={setStoredSignature} />
            )}
            <SignatureField
              label="Führungskraft UAS"
              storageKey="signature:fk"
              prefillName={prefillFk}
              value={signatureFk}
              onChange={setSignatureFk}
              storedSignature={showStoredSignatures ? storedSignature : null}
            />
            <SignatureField
              label="Einsatzleitung"
              storageKey="signature:el"
              prefillName={prefillEl}
              value={signatureEl}
              onChange={setSignatureEl}
              storedSignature={showStoredSignatures ? storedSignature : null}
            />
          </div>
        </div>
      </div>
    </ChecklistSection>
    {preview && (
      <PdfPreviewModal blob={preview.blob} filename={preview.filename} onClose={() => setPreview(null)} />
    )}
    </>
  )
}

/* ── Signature field (draw OR type → handwriting, switchable) ─── */

type SignatureMode = 'draw' | 'type'

/**
 * One signature block. The user can either DRAW (touch/pen) or TYPE a name that
 * is rendered in a handwriting font. Both modes produce a trimmed PNG data-URL
 * written to `value`/`onChange` (the key the report pipeline reads), so the PDF
 * needs no changes.
 *
 * The output PNG (`value`) doubles as the draw-mode canvas value — so a legacy
 * drawn signature shows up untouched and no migration is needed. The typed
 * NAME is persisted separately (`${storageKey}:typed`) so it stays editable
 * (it cannot be recovered from the PNG). Mode changes are event-driven (no
 * effect): switching to Tippen renders the name to the output, switching to
 * Zeichnen clears it so the pad starts empty.
 */
function SignatureField({
  label,
  storageKey,
  prefillName,
  value,
  onChange,
  storedSignature,
}: {
  label: string
  /** Base mission-storage key (e.g. `signature:fk`); output PNG lives here. */
  storageKey: string
  /** Crew-data name used to prefill the typed-signature input. */
  prefillName: string
  /** Current output PNG (data-URL) — what the PDF embeds and the pad shows. */
  value: string
  onChange: (dataUrl: string) => void
  /** Logged-in user's stored PNG (data-URL), or null when unavailable. */
  storedSignature: string | null
}) {
  const [mode, setMode] = useMissionPersistedState<SignatureMode>(`${storageKey}:mode`, 'draw')
  const [typed, setTyped] = useMissionPersistedState<string>(`${storageKey}:typed`, prefillName)

  async function selectMode(next: SignatureMode) {
    if (next === mode) return
    // Switching to Zeichnen starts from an empty pad (an existing typed PNG is
    // not carried into the canvas); switching to Tippen renders the name.
    onChange(next === 'type' ? await renderTypedSignature(typed) : '')
    setMode(next)
  }

  async function handleTypedChange(name: string) {
    setTyped(name)
    onChange(await renderTypedSignature(name))
  }

  return (
    <div className="space-y-2">
      {/* Header: role label + draw/type toggle */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <div className="flex rounded-lg bg-surface-alt p-0.5 text-xs">
          <ModeButton active={mode === 'draw'} onClick={() => void selectMode('draw')} icon={<PiPenNib />} label="Zeichnen" />
          <ModeButton active={mode === 'type'} onClick={() => void selectMode('type')} icon={<PiKeyboard />} label="Tippen" />
        </div>
      </div>

      {mode === 'draw' ? (
        <div className="space-y-1.5">
          <SignaturePad label="" value={value} onChange={onChange} />
          {storedSignature && (
            <button
              type="button"
              onClick={() => onChange(storedSignature)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:text-good hover:bg-good/10"
            >
              <PiStamp className="text-[0.85rem]" />
              Gespeicherte Signatur einfügen
            </button>
          )}
        </div>
      ) : (
        <TypedSignature value={typed} onChange={handleTypedChange} />
      )}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
        active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

/**
 * Typed-name signature: a text input plus a live preview in the same handwriting
 * font (Caveat) that {@link renderTypedSignature} uses, on the white "paper"
 * background that matches the draw pad and the PDF.
 */
function TypedSignature({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Name eingeben"
        autoComplete="name"
        className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 outline-none focus:ring-1 focus:ring-text-muted/40"
      />
      <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-text-muted/20 bg-white px-3">
        {value.trim() ? (
          <span
            className="truncate text-5xl leading-none text-gray-900"
            style={{ fontFamily: '"Caveat", cursive' }}
          >
            {value}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Vorschau</span>
        )}
      </div>
      <p className="text-[0.7rem] text-text-muted/70">
        Der Name wird in Schreibschrift als Unterschrift gesetzt
      </p>
    </div>
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
