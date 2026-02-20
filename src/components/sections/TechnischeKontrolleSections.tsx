import { type ReactNode } from 'react'
import { PiCheck, PiChecks, PiArrowCounterClockwise, PiMapPin, PiDrone, PiGameController } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import type { MetricStatus } from '../../types/assessment'
import ChecklistSection from '../ChecklistSection'

// ---------------------------------------------------------------------------
// Types & shared logic
// ---------------------------------------------------------------------------

interface CheckItem {
  key: string
  label: string
  hint?: string
}

function useQuickChecklist(storageKey: string, items: readonly CheckItem[]) {
  const [checked, setChecked] = useMissionPersistedState<Record<string, boolean>>(storageKey, {})

  const checkedCount = items.filter((item) => checked[item.key]).length
  const totalCount = items.length
  const allChecked = checkedCount === totalCount

  const badge: { label: string; status: MetricStatus } = {
    label: allChecked ? 'Bestanden' : `${checkedCount}/${totalCount}`,
    status: allChecked ? 'good' : checkedCount === 0 ? 'warning' : 'caution',
  }

  function toggleCheck(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function confirmAll() {
    const all: Record<string, boolean> = {}
    for (const item of items) all[item.key] = true
    setChecked(all)
  }

  function resetAll() {
    setChecked({})
  }

  return { checked, checkedCount, totalCount, allChecked, badge, toggleCheck, confirmAll, resetAll }
}

// ---------------------------------------------------------------------------
// Shared checklist content renderer
// ---------------------------------------------------------------------------

function QuickChecklistContent({
  items,
  checked,
  allChecked,
  checkedCount,
  totalCount,
  toggleCheck,
  confirmAll,
  resetAll,
}: {
  items: readonly CheckItem[]
  checked: Record<string, boolean>
  allChecked: boolean
  checkedCount: number
  totalCount: number
  toggleCheck: (key: string) => void
  confirmAll: () => void
  resetAll: () => void
}) {
  return (
    <div className="-mx-5 -mb-5">
      {/* Confirm-all / Reset button */}
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-good/10 px-4 py-2.5 text-sm font-medium text-good transition-colors hover:bg-good/20"
          >
            <PiChecks className="text-base" />
            Alle bestätigen
            {checkedCount > 0 && (
              <span className="text-good/60">({totalCount - checkedCount} offen)</span>
            )}
          </button>
        )}
      </div>

      {/* Individual items */}
      <div className="divide-y divide-surface-alt">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => toggleCheck(item.key)}
            className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-alt"
          >
            <span
              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border text-[0.6rem] transition-colors ${
                checked[item.key]
                  ? 'border-good bg-good text-white'
                  : 'border-text-muted/30 text-transparent'
              }`}
            >
              <PiCheck />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm transition-colors ${checked[item.key] ? 'text-text-muted' : 'text-text'}`}>
                {item.label}
              </p>
              {item.hint && (
                <p className="text-xs text-text-muted/70">{item.hint}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checklist data
// ---------------------------------------------------------------------------

export const AUFSTIEGSORT_ITEMS: CheckItem[] = [
  { key: 'flaeche', label: 'Ebene Fläche (min. 1×1 m) für Landeplatz' },
  { key: 'homepoint', label: 'Homepoint nach Norden ausgerichtet' },
  { key: 'hindernisse', label: 'Keine Hindernisse im Radius von mind. 3 m' },
  { key: 'absperrung', label: 'Geeignete Absperrung vorhanden' },
  { key: 'beleuchtung', label: 'Bei Dunkelheit ausreichend beleuchtet' },
  { key: 'aufsteller', label: 'Ggf. Aufsteller „UAV-Einsatz" aufgestellt' },
]

export const UAV_ITEMS: CheckItem[] = [
  { key: 'gehaeuse', label: 'Gehäuse intakt' },
  { key: 'klappmechanismus', label: 'Klappmechanismus intakt und stabil' },
  { key: 'schrauben', label: 'Schraubenverbindungen fest' },
  { key: 'rotoren', label: 'Rotoren ohne Beschädigungen' },
  { key: 'anbauteile', label: 'Anbauteile intakt und fest eingerastet' },
  { key: 'rotorlauf', label: 'Rotoren laufen gleichmäßig' },
  { key: 'beleuchtung', label: 'Beleuchtung intakt und eingeschaltet' },
  { key: 'kabel', label: 'Kabelsteckverbindungen fest' },
  { key: 'akkus', label: 'Akkus intakt und aufgeladen' },
  { key: 'sensoren', label: 'Sensoren intakt' },
]

export const RC_ITEMS: CheckItem[] = [
  { key: 'akkus', label: 'Akkus geladen' },
  { key: 'verbindung_uav', label: 'RC-Verbindung zum UAV hergestellt' },
  { key: 'anbauteile', label: 'Kontrolle über Anbauteile' },
  { key: 'antennen', label: 'Antennen ausgerichtet' },
  { key: 'absprache', label: 'Absprache: wer bedient das UAV' },
  { key: 'gps', label: 'GPS-Verbindung hergestellt' },
  { key: 'bild', label: 'Bildwiedergabe auf beiden RC' },
  { key: 'rechner', label: 'Verbindung zum Rechner' },
  { key: 'ground_control', label: 'Ground Control / Funkverbindung zum L-ATM' },
  { key: 'display', label: 'Displayeinstellungen dem Wetter angepasst' },
]

// ---------------------------------------------------------------------------
// Exported section components
// ---------------------------------------------------------------------------

function CheckSection({
  title,
  icon,
  storageKey,
  items,
}: {
  title: string
  icon: ReactNode
  storageKey: string
  items: readonly CheckItem[]
}) {
  const checklist = useQuickChecklist(storageKey, items)

  return (
    <ChecklistSection title={title} icon={icon} badge={checklist.badge}>
      <QuickChecklistContent items={items} {...checklist} />
    </ChecklistSection>
  )
}

export function AufstiegsortSection() {
  return (
    <CheckSection
      title="Aufstiegsort"
      icon={<PiMapPin />}
      storageKey="techcheck:aufstiegsort"
      items={AUFSTIEGSORT_ITEMS}
    />
  )
}

export function UavCheckSection() {
  return (
    <CheckSection
      title="UAV"
      icon={<PiDrone />}
      storageKey="techcheck:uav"
      items={UAV_ITEMS}
    />
  )
}

export function RemoteControllerSection() {
  return (
    <CheckSection
      title="Remote Controller (A und B)"
      icon={<PiGameController />}
      storageKey="techcheck:rc"
      items={RC_ITEMS}
    />
  )
}
