import type { MetricStatus } from '../types/assessment'
import type { FlightTrafficSnapshot, TrafficAircraft, TrafficAircraftAssessment, TrafficAssessment } from '../types/traffic'
import { TRAFFIC_LOW_LEVEL_M, TRAFFIC_NEAR_M, evaluateTrafficAircraft } from '../data/thresholds'

const FT_TO_M = 0.3048
const STATUS_RANK: Record<MetricStatus, number> = { good: 0, caution: 1, warning: 2 }

export const EMERGENCY_LABELS: Record<string, string> = {
  general: 'Luftnotlage (7700)',
  lifeguard: 'Ambulanz-/Rettungsflug',
  minfuel: 'Treibstoffmangel',
  nordo: 'Funkausfall (7600)',
  unlawful: 'Widerrechtlicher Eingriff (7500)',
  downed: 'Luftfahrzeug abgestürzt',
}

/**
 * Höhe über Grund in m. Ohne Geländehöhe wird die Höhe über NN geliefert —
 * das überschätzt die Höhe über Grund und wird in der UI entsprechend gekennzeichnet.
 */
export function estimateHeightM(aircraft: TrafficAircraft, elevationM: number | null): number | null {
  if (aircraft.onGround) return 0
  if (aircraft.altitudeFt === null) return null
  const mslM = aircraft.altitudeFt * FT_TO_M
  return Math.round(elevationM !== null ? mslM - elevationM : mslM)
}

export function assessTraffic(snapshot: FlightTrafficSnapshot, elevationM: number | null): TrafficAssessment {
  const items: TrafficAircraftAssessment[] = snapshot.aircraft.map((aircraft) => {
    const heightM = estimateHeightM(aircraft, elevationM)
    let status = evaluateTrafficAircraft(aircraft.distanceM, heightM, aircraft.onGround)
    // Notfälle und Rettungsflüge im Umkreis immer hervorheben
    if (aircraft.emergency && !aircraft.onGround && status === 'good') status = 'caution'
    return { aircraft, status, heightM }
  })

  const airborne = items.filter((i) => !i.aircraft.onGround)
  const lowLevel = airborne.filter((i) => i.heightM === null || i.heightM <= TRAFFIC_LOW_LEVEL_M)
  const overall = items.reduce<MetricStatus>(
    (worst, i) => (STATUS_RANK[i.status] > STATUS_RANK[worst] ? i.status : worst),
    'good',
  )

  const recommendations: string[] = []
  const nearLowLevel = lowLevel.filter((i) => i.aircraft.distanceM <= TRAFFIC_NEAR_M)
  if (nearLowLevel.length > 0) {
    recommendations.push(
      `Tieffliegender Verkehr in unter ${TRAFFIC_NEAR_M / 1000} km: Start zurückstellen bzw. UAS sofort absenken, bis das Luftfahrzeug abgeflogen ist.`,
    )
  } else if (lowLevel.length > 0) {
    recommendations.push('Tieffliegender Verkehr im Umkreis: Luftraumbeobachter auf die gemeldeten Richtungen einweisen.')
  }
  if (lowLevel.some((i) => i.aircraft.isRotorcraft)) {
    recommendations.push('Hubschrauber im Tiefflug (ggf. RTH/Polizei): Rücksprache mit der Leitstelle halten und Flugbetrieb bei Annäherung unterbrechen.')
  }
  if (airborne.some((i) => i.aircraft.emergency)) {
    recommendations.push('Ein Luftfahrzeug meldet einen Not- oder Rettungsflug: mit erhöhter Aktivität im Luftraum rechnen.')
  }
  if (lowLevel.some((i) => i.aircraft.isMilitary)) {
    recommendations.push('Militärischer Verkehr in niedriger Höhe: Luftraumbeobachtung verstärken.')
  }

  return {
    overall,
    items,
    airborneCount: airborne.length,
    lowLevelCount: lowLevel.length,
    nearestLowLevel: lowLevel[0] ?? null,
    heightIsAgl: elevationM !== null,
    recommendations,
  }
}

export function aircraftLabel(aircraft: TrafficAircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.hex.toUpperCase()
}

export function formatSnapshotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
