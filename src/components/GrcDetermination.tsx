import { useEffect } from 'react'
import { PiCheck } from 'react-icons/pi'
import { useMissionPersistedState } from '../hooks/useMissionPersistedState'

interface GrcDeterminationProps {
  onGrcChange: (grc: number | null) => void
}

const GRC_TABLE: Record<string, Record<string, number>> = {
  vlos: { sparse: 2, dense: 4, crowd: 7 },
  bvlos: { sparse: 3, dense: 5, crowd: 8 },
}

function PillButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        selected ? 'bg-text text-base' : 'bg-surface-alt text-text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

function CheckItem({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-alt"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
          checked ? 'border-good bg-good text-white' : 'border-text-muted/30 text-transparent'
        }`}
      >
        <PiCheck />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm transition-colors ${checked ? 'text-text-muted' : 'text-text'}`}>{label}</p>
        <p className="text-xs text-text-muted">{desc}</p>
      </div>
    </button>
  )
}

export default function GrcDetermination({ onGrcChange }: GrcDeterminationProps) {
  const [controlledGround, setControlledGround] = useMissionPersistedState<boolean | null>('grc:controlledGround', null)
  const [flightType, setFlightType] = useMissionPersistedState<'vlos' | 'bvlos' | null>('grc:flightType', null)
  const [areaType, setAreaType] = useMissionPersistedState<'sparse' | 'dense' | 'crowd' | null>('grc:areaType', null)
  const [strategicMitigation, setStrategicMitigation] = useMissionPersistedState('grc:strategicMitigation', false)
  const [emergencyPlan, setEmergencyPlan] = useMissionPersistedState('grc:emergencyPlan', false)

  const intrinsicGrc =
    controlledGround === true
      ? 1
      : controlledGround === false && flightType && areaType
        ? GRC_TABLE[flightType][areaType]
        : null

  const mitigationSum = (strategicMitigation ? 1 : 0) + (emergencyPlan ? 1 : 0)
  const finalGrc = intrinsicGrc !== null ? Math.max(1, intrinsicGrc - mitigationSum) : null

  useEffect(() => {
    onGrcChange(finalGrc)
  }, [finalGrc, onGrcChange])

  return (
    <div className="space-y-4">
      {/* Schritt 1: Kontrollierter Bodenbereich */}
      <div>
        <p className="mb-2 text-sm font-medium text-text">Kontrollierter Bodenbereich?</p>
        <div className="flex flex-wrap gap-2">
          <PillButton
            selected={controlledGround === true}
            onClick={() => { setControlledGround(true); setFlightType(null); setAreaType(null) }}
          >
            Ja
          </PillButton>
          <PillButton
            selected={controlledGround === false}
            onClick={() => setControlledGround(false)}
          >
            Nein
          </PillButton>
        </div>
      </div>

      {/* Schritt 2: VLOS / BVLOS */}
      {controlledGround === false && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Flugbetrieb</p>
          <div className="flex flex-wrap gap-2">
            <PillButton
              selected={flightType === 'vlos'}
              onClick={() => { setFlightType('vlos'); setAreaType(null) }}
            >
              VLOS
            </PillButton>
            <PillButton
              selected={flightType === 'bvlos'}
              onClick={() => { setFlightType('bvlos'); setAreaType(null) }}
            >
              BVLOS
            </PillButton>
          </div>
        </div>
      )}

      {/* Schritt 3: Gebietstyp */}
      {controlledGround === false && flightType && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Gebietstyp</p>
          <div className="flex flex-wrap gap-2">
            <PillButton selected={areaType === 'sparse'} onClick={() => setAreaType('sparse')}>
              Dünn besiedelt
            </PillButton>
            <PillButton selected={areaType === 'dense'} onClick={() => setAreaType('dense')}>
              Dicht besiedelt
            </PillButton>
            <PillButton selected={areaType === 'crowd'} onClick={() => setAreaType('crowd')}>
              Menschenansammlung
            </PillButton>
          </div>
        </div>
      )}

      {/* Minderungen */}
      {intrinsicGrc !== null && (
        <div className="border-t border-surface-alt pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
            Minderungen
          </p>
          <div className="space-y-0.5">
            <CheckItem
              checked={strategicMitigation}
              onChange={setStrategicMitigation}
              label="Strategische Bodenrisikominimierung"
              desc="Reduziert GRC um 1"
            />
            <CheckItem
              checked={emergencyPlan}
              onChange={setEmergencyPlan}
              label="Notfallplan ausgefüllt"
              desc="Reduziert GRC um 1"
            />
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {intrinsicGrc !== null && finalGrc !== null && (
        <div className="flex items-stretch overflow-hidden rounded-lg">
          <div className={`w-1.5 ${finalGrc <= 2 ? 'bg-good' : finalGrc <= 4 ? 'bg-caution' : 'bg-warning'}`} />
          <div className="flex-1 bg-surface-alt px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Intrinsic GRC</span>
              <span className="font-medium text-text">{intrinsicGrc}</span>
            </div>
            {mitigationSum > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Minderung</span>
                <span className="font-medium text-good">{'\u2212'}{mitigationSum}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-surface pt-1 text-sm">
              <span className="font-medium text-text">Finale GRC</span>
              <span className="text-lg font-bold text-text">{finalGrc}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
