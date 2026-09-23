import type { DroneId, DroneSpec } from '../types/drone'
import type { PayloadId, PayloadSpec, PayloadType } from '../types/payload'

export const payloads: PayloadSpec[] = [
  // DJI Matrice 350 RTK
  {
    id: 'zenmuse-h20',
    name: 'Zenmuse H20',
    type: 'kamera',
    description: 'Zoom + Weitwinkel',
    weight: 678,
    compatibleDrones: ['matrice-350-rtk'],
  },
  {
    id: 'zenmuse-h20t',
    name: 'Zenmuse H20T',
    type: 'thermal',
    description: 'Zoom + Weitwinkel + Wärmebild',
    weight: 828,
    compatibleDrones: ['matrice-350-rtk'],
  },
  {
    id: 'zenmuse-h20n',
    name: 'Zenmuse H20N',
    type: 'thermal',
    description: 'Nachtsicht + Wärmebild',
    weight: 878,
    compatibleDrones: ['matrice-350-rtk'],
  },
  {
    id: 'zenmuse-h30',
    name: 'Zenmuse H30',
    type: 'kamera',
    description: 'Zoom + Weitwinkel + LRF + NIR',
    weight: 920,
    compatibleDrones: ['matrice-350-rtk'],
  },
  {
    id: 'zenmuse-h30t',
    name: 'Zenmuse H30T',
    type: 'thermal',
    description: 'Zoom + Weitwinkel + LRF + Wärmebild',
    weight: 920,
    compatibleDrones: ['matrice-350-rtk'],
  },
  {
    id: 'zenmuse-s1',
    name: 'Zenmuse S1',
    type: 'scheinwerfer',
    description: 'Scheinwerfer',
    weight: 760,
    compatibleDrones: ['matrice-350-rtk'],
  },
  // DJI Matrice 200
  {
    id: 'zenmuse-z30',
    name: 'Zenmuse Z30',
    type: 'kamera',
    description: 'Tele/Zoom (30× optisch)',
    weight: 556,
    compatibleDrones: ['matrice-200'],
  },
  {
    id: 'zenmuse-xt2',
    name: 'Zenmuse XT2',
    type: 'thermal',
    description: 'Wärmebild/Nachtsicht (FLIR + 4K)',
    weight: 588,
    compatibleDrones: ['matrice-200'],
  },
  {
    id: 'zenmuse-xt2-25mm',
    name: 'Zenmuse XT2 (25 mm)',
    type: 'thermal',
    description: 'Wärmebild/Nachtsicht (FLIR + 4K), 25-mm-Objektiv',
    weight: 629,
    compatibleDrones: ['matrice-200'],
  },
]

export const PAYLOAD_TYPE_LABELS: Record<PayloadType, string> = {
  kamera: 'Kamera',
  thermal: 'Wärmebild',
  scheinwerfer: 'Scheinwerfer',
}

export function getPayloadById(id: PayloadId): PayloadSpec | undefined {
  return payloads.find((p) => p.id === id)
}

export function getPayloadsForDrone(droneId: DroneId): PayloadSpec[] {
  return payloads.filter((p) => p.compatibleDrones.includes(droneId))
}

/** Löst IDs in Specs auf; unbekannte IDs (z. B. aus älteren Datenständen) werden übersprungen. */
export function resolvePayloads(ids: readonly PayloadId[] | undefined): PayloadSpec[] {
  return (ids ?? []).flatMap((id) => {
    const p = getPayloadById(id)
    return p ? [p] : []
  })
}

/** Entfernt inkompatible/unbekannte/doppelte Payloads und kürzt auf die Slot-Anzahl der Drohne. */
export function sanitizePayloadSelection(drone: DroneSpec, ids: readonly PayloadId[] | undefined): PayloadId[] {
  const compatible = [...new Set(ids ?? [])].filter((id) => getPayloadById(id)?.compatibleDrones.includes(drone.id))
  return compatible.slice(0, drone.payloadSlots)
}

/**
 * Schaltet einen Payload an/ab. Bei nur einem Slot (M200) ersetzt die Auswahl
 * den bisherigen Payload; bei mehreren Slots wird ergänzt, solange Slots frei sind.
 */
export function togglePayload(drone: DroneSpec, current: readonly PayloadId[], id: PayloadId): PayloadId[] {
  if (current.includes(id)) return current.filter((p) => p !== id)
  if (drone.payloadSlots <= 1) return [id]
  if (current.length >= drone.payloadSlots) return [...current]
  return [...current, id]
}

export function computePayloadWeight(ids: readonly PayloadId[] | undefined): number {
  return resolvePayloads(ids).reduce((sum, p) => sum + p.weight, 0)
}

export interface WeightSummary {
  emptyWeight: number
  payloadWeight: number
  totalWeight: number
  maxPayload: number
  overweight: boolean
}

export function computeWeightSummary(drone: DroneSpec, ids: readonly PayloadId[] | undefined): WeightSummary {
  const payloadWeight = computePayloadWeight(ids)
  return {
    emptyWeight: drone.weight,
    payloadWeight,
    totalWeight: drone.weight + payloadWeight,
    maxPayload: drone.maxPayload,
    overweight: payloadWeight > drone.maxPayload,
  }
}

export function formatWeight(grams: number): string {
  return `${grams.toLocaleString('de-DE')} g`
}

export function formatPayloadList(ids: readonly PayloadId[] | undefined): string {
  const specs = resolvePayloads(ids)
  return specs.length > 0 ? specs.map((p) => p.name).join(' + ') : 'Keine'
}
