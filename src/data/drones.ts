import type { DroneId, DroneSpec } from '../types/drone'

export const drones: DroneSpec[] = [
  {
    id: 'matrice-350-rtk',
    name: 'DJI Matrice 350 RTK',
    maxWindSpeed: 43,
    maxWindResistance: 6,
    minTemp: -20,
    maxTemp: 50,
    ipRating: 'IP55',
    maxAltitude: 7000,
    weight: 6470,
    payloadSlots: 3,
    maxPayload: 2730,
  },
  {
    id: 'matrice-200',
    name: 'DJI Matrice 200',
    maxWindSpeed: 43,
    maxWindResistance: 6,
    minTemp: -20,
    maxTemp: 45,
    ipRating: 'IP43',
    maxAltitude: 3000,
    weight: 3800,
    payloadSlots: 1,
    maxPayload: 2000,
  },
]

export function getDroneById(id: DroneId): DroneSpec {
  const drone = drones.find((d) => d.id === id)
  if (!drone) {
    throw new Error(`Drone not found: ${id}`)
  }
  return drone
}
