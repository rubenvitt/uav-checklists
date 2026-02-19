import type { QueryClient } from '@tanstack/react-query'
import type { DroneId } from '../types/drone'
import type { WeatherResponse } from '../types/weather'
import type { NearbyCategory } from '../services/overpassApi'
import type { ArcClass } from '../components/ArcDetermination'
import { getDroneById } from '../data/drones'
import { getMission } from './missionStorage'
import { computeAssessment } from './assessment'
import { generateReport, type ReportData, type EinsatzdetailsData } from './generateReport'

const PREFIX = 'uav-form:'
const TTL = 56 * 60 * 60 * 1000

interface StoredEntry<T> {
  value: T
  timestamp: number
}

function readMissionField<T>(missionId: string, key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${PREFIX}${missionId}:${key}`)
    if (!raw) return fallback
    const entry: StoredEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > TTL) return fallback
    return entry.value
  } catch {
    return fallback
  }
}

function readManualLocation(missionId: string): { latitude: number; longitude: number; name: string } | null {
  try {
    const raw = localStorage.getItem(`uav-manual-location:${missionId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number' && typeof parsed.name === 'string') {
      return parsed
    }
  } catch { /* ignore */ }
  return null
}

const GRC_TABLE: Record<string, Record<string, number>> = {
  vlos: { sparse: 2, dense: 4, crowd: 7 },
  bvlos: { sparse: 3, dense: 5, crowd: 8 },
}

function computeGrc(missionId: string): number | null {
  const controlledGround = readMissionField<boolean | null>(missionId, 'grc:controlledGround', null)
  const flightType = readMissionField<'vlos' | 'bvlos' | null>(missionId, 'grc:flightType', null)
  const areaType = readMissionField<'sparse' | 'dense' | 'crowd' | null>(missionId, 'grc:areaType', null)
  const strategicMitigation = readMissionField(missionId, 'grc:strategicMitigation', false)
  const emergencyPlan = readMissionField(missionId, 'grc:emergencyPlan', false)

  const intrinsicGrc = controlledGround === true
    ? 1
    : controlledGround === false && flightType && areaType
      ? GRC_TABLE[flightType][areaType]
      : null

  if (intrinsicGrc === null) return null
  const mitigationSum = (strategicMitigation ? 1 : 0) + (emergencyPlan ? 1 : 0)
  return Math.max(1, intrinsicGrc - mitigationSum)
}

function computeArc(missionId: string): ArcClass | null {
  const reservedAirspace = readMissionField<boolean | null>(missionId, 'arc:reservedAirspace', null)
  const riskFlight = readMissionField<boolean | null>(missionId, 'arc:riskFlight', null)
  const nearAirfield = readMissionField<'no' | 'yes_without' | 'yes_with' | null>(missionId, 'arc:nearAirfield', null)
  const under150m = readMissionField<boolean | null>(missionId, 'arc:under150m', null)
  const uncontrolledAirspace = readMissionField<boolean | null>(missionId, 'arc:uncontrolledAirspace', null)
  const areaType = readMissionField<'rural' | 'urban' | null>(missionId, 'arc:areaType', null)

  if (reservedAirspace === true) {
    if (riskFlight === true) return 'c-star'
    if (riskFlight === false) return 'a'
  } else if (reservedAirspace === false) {
    if (nearAirfield === 'yes_without') return 'cd'
    if (nearAirfield === 'yes_with') return 'b'
    if (nearAirfield === 'no') {
      if (under150m === false) return 'cd'
      if (under150m === true) {
        if (uncontrolledAirspace === false) return 'cd'
        if (uncontrolledAirspace === true) {
          if (areaType === 'rural') return 'a'
          if (areaType === 'urban') return 'b'
        }
      }
    }
  }
  return null
}

function computeSail(grc: number, arc: ArcClass): number {
  const isArcA = arc === 'a'
  if (grc < 3) return isArcA ? 1 : 2
  if (grc === 3) return 2
  if (grc === 4) return 3
  return 4
}

export function generateMissionReport(missionId: string, queryClient: QueryClient) {
  const mission = getMission(missionId)
  if (!mission) return

  const droneId = readMissionField<DroneId>(missionId, 'selectedDrone', 'matrice-350-rtk')
  const maxAltitude = readMissionField<number>(missionId, 'maxAltitude', 120)
  const manualChecks = readMissionField<Record<string, boolean>>(missionId, 'nearby:manualChecks', {})
  const drone = getDroneById(droneId)

  const grc = computeGrc(missionId)
  const arc = computeArc(missionId)
  const sail = grc !== null && arc !== null ? computeSail(grc, arc) : null

  // Resolve location name
  const manualLoc = readManualLocation(missionId)
  let locationName = 'Unbekannt'
  let lat: number | null = null
  let lon: number | null = null

  if (manualLoc) {
    locationName = manualLoc.name.split(',').slice(0, 2).map(p => p.trim()).join(', ')
    lat = manualLoc.latitude
    lon = manualLoc.longitude
  }

  // Try to get geocode data from TanStack Query cache
  if (lat !== null && lon !== null) {
    const geocodeData = queryClient.getQueryData<{ city: string; country: string }>(['geocode', lat, lon])
    if (geocodeData?.city) {
      locationName = geocodeData.country
        ? `${geocodeData.city}, ${geocodeData.country}`
        : geocodeData.city
    }
  }

  // Get nearby data from cache
  let categories: NearbyCategory[] = []
  if (lat !== null && lon !== null) {
    const roundedLat = Math.round(lat * 1000) / 1000
    const roundedLon = Math.round(lon * 1000) / 1000
    categories = queryClient.getQueryData<NearbyCategory[]>(['nearby', roundedLat, roundedLon]) ?? []
  }

  // Get weather + kindex from cache for assessment
  let assessment = null
  if (lat !== null && lon !== null) {
    const roundedLat = Math.round(lat * 1000) / 1000
    const roundedLon = Math.round(lon * 1000) / 1000
    const weatherData = queryClient.getQueryData<WeatherResponse>(['weather', roundedLat, roundedLon, maxAltitude])
    const kIndexData = queryClient.getQueryData<{ kIndex: number }>(['kindex'])

    if (weatherData?.current && kIndexData?.kIndex != null) {
      assessment = computeAssessment(weatherData.current, kIndexData.kIndex, drone, weatherData.windByAltitude ?? undefined, maxAltitude)
    }
  }

  const FLUG_ANLASS_LABELS: Record<string, string> = {
    einsatz: 'Einsatz',
    uebung: 'Übung',
    ausbildung: 'Ausbildung',
    testflug: 'Testflug/Wartung',
  }

  const flugAnlassRaw = readMissionField<string>(missionId, 'flugAnlass', 'einsatz')
  const einsatzdetails: EinsatzdetailsData = {
    flugAnlass: FLUG_ANLASS_LABELS[flugAnlassRaw] ?? flugAnlassRaw,
    einsatzstichwort: readMissionField<string>(missionId, 'einsatzstichwort', ''),
    alarmzeit: readMissionField<string>(missionId, 'alarmzeit', ''),
    alarmierungDurch: readMissionField<string>(missionId, 'alarmierungDurch', ''),
    anforderndeStelle: readMissionField<string>(missionId, 'anforderndeStelle', ''),
    einsatzleiter: readMissionField<string>(missionId, 'einsatzleiter', ''),
    abschnittsleiter: readMissionField<string>(missionId, 'abschnittsleiter', ''),
  }

  const data: ReportData = {
    missionLabel: mission.label,
    einsatzdetails,
    location: locationName,
    drone,
    maxAltitude,
    categories,
    manualChecks,
    grc,
    arc,
    sail,
    assessment,
  }

  generateReport(data)
}
