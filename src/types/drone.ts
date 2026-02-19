export type DroneId = 'matrice-350-rtk' | 'matrice-200'

export interface DroneSpec {
  id: DroneId
  name: string
  maxWindSpeed: number       // km/h
  maxWindResistance: number  // Beaufort scale level for reference
  minTemp: number            // °C
  maxTemp: number            // °C
  ipRating: string | null    // e.g. "IP55", null if none
  maxAltitude: number        // m above sea level
  weight: number             // g
}
