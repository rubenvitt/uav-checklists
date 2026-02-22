import { useEffect, type ReactNode } from 'react'
import {
  PiAirplaneTilt, PiShieldStar, PiLock, PiFirstAid, PiShieldCheck,
  PiSiren, PiLeaf, PiLightning, PiFactory, PiAnchor, PiSwimmingPool,
  PiTrain, PiRoadHorizon, PiBoat, PiPlug, PiCellSignalHigh,
  PiMapPin, PiCheck, PiArrowCounterClockwise,
} from 'react-icons/pi'
import { useSegmentPersistedState } from '../../hooks/useSegmentPersistedState'
import type { MetricStatus } from '../../types/assessment'
import type { NearbyCategory } from '../../services/overpassApi'
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

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${meters} m`
}

export default function NearbyCheckSection({ categories, loading, error, locked, onManualChecksChange, open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: NearbyCheckSectionProps) {
  const [checked, setChecked] = useSegmentPersistedState<Record<string, boolean>>('nearby:manualChecks', {})

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

      {!loading && !error && (
        <div className="space-y-3">
          {categories.length === 0 && (
            <p className="py-2 text-sm text-text-muted">
              Keine relevanten Objekte im Umkreis von 1,5 km gefunden.
            </p>
          )}

          {categories.map((cat) => (
            <div key={cat.key} className="rounded-lg bg-surface-alt px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-base flex items-center text-text-muted">{CATEGORY_ICONS[cat.key]}</span>
                <span className="flex-1 text-sm font-medium text-text">{cat.label}</span>
                <span className="rounded-full bg-base px-2 py-0.5 text-xs text-text-muted">
                  {cat.items.length}
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5 pl-7">
                {cat.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.distance !== null && item.direction ? (
                      <span className="shrink-0 tabular-nums">
                        {formatDistance(item.distance)} {item.direction}
                      </span>
                    ) : (
                      <span className="shrink-0 italic">im Suchradius</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-surface-alt pt-3">
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
                        ? 'border-good bg-good text-white'
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
