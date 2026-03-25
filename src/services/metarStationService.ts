import { METAR_STATIONS } from '../data/metarStations'
import { evaluateMetarDistance } from '../data/thresholds'
import type { MetarStationInfo } from '../types/weather'
import { haversineDistance } from '../utils/geo'

const GERMANY_BOUNDS = {
  minLatitude: 47,
  maxLatitude: 55.2,
  minLongitude: 5.5,
  maxLongitude: 15.8,
}

function isWithinGermanCoverage(latitude: number, longitude: number): boolean {
  return latitude >= GERMANY_BOUNDS.minLatitude &&
    latitude <= GERMANY_BOUNDS.maxLatitude &&
    longitude >= GERMANY_BOUNDS.minLongitude &&
    longitude <= GERMANY_BOUNDS.maxLongitude
}

export function findNearestMetarStation(latitude: number, longitude: number): MetarStationInfo | null {
  if (!isWithinGermanCoverage(latitude, longitude)) return null

  let nearest = METAR_STATIONS[0]
  let nearestDistance = haversineDistance(latitude, longitude, nearest.latitude, nearest.longitude)

  for (let i = 1; i < METAR_STATIONS.length; i++) {
    const station = METAR_STATIONS[i]
    const distance = haversineDistance(latitude, longitude, station.latitude, station.longitude)
    if (distance < nearestDistance) {
      nearest = station
      nearestDistance = distance
    }
  }

  return {
    icao: nearest.icao,
    name: nearest.name,
    latitude: nearest.latitude,
    longitude: nearest.longitude,
    distanceMeters: Math.round(nearestDistance),
    status: evaluateMetarDistance(nearestDistance / 1000),
  }
}
