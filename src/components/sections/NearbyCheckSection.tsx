import { useEffect, useState, type ReactNode } from 'react'
import {
  PiAirplaneTilt, PiShieldStar, PiLock, PiFirstAid, PiShieldCheck,
  PiSiren, PiLeaf, PiLightning, PiFactory, PiAnchor, PiSwimmingPool,
  PiTrain, PiRoadHorizon, PiBoat, PiPlug, PiCellSignalHigh,
  PiMapPin, PiCheck, PiArrowCounterClockwise, PiPushPin, PiPlus, PiX,
} from 'react-icons/pi'
import { useSegmentPersistedState } from '../../hooks/useSegmentPersistedState'
import type { MetricStatus } from '../../types/assessment'
import type { NearbyCategory } from '../../services/overpassApi'
import { formatDistance } from '../../utils/formatting'
import { COMPASS_DIRECTIONS, MANUAL_NEARBY_CATEGORIES, MANUAL_NEARBY_KEY, type ManualNearbyEntry } from '../../utils/manualNearby'
import ChecklistSection from '../ChecklistSection'

const CATEGORY_ICONS: Record<string, ReactNode> = {
  aviation: <PiAirplaneTilt />,
  military: <PiShieldStar />,
  prison: <PiLock />,
  hospital: <PiFirstAid />,
  police: <PiShieldCheck />,
  fire_station: <PiSiren />,
  nature: <PiLeaf />,
  energy: <PiLightning />,
  industrial: <PiFactory />,
  harbour: <PiAnchor />,
  swimming: <PiSwimmingPool />,
  railway: <PiTrain />,
  highway: <PiRoadHorizon />,
  waterway: <PiBoat />,
  powerline: <PiPlug />,
  celltower: <PiCellSignalHigh />,
  other: <PiPushPin />,
}

const FIELD_CLASS = 'min-h-11 w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted'

const EMPTY_DRAFT = { category: 'aviation', name: '', distance: '', direction: '' }

function ManualEntryForm({ onAdd, onCancel }: { onAdd: (entry: ManualNearbyEntry) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const distance = draft.distance.trim() === '' ? null : Math.round(Number(draft.distance.replace(',', '.')))
  const distanceInvalid = distance !== null && (!Number.isFinite(distance) || distance < 0)

  const submit = () => {
    if (distanceInvalid) return
    onAdd({
      id: crypto.randomUUID(),
      category: draft.category,
      name: draft.name.trim(),
      distance,
      direction: distance !== null && draft.direction ? draft.direction : null,
    })
    setDraft(EMPTY_DRAFT)
  }

  return (
    <form
      className="space-y-2 border border-line px-3 py-3"
      onSubmit={(e) => { e.preventDefault(); submit() }}
    >
      <div>
        <label htmlFor="nearby-manual-category" className="mb-1 block text-xs text-text-muted">Objektart</label>
        <select
          id="nearby-manual-category"
          value={draft.category}
          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
          className={`${FIELD_CLASS} cursor-pointer`}
        >
          {MANUAL_NEARBY_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="nearby-manual-name" className="mb-1 block text-xs text-text-muted">Bezeichnung</label>
        <input
          id="nearby-manual-name"
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="z.B. Landeplatz Klinikum"
          className={FIELD_CLASS}
          data-1p-ignore
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="nearby-manual-distance" className="mb-1 block text-xs text-text-muted">Entfernung (m)</label>
          <input
            id="nearby-manual-distance"
            type="text"
            inputMode="numeric"
            value={draft.distance}
            onChange={(e) => setDraft((d) => ({ ...d, distance: e.target.value }))}
            placeholder="leer = im Suchradius"
            aria-invalid={distanceInvalid || undefined}
            className={`${FIELD_CLASS} num${distanceInvalid ? ' ring-2 ring-warning' : ''}`}
            data-1p-ignore
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="nearby-manual-direction" className="mb-1 block text-xs text-text-muted">Richtung</label>
          <select
            id="nearby-manual-direction"
            value={draft.direction}
            disabled={distance === null}
            onChange={(e) => setDraft((d) => ({ ...d, direction: e.target.value }))}
            className={`${FIELD_CLASS} cursor-pointer disabled:cursor-not-allowed disabled:opacity-55`}
          >
            <option value="">–</option>
            {COMPASS_DIRECTIONS.map((dir) => (
              <option key={dir} value={dir}>{dir}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg px-3 text-sm text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={distanceInvalid}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent transition-opacity disabled:opacity-55"
        >
          Eintragen
        </button>
      </div>
    </form>
  )
}

interface NearbyCheckSectionProps {
  categories: NearbyCategory[]
  loading: boolean
  error: string | null
  locked?: boolean
  onManualChecksChange?: (checked: Record<string, boolean>) => void
  open?: boolean
  onToggle?: () => void
  isComplete?: boolean
  onContinue?: () => void
  continueLabel?: string
  isPhaseComplete?: boolean
}

const MANUAL_CHECKS = [
  { key: 'wlan', label: 'WLAN-Netze', desc: 'Starke WLAN-Sender in der Nähe?' },
  { key: 'other_uav', label: 'Andere UAV', desc: 'Andere Drohnen im Einsatzgebiet?' },
  { key: 'radio', label: 'Funkanlagen', desc: 'Sonstige Funkanlagen in der Nähe?' },
  { key: 'gps_jammer', label: 'GPS-Störsender', desc: 'GPS-Jammer im Einsatzgebiet?' },
  { key: 'magnetic', label: 'Magnetfelder', desc: 'Starke Magnetfeldquellen in der Nähe?' },
  { key: 'bos_active', label: 'BOS-Einsatzstelle', desc: 'Aktiver Einsatz von Rettungskräften?' },
  { key: 'verfassungsorgane', label: 'Verfassungsorgane', desc: 'Bundes-/Landesregierung, Parlament?' },
  { key: 'residential', label: 'Wohngrundstücke', desc: 'Überflug von Wohngrundstücken geplant?' },
]

function getOverallStatus(categories: NearbyCategory[]): MetricStatus {
  const highRisk = ['aviation', 'military', 'prison']
  if (categories.some(c => highRisk.includes(c.key))) return 'warning'
  if (categories.length > 0) return 'caution'
  return 'good'
}

export default function NearbyCheckSection({ categories, loading, error, locked, onManualChecksChange, open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: NearbyCheckSectionProps) {
  const [checked, setChecked] = useSegmentPersistedState<Record<string, boolean>>('nearby:manualChecks', {})
  const [, setManualEntries] = useSegmentPersistedState<ManualNearbyEntry[]>(MANUAL_NEARBY_KEY, [])
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    onManualChecksChange?.(checked)
  }, [checked, onManualChecksChange])

  const hasAnyCheck = Object.values(checked).some(Boolean)

  const status = getOverallStatus(categories)
  const badge = loading
    ? undefined
    : error
      ? { label: 'Fehler', status: 'warning' as MetricStatus }
      : categories.length > 0
        ? { label: status === 'warning' ? 'Achtung' : `${categories.length} Kategorien`, status }
        : { label: 'Frei', status: 'good' as MetricStatus }

  return (
    <ChecklistSection title="Umgebungsprüfung" icon={<PiMapPin />} badge={badge} loading={loading} locked={locked} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      {error && (
        <div className="rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning">{error}</div>
      )}

      {!loading && (
        <div className="space-y-3">
          {!error && categories.length === 0 && (
            <p className="py-2 text-sm text-text-muted">
              Keine relevanten Objekte im Umkreis von 1,5 km gefunden.
            </p>
          )}

          {categories.map((cat) => (
            <div key={cat.key} className="rounded-lg bg-surface-alt px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-base flex items-center text-text-muted">{CATEGORY_ICONS[cat.key]}</span>
                <span className="flex-1 text-sm font-medium text-text">{cat.label}</span>
                <span className="bg-base px-2 py-0.5 text-xs text-text-muted">
                  {cat.items.length}
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5 pl-7">
                {cat.items.map((item, i) => (
                  <div key={item.manualId ?? i} className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.manualId && (
                      <span className="shrink-0 border border-line px-1.5 text-[0.65rem] uppercase tracking-wider">manuell</span>
                    )}
                    {item.distance !== null ? (
                      <span className="shrink-0 tabular-nums">
                        {formatDistance(item.distance)}{item.direction ? ` ${item.direction}` : ''}
                      </span>
                    ) : (
                      <span className="shrink-0 italic">im Suchradius</span>
                    )}
                    {item.manualId && (
                      <button
                        type="button"
                        aria-label={`${item.name} entfernen`}
                        onClick={() => setManualEntries((prev) => prev.filter((e) => e.id !== item.manualId))}
                        className="-my-2 flex h-9 w-9 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-warning"
                      >
                        <PiX />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {formOpen ? (
            <ManualEntryForm
              onAdd={(entry) => { setManualEntries((prev) => [...prev, entry]); setFormOpen(false) }}
              onCancel={() => setFormOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-surface-alt px-3 text-sm text-text-muted transition-colors hover:text-text"
            >
              <PiPlus />
              Objekt eintragen
            </button>
          )}

          <div className="border-t border-line pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Manuelle Prüfungen
              </p>
              {hasAnyCheck && (
                <button
                  onClick={() => setChecked({})}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
                >
                  <PiArrowCounterClockwise />
                  Zurücksetzen
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {MANUAL_CHECKS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setChecked((prev) => ({ ...prev, [c.key]: !prev[c.key] }))}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-alt"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                      checked[c.key]
                        ? 'border-good bg-good text-on-fill'
                        : 'border-text-muted/30 text-transparent'
                    }`}
                  >
                    <PiCheck />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm transition-colors ${checked[c.key] ? 'text-text-muted' : 'text-text'}`}>
                      {c.label}
                    </p>
                    <p className="text-xs text-text-muted">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ChecklistSection>
  )
}
