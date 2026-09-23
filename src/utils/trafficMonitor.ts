import type { MetricStatus } from '../types/assessment'
import type { TrafficAlert, TrafficAlertItem, TrafficAssessment, TrafficMonitorState } from '../types/traffic'
import { TRAFFIC_NEAR_M } from '../data/thresholds'
import { formatDistance } from './formatting'
import { EMERGENCY_LABELS, aircraftLabel } from './trafficAssessment'

const STATUS_RANK: Record<MetricStatus, number> = { good: 0, caution: 1, warning: 2 }

/**
 * Ein Luftfahrzeug, das so lange nicht mehr gesehen wurde, gilt beim nächsten
 * Auftauchen wieder als neu (z. B. RTH auf dem Rückflug).
 */
export const TRAFFIC_MONITOR_FORGET_MS = 15 * 60_000

export const EMPTY_TRAFFIC_MONITOR_STATE: TrafficMonitorState = { lastProcessedAt: null, tracked: {} }

/**
 * Vergleicht einen neuen Snapshot mit den bereits gemeldeten Luftfahrzeugen.
 * Gemeldet wird, was für den UAS-Betrieb relevant ist (Bewertung ≥ Vorsicht,
 * also Tiefflug im Umkreis, Annäherung oder Not-/Rettungsflug) und
 * - bisher nicht (bzw. länger nicht) gesehen wurde, oder
 * - kritischer geworden ist als bei der letzten Meldung.
 * Hoch überfliegender Verkehr löst keine Meldung aus.
 */
export function detectTrafficAlert(
  state: TrafficMonitorState,
  assessment: TrafficAssessment,
  fetchedAt: string,
  id: string,
): { state: TrafficMonitorState; alert: TrafficAlert | null } {
  const now = new Date(fetchedAt).getTime()
  const tracked: TrafficMonitorState['tracked'] = {}
  for (const [hex, track] of Object.entries(state.tracked)) {
    if (now - new Date(track.lastSeen).getTime() <= TRAFFIC_MONITOR_FORGET_MS) tracked[hex] = track
  }

  const items: TrafficAlertItem[] = []
  for (const { aircraft, status, heightM } of assessment.items) {
    if (aircraft.onGround) continue
    const prev = tracked[aircraft.hex]

    if (status === 'good') {
      // Weiter beobachten, aber nicht melden
      if (prev) tracked[aircraft.hex] = { ...prev, lastSeen: fetchedAt }
      continue
    }

    const escalated = prev !== undefined && STATUS_RANK[status] > STATUS_RANK[prev.alertedStatus]
    if (!prev || escalated) {
      items.push({
        hex: aircraft.hex,
        label: aircraftLabel(aircraft),
        kind: prev ? 'closer' : 'new',
        status,
        typeCode: aircraft.typeCode,
        isRotorcraft: aircraft.isRotorcraft,
        isMilitary: aircraft.isMilitary,
        emergency: aircraft.emergency,
        heightM,
        distanceM: aircraft.distanceM,
        direction: aircraft.direction,
      })
    }
    tracked[aircraft.hex] = {
      lastSeen: fetchedAt,
      alertedStatus: prev && STATUS_RANK[prev.alertedStatus] > STATUS_RANK[status] ? prev.alertedStatus : status,
    }
  }

  const alert: TrafficAlert | null = items.length > 0
    ? {
        id,
        at: fetchedAt,
        status: items.some((i) => i.status === 'warning') ? 'warning' : 'caution',
        heightIsAgl: assessment.heightIsAgl,
        items,
      }
    : null

  return { state: { lastProcessedAt: fetchedAt, tracked }, alert }
}

function formatAlertHeight(item: TrafficAlertItem, heightIsAgl: boolean): string {
  if (item.heightM === null) return 'Höhe unbekannt'
  return `${item.heightM.toLocaleString('de-DE')} m ${heightIsAgl ? 'ü. Grund' : 'ü. NN'}`
}

function describeItem(item: TrafficAlertItem): string {
  const extras = [
    item.typeCode,
    item.isRotorcraft ? 'Hubschrauber' : null,
    item.isMilitary ? 'militärisch' : null,
    item.emergency ? (EMERGENCY_LABELS[item.emergency] ?? item.emergency) : null,
  ].filter(Boolean)
  return `${item.label}${extras.length > 0 ? ` (${extras.join(', ')})` : ''}`
}

function situation(item: TrafficAlertItem): string {
  if (item.kind === 'closer') return item.status === 'warning' ? `Annäherung auf unter ${TRAFFIC_NEAR_M / 1000} km` : 'Annäherung'
  return item.status === 'warning' ? `Tiefflug in unter ${TRAFFIC_NEAR_M / 1000} km` : 'Tiefflug im Umkreis'
}

/** Eine Zeile je Luftfahrzeug, z. B. „CHX12 (EC35, Hubschrauber) – Tiefflug in unter 3 km: 320 m ü. Grund, 2.4 km NO“ */
export function formatTrafficAlertLine(item: TrafficAlertItem, heightIsAgl: boolean): string {
  return `${describeItem(item)} – ${situation(item)}: ${formatAlertHeight(item, heightIsAgl)}, ${formatDistance(item.distanceM)} ${item.direction}`
}

export function trafficAlertTitle(alert: TrafficAlert): string {
  const n = alert.items.length
  const what = n === 1 ? (alert.items[0].isRotorcraft ? 'Hubschrauber' : 'Luftfahrzeug') : `${n} Luftfahrzeuge`
  return alert.status === 'warning' ? `${what} im Tiefflug in der Nähe` : `${what} im Tiefflug im Umkreis`
}

/** Text für das automatisch angelegte Ereignis (Flugphase + PDF) */
export function formatTrafficAlertEvent(alert: TrafficAlert, duringFlight: boolean): string {
  const header = `ADS-B: ${trafficAlertTitle(alert)}${duringFlight ? ' (während eines Flugs)' : ''}`
  return [header, ...alert.items.map((i) => `• ${formatTrafficAlertLine(i, alert.heightIsAgl)}`)].join('\n')
}
