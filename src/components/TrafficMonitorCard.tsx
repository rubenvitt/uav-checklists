import { PiAirplaneInFlight, PiArrowsClockwise, PiBellRinging, PiCheck, PiPlugs, PiWarning } from 'react-icons/pi'
import type { MetricStatus } from '../types/assessment'
import type { TrafficAlert } from '../types/traffic'
import type { UseTrafficMonitorResult } from '../hooks/useTrafficMonitor'
import { TRAFFIC_LOW_LEVEL_M } from '../data/thresholds'
import { formatDistance } from '../utils/formatting'
import { formatSnapshotTime } from '../utils/trafficAssessment'
import { formatTrafficAlertLine, trafficAlertTitle } from '../utils/trafficMonitor'

const dotColors: Record<MetricStatus, string> = {
  good: 'bg-good',
  caution: 'bg-caution',
  warning: 'bg-warning',
}

/** Auffällige Meldung, bis sie mit „Gesehen“ bestätigt wird */
export function TrafficAlertBanner({ alert, onAcknowledge }: { alert: TrafficAlert; onAcknowledge: () => void }) {
  const isWarning = alert.status === 'warning'
  return (
    <div
      role="alert"
      className={`space-y-2 rounded-xl border-2 p-4 ${isWarning ? 'border-warning/50 bg-warning-bg' : 'border-caution/40 bg-caution-bg'}`}
    >
      <div className="flex items-start gap-3">
        <PiWarning className={`mt-0.5 shrink-0 text-lg ${isWarning ? 'text-warning' : 'text-caution'}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isWarning ? 'text-warning' : 'text-caution'}`}>
            {trafficAlertTitle(alert)}
          </p>
          <p className="text-xs text-text-muted">ADS-B · {formatSnapshotTime(alert.at)} Uhr · als Ereignis protokolliert</p>
        </div>
      </div>
      <ul className="space-y-1 pl-8">
        {alert.items.map((item) => (
          <li key={item.hex} className="text-sm text-text">
            {formatTrafficAlertLine(item, alert.heightIsAgl)}
          </li>
        ))}
      </ul>
      {isWarning && (
        <p className="pl-8 text-xs text-text-muted">
          Luftraumbeobachter einweisen, UAS ggf. absenken bzw. Start zurückstellen, bis das Luftfahrzeug abgeflogen ist.
        </p>
      )}
      <div className="flex justify-end">
        <button
          onClick={onAcknowledge}
          className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-alt active:scale-[0.99]"
        >
          <PiCheck />
          Gesehen
        </button>
      </div>
    </div>
  )
}

function StatusLine({ monitor, flightActive }: { monitor: UseTrafficMonitorResult; flightActive: boolean }) {
  const { snapshot, assessment } = monitor

  // „Failed to fetch“/fehlende Route: kein Proxy verbunden — kein Datenfehler
  if (!monitor.configured || monitor.errorKind === 'no-server') {
    return (
      <p className="flex items-start gap-2 text-xs text-text-muted">
        <PiPlugs className="mt-0.5 shrink-0" />
        <span>Kein ADS-B-Server verbunden — keine automatische Überwachung. Luftraumbeobachtung wie gewohnt.</span>
      </p>
    )
  }
  if (!monitor.hasLocation) {
    return <p className="text-xs text-text-muted">Kein Standort bekannt — bitte in der Vorflugkontrolle festlegen.</p>
  }
  if (monitor.error && !monitor.isLive) {
    return (
      <p className="text-xs text-caution">
        {monitor.errorKind === 'offline' ? 'Keine Internetverbindung' : monitor.error} — Überwachung pausiert, neuer Versuch läuft automatisch.
      </p>
    )
  }
  if (!snapshot || !assessment) {
    return <p className="text-xs text-text-muted">Flugverkehr wird abgefragt …</p>
  }

  const nearest = assessment.nearestLowLevel
  return (
    <div className="space-y-1 text-xs text-text-muted">
      <p className="flex items-center gap-2 text-text">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColors[assessment.overall]}`} />
        {assessment.airborneCount} in der Luft · {assessment.lowLevelCount} unter {TRAFFIC_LOW_LEVEL_M} m
        {nearest && ` · nächster ${formatDistance(nearest.aircraft.distanceM)} ${nearest.aircraft.direction}`}
      </p>
      <p>
        Stand {formatSnapshotTime(snapshot.fetchedAt)} Uhr · Abfrage alle {flightActive ? '30 s' : '60 s'}
      </p>
    </div>
  )
}

/**
 * Kompakte Statuskarte der ADS-B-Überwachung in der Flugphase. Meldungen
 * erscheinen als Banner (`TrafficAlertBanner`) und als Ereignis.
 */
export default function TrafficMonitorCard({ monitor, flightActive }: { monitor: UseTrafficMonitorResult; flightActive: boolean }) {
  const canRequestNotifications = monitor.enabled && monitor.notificationPermission === 'default'
  const showRefresh = monitor.enabled && monitor.configured && monitor.hasLocation && monitor.errorKind !== 'no-server'

  return (
    <div className="space-y-2.5 rounded-xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <PiAirplaneInFlight className="shrink-0 text-lg text-text-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">Luftraumüberwachung (ADS-B)</p>
          <p className="text-xs text-text-muted">Meldet neue Tiefflieger im Umkreis und protokolliert sie als Ereignis</p>
        </div>
        {showRefresh && (
          <button
            onClick={monitor.refresh}
            disabled={monitor.fetching}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-alt hover:text-text disabled:opacity-50"
            title="Jetzt aktualisieren"
          >
            <PiArrowsClockwise className={monitor.fetching ? 'animate-spin' : ''} />
          </button>
        )}
        <button
          role="switch"
          aria-checked={monitor.enabled}
          aria-label="Luftraumüberwachung"
          onClick={() => monitor.setEnabled(!monitor.enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${monitor.enabled ? 'bg-good' : 'bg-surface-alt'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${monitor.enabled ? 'translate-x-5' : ''}`}
          />
        </button>
      </div>

      {monitor.enabled ? (
        <StatusLine monitor={monitor} flightActive={flightActive} />
      ) : (
        <p className="text-xs text-text-muted">Überwachung ausgeschaltet.</p>
      )}

      {canRequestNotifications && (
        <button
          onClick={monitor.requestNotifications}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-alt px-3 py-2 text-xs text-text-muted transition-colors hover:text-text active:scale-[0.99]"
        >
          <PiBellRinging />
          Auch benachrichtigen, wenn die App im Hintergrund ist
        </button>
      )}
    </div>
  )
}
