import { useEffect } from 'react'
import { PiCheck } from 'react-icons/pi'
import { useMissionPersistedState } from '../hooks/useMissionPersistedState'

export type ArcClass = 'a' | 'b' | 'c-star' | 'cd'

interface ArcDeterminationProps {
  onArcChange: (arc: ArcClass | null) => void
}

const ARC_LABELS: Record<ArcClass, string> = {
  a: 'ARC-a',
  b: 'ARC-b',
  'c-star': 'ARC-c*',
  cd: 'ARC-c/d',
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

export default function ArcDetermination({ onArcChange }: ArcDeterminationProps) {
  const [reservedAirspace, setReservedAirspace] = useMissionPersistedState<boolean | null>('arc:reservedAirspace', null)
  const [riskFlight, setRiskFlight] = useMissionPersistedState<boolean | null>('arc:riskFlight', null)
  const [nearAirfield, setNearAirfield] = useMissionPersistedState<'no' | 'yes_without' | 'yes_with' | null>('arc:nearAirfield', null)
  const [under150m, setUnder150m] = useMissionPersistedState<boolean | null>('arc:under150m', null)
  const [uncontrolledAirspace, setUncontrolledAirspace] = useMissionPersistedState<boolean | null>('arc:uncontrolledAirspace', null)
  const [areaType, setAreaType] = useMissionPersistedState<'rural' | 'urban' | null>('arc:areaType', null)
  const [adsbMonitoring, setAdsbMonitoring] = useMissionPersistedState('arc:adsbMonitoring', false)
  const [coordination, setCoordination] = useMissionPersistedState('arc:coordination', false)

  // ARC-Klasse berechnen
  let arcClass: ArcClass | null = null

  if (reservedAirspace === true) {
    if (riskFlight === true) arcClass = 'c-star'
    else if (riskFlight === false) arcClass = 'a'
  } else if (reservedAirspace === false) {
    if (nearAirfield === 'yes_without') {
      arcClass = 'cd'
    } else if (nearAirfield === 'yes_with') {
      arcClass = 'b'
    } else if (nearAirfield === 'no') {
      if (under150m === false) {
        arcClass = 'cd'
      } else if (under150m === true) {
        if (uncontrolledAirspace === false) {
          arcClass = 'cd'
        } else if (uncontrolledAirspace === true) {
          if (areaType === 'rural') arcClass = 'a'
          else if (areaType === 'urban') arcClass = 'b'
        }
      }
    }
  }

  const arcBlocked = arcClass === 'cd'

  useEffect(() => {
    onArcChange(arcClass)
  }, [arcClass, onArcChange])

  return (
    <div className="space-y-4">
      {/* Schritt 1: Reservierter Luftraum */}
      <div>
        <p className="mb-2 text-sm font-medium text-text">
          Flug in reserviertem Luftraum (EDR, 30m um Flughindernisse)?
        </p>
        <div className="flex flex-wrap gap-2">
          <PillButton
            selected={reservedAirspace === true}
            onClick={() => {
              setReservedAirspace(true)
              setNearAirfield(null)
              setUnder150m(null)
              setUncontrolledAirspace(null)
              setAreaType(null)
            }}
          >
            Ja
          </PillButton>
          <PillButton
            selected={reservedAirspace === false}
            onClick={() => {
              setReservedAirspace(false)
              setRiskFlight(null)
            }}
          >
            Nein
          </PillButton>
        </div>
      </div>

      {/* Unterfrage: Risikoflug */}
      {reservedAirspace === true && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Risikoflug mit Absprache?</p>
          <div className="flex flex-wrap gap-2">
            <PillButton selected={riskFlight === true} onClick={() => setRiskFlight(true)}>
              Ja
            </PillButton>
            <PillButton selected={riskFlight === false} onClick={() => setRiskFlight(false)}>
              Nein
            </PillButton>
          </div>
        </div>
      )}

      {/* ARC-c* Hinweis */}
      {arcClass === 'c-star' && (
        <div className="rounded-lg border border-caution/30 bg-caution-bg px-4 py-3">
          <p className="text-sm font-medium text-caution">ARC-c* — Flug nur an Einsatzstellen</p>
        </div>
      )}

      {/* Schritt 2: Aktive Flugplätze */}
      {reservedAirspace === false && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Flug in der Nähe aktiver Flugplätze?</p>
          <div className="flex flex-wrap gap-2">
            <PillButton
              selected={nearAirfield === 'yes_without'}
              onClick={() => {
                setNearAirfield('yes_without')
                setUnder150m(null)
                setUncontrolledAirspace(null)
                setAreaType(null)
              }}
            >
              Ja, ohne Absprache
            </PillButton>
            <PillButton
              selected={nearAirfield === 'yes_with'}
              onClick={() => {
                setNearAirfield('yes_with')
                setUnder150m(null)
                setUncontrolledAirspace(null)
                setAreaType(null)
              }}
            >
              Ja, mit Absprache
            </PillButton>
            <PillButton
              selected={nearAirfield === 'no'}
              onClick={() => setNearAirfield('no')}
            >
              Nein
            </PillButton>
          </div>
        </div>
      )}

      {/* Warnung: Ohne Absprache */}
      {nearAirfield === 'yes_without' && (
        <div className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
          <p className="text-sm font-medium text-warning">Flug nicht möglich!</p>
          <p className="text-xs text-warning/80">
            Ohne Absprache ist kein Flug in der Nähe aktiver Flugplätze erlaubt.
          </p>
        </div>
      )}

      {/* Schritt 3: Unter 150m */}
      {reservedAirspace === false && nearAirfield === 'no' && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Flug unter 150m (AGL)?</p>
          <div className="flex flex-wrap gap-2">
            <PillButton selected={under150m === true} onClick={() => setUnder150m(true)}>
              Ja
            </PillButton>
            <PillButton
              selected={under150m === false}
              onClick={() => {
                setUnder150m(false)
                setUncontrolledAirspace(null)
                setAreaType(null)
              }}
            >
              Nein
            </PillButton>
          </div>
        </div>
      )}

      {/* Warnung: Über 150m */}
      {reservedAirspace === false && nearAirfield === 'no' && under150m === false && (
        <div className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
          <p className="text-sm font-medium text-warning">Flug nicht möglich!</p>
          <p className="text-xs text-warning/80">
            Flüge über 150m AGL erfordern besondere Genehmigungen.
          </p>
        </div>
      )}

      {/* Schritt 4: Unkontrollierter Luftraum */}
      {reservedAirspace === false && nearAirfield === 'no' && under150m === true && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Flug in unkontrolliertem Luftraum?</p>
          <div className="flex flex-wrap gap-2">
            <PillButton
              selected={uncontrolledAirspace === true}
              onClick={() => setUncontrolledAirspace(true)}
            >
              Ja
            </PillButton>
            <PillButton
              selected={uncontrolledAirspace === false}
              onClick={() => {
                setUncontrolledAirspace(false)
                setAreaType(null)
              }}
            >
              Nein
            </PillButton>
          </div>
        </div>
      )}

      {/* Warnung: Kontrollierter Luftraum */}
      {reservedAirspace === false && nearAirfield === 'no' && under150m === true && uncontrolledAirspace === false && (
        <div className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
          <p className="text-sm font-medium text-warning">Flug nicht möglich!</p>
          <p className="text-xs text-warning/80">
            Flug in kontrolliertem Luftraum erfordert besondere Genehmigungen.
          </p>
        </div>
      )}

      {/* Schritt 5: Gebietstyp */}
      {reservedAirspace === false && nearAirfield === 'no' && under150m === true && uncontrolledAirspace === true && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Gebietstyp</p>
          <div className="flex flex-wrap gap-2">
            <PillButton selected={areaType === 'rural'} onClick={() => setAreaType('rural')}>
              Ländlich
            </PillButton>
            <PillButton selected={areaType === 'urban'} onClick={() => setAreaType('urban')}>
              Städtisch
            </PillButton>
          </div>
        </div>
      )}

      {/* Luftrisikominimierung */}
      {arcClass !== null && !arcBlocked && (
        <div className="border-t border-surface-alt pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
            Luftrisikominimierung
          </p>
          <div className="space-y-0.5">
            <CheckItem
              checked={adsbMonitoring}
              onChange={setAdsbMonitoring}
              label="Überwachung ADS-B"
              desc="ADS-B Empfänger zur Luftraumüberwachung"
            />
            <CheckItem
              checked={coordination}
              onChange={setCoordination}
              label="Absprache"
              desc="Koordination mit relevanten Stellen"
            />
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {arcClass !== null && (
        <div className="flex items-stretch overflow-hidden rounded-lg">
          <div
            className={`w-1.5 ${
              arcBlocked ? 'bg-warning' : arcClass === 'a' ? 'bg-good' : 'bg-caution'
            }`}
          />
          <div
            className={`flex-1 px-4 py-3 ${
              arcBlocked
                ? 'bg-warning-bg'
                : arcClass === 'c-star'
                  ? 'bg-caution-bg'
                  : 'bg-surface-alt'
            }`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text">Air Risk Class</span>
              <span
                className={`text-lg font-bold ${
                  arcBlocked
                    ? 'text-warning'
                    : arcClass === 'a'
                      ? 'text-good'
                      : arcClass === 'c-star'
                        ? 'text-caution'
                        : 'text-text'
                }`}
              >
                {ARC_LABELS[arcClass]}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
