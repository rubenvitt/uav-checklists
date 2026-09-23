import {
  PiAirplaneInFlight, PiAirplaneTilt, PiArrowDown, PiArrowUp, PiArrowsClockwise,
  PiInfo, PiLightning, PiArrowSquareOut, PiPlugs,
} from 'react-icons/pi'
import type { MetricStatus } from '../../types/assessment'
import type { FlightTrafficSnapshot, TrafficAircraftAssessment, TrafficAssessment } from '../../types/traffic'
import type { FlightTrafficErrorKind } from '../../hooks/useFlightTraffic'
import { formatDistance } from '../../utils/formatting'
import { EMERGENCY_LABELS, aircraftLabel, formatSnapshotTime } from '../../utils/trafficAssessment'
import { TRAFFIC_LOW_LEVEL_M, TRAFFIC_NEAR_M } from '../../data/thresholds'
import ChecklistSection from '../ChecklistSection'

/** Mehr Einträge würden die Vorflugkontrolle unnötig verlängern */
const MAX_LISTED = 12

interface FlightTrafficSectionProps {
  latitude: number | null
  longitude: number | null
  snapshot: FlightTrafficSnapshot | null
  assessment: TrafficAssessment | null
  isLive: boolean
  configured: boolean
  loading: boolean
  fetching: boolean
  error: string | null
  errorKind: FlightTrafficErrorKind | null
  onRefresh: () => void
  locked?: boolean
  open?: boolean
  onToggle?: () => void
  isComplete?: boolean
  onContinue?: () => void
  continueLabel?: string
  isPhaseComplete?: boolean
}

const dotColors: Record<MetricStatus, string> = {
  good: 'bg-good',
  caution: 'bg-caution',
  warning: 'bg-warning',
}

function getBadge(assessment: TrafficAssessment | null, noServer: boolean, error: string | null): { label: string; status: MetricStatus } | undefined {
  if (!assessment) {
    if (noServer) return { label: 'Kein Server', status: 'caution' }
    return error ? { label: 'Offline', status: 'caution' } : undefined
  }
  if (assessment.overall === 'warning') return { label: 'Tiefflug in der Nähe', status: 'warning' }
  if (assessment.lowLevelCount > 0) return { label: `${assessment.lowLevelCount} im Tiefflug`, status: 'caution' }
  if (assessment.overall === 'caution') return { label: 'Achtung', status: 'caution' }
  if (assessment.airborneCount === 0) return { label: 'Kein Verkehr', status: 'good' }
  return { label: `${assessment.airborneCount} in der Luft`, status: 'good' }
}

function formatHeight(item: TrafficAircraftAssessment, heightIsAgl: boolean): string {
  if (item.aircraft.onGround) return 'am Boden'
  if (item.heightM === null) return 'Höhe unbekannt'
  return `${item.heightM.toLocaleString('de-DE')} m ${heightIsAgl ? 'ü. Grund' : 'ü. NN'}`
}

function AircraftRow({ item, heightIsAgl }: { item: TrafficAircraftAssessment; heightIsAgl: boolean }) {
  const { aircraft } = item
  const rate = aircraft.verticalRateFpm
  const climbing = rate !== null && rate >= 300
  const descending = rate !== null && rate <= -300
  const typeInfo = [aircraft.typeCode, aircraft.callsign && aircraft.registration ? aircraft.registration : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={`flex items-start gap-3 rounded-lg bg-surface-alt px-3 py-2.5 ${aircraft.onGround ? 'opacity-60' : ''}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColors[item.status]}`} />
      <span className="mt-0.5 flex text-base text-text-muted" title={aircraft.isRotorcraft ? 'Drehflügler' : 'Luftfahrzeug'}>
        {aircraft.isRotorcraft ? <PiAirplaneInFlight /> : <PiAirplaneTilt />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text">{aircraftLabel(aircraft)}</span>
          {aircraft.isRotorcraft && (
            <span className="shrink-0 rounded bg-base px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-muted">Heli</span>
          )}
          {aircraft.isMilitary && (
            <span className="shrink-0 rounded bg-base px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-muted">Mil</span>
          )}
        </div>
        {typeInfo && <p className="truncate text-xs text-text-muted">{typeInfo}</p>}
        {aircraft.emergency && (
          <p className="text-xs font-medium text-warning">{EMERGENCY_LABELS[aircraft.emergency] ?? aircraft.emergency}</p>
        )}
      </div>
      <div className="shrink-0 text-right text-xs tabular-nums text-text-muted">
        <p className="flex items-center justify-end gap-1 text-text">
          {climbing && <PiArrowUp title="steigend" />}
          {descending && <PiArrowDown title="sinkend" />}
          {formatHeight(item, heightIsAgl)}
        </p>
        <p>
          {formatDistance(aircraft.distanceM)} {aircraft.direction}
          {aircraft.groundSpeedKt !== null && !aircraft.onGround && ` · ${Math.round(aircraft.groundSpeedKt * 1.852)} km/h`}
        </p>
      </div>
    </div>
  )
}

export default function FlightTrafficSection({
  latitude, longitude, snapshot, assessment, isLive, configured, loading, fetching, error, errorKind, onRefresh,
  locked, open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete,
}: FlightTrafficSectionProps) {
  // „Failed to fetch“ (CORS/Netzwerk) bzw. fehlende Route heißt: kein Proxy
  // erreichbar — ein Einrichtungs-, kein Datenproblem
  const noServer = !configured || errorKind === 'no-server'
  const badge = getBadge(assessment, noServer, error)
  const liveMapUrl = latitude !== null && longitude !== null
    ? `https://globe.adsb.lol/?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}&zoom=11`
    : null
  const listed = assessment?.items.slice(0, MAX_LISTED) ?? []
  const hiddenCount = (assessment?.items.length ?? 0) - listed.length

  return (
    <ChecklistSection title="Flugverkehr (ADS-B)" icon={<PiAirplaneInFlight />} badge={badge} loading={loading} locked={locked} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      <div className="space-y-3">
        {noServer && (
          <div className="flex items-start gap-3 rounded-lg bg-surface-alt px-4 py-3 text-sm text-text-muted">
            <PiPlugs className="mt-0.5 shrink-0 text-base" />
            <p>
              <span className="font-medium text-text">Kein ADS-B-Server verbunden.</span>{' '}
              Live-Flugverkehr benötigt den ADS-B-Proxy des Backends{configured ? ', der gerade nicht erreichbar ist' : ''}.
              Über die Live-Karte unten lässt sich der Verkehr trotzdem prüfen.
              {snapshot && ` Angezeigt wird der Stand von ${formatSnapshotTime(snapshot.fetchedAt)} Uhr.`}
            </p>
          </div>
        )}

        {error && !noServer && (
          <div className="rounded-lg bg-caution-bg px-4 py-3 text-sm text-caution">
            {error}
            {snapshot && ` — angezeigt wird der Stand von ${formatSnapshotTime(snapshot.fetchedAt)} Uhr.`}
          </div>
        )}

        {snapshot && assessment && (
          <>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="flex-1">
                Stand {formatSnapshotTime(snapshot.fetchedAt)} Uhr{!isLive && ' (gespeichert)'} · Umkreis {snapshot.radiusKm} km
              </span>
              <button
                onClick={onRefresh}
                disabled={fetching}
                className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-surface-alt hover:text-text disabled:opacity-50"
              >
                <PiArrowsClockwise className={fetching ? 'animate-spin' : ''} />
                Aktualisieren
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-alt px-2 py-2">
                <p className="text-lg font-semibold tabular-nums text-text">{assessment.airborneCount}</p>
                <p className="text-[11px] text-text-muted">in der Luft</p>
              </div>
              <div className="rounded-lg bg-surface-alt px-2 py-2">
                <p className={`text-lg font-semibold tabular-nums ${assessment.lowLevelCount > 0 ? 'text-caution' : 'text-text'}`}>{assessment.lowLevelCount}</p>
                <p className="text-[11px] text-text-muted">unter {TRAFFIC_LOW_LEVEL_M} m</p>
              </div>
              <div className="rounded-lg bg-surface-alt px-2 py-2">
                <p className={`text-lg font-semibold tabular-nums ${assessment.overall === 'warning' ? 'text-warning' : 'text-text'}`}>
                  {assessment.nearestLowLevel ? formatDistance(assessment.nearestLowLevel.aircraft.distanceM) : '–'}
                </p>
                <p className="text-[11px] text-text-muted">nächster Tiefflug</p>
              </div>
            </div>

            {assessment.recommendations.length > 0 && (
              <ul className="space-y-1.5">
                {assessment.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                    <PiLightning className="mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            )}

            {listed.length === 0 ? (
              <p className="py-1 text-sm text-text-muted">
                Keine Luftfahrzeuge mit ADS-B/MLAT im Umkreis von {snapshot.radiusKm} km empfangen.
              </p>
            ) : (
              <div className="space-y-1.5">
                {listed.map((item) => (
                  <AircraftRow key={item.aircraft.hex} item={item} heightIsAgl={assessment.heightIsAgl} />
                ))}
                {hiddenCount > 0 && (
                  <p className="px-1 text-xs text-text-muted">+ {hiddenCount} weitere in größerer Entfernung</p>
                )}
              </div>
            )}
          </>
        )}

        {liveMapUrl && (
          <a
            href={liveMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg bg-surface-alt px-4 py-3 transition-colors hover:bg-base active:scale-[0.99]"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Live-Karte öffnen</p>
              <p className="text-xs text-text-muted">globe.adsb.lol am Einsatzort</p>
            </div>
            <PiArrowSquareOut className="text-text-muted" />
          </a>
        )}

        <p className="flex items-start gap-2 text-xs text-text-muted">
          <PiInfo className="mt-0.5 shrink-0" />
          <span>
            Bewertung: unter {TRAFFIC_LOW_LEVEL_M} m in bis zu {TRAFFIC_NEAR_M / 1000} km Entfernung = Warnung.
            ADS-B zeigt nur Luftfahrzeuge mit entsprechendem Transponder und Empfangsabdeckung — Segelflug, UL,
            Gleitschirme, Ballone und manche Hubschrauber fehlen häufig. Ersetzt nicht die Luftraumbeobachtung.
            {assessment && !assessment.heightIsAgl && ' Geländehöhe unbekannt: Höhen sind über NN angegeben.'}
            {snapshot && ` Daten: ${snapshot.source}${snapshot.source === 'adsb.lol' ? ' (ODbL)' : ''}.`}
          </span>
        </p>
      </div>
    </ChecklistSection>
  )
}
