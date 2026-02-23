import type { QueryClient } from '@tanstack/react-query'
import type { DroneId, DroneSpec } from '../types/drone'
import type { WeatherResponse } from '../types/weather'
import type { NearbyCategory } from '../services/overpassApi'
import type { ArcClass } from '../components/ArcDetermination'
import type { FlightLogEntry, EventNote } from '../types/flightLog'
import type { AssessmentResult } from '../types/assessment'
import { getDroneById } from '../data/drones'
import { getMission, getSegments, getActiveSegment } from './missionStorage'
import { buildMissionLabel, readManualLocationName } from './missionLabel'
import { computeAssessment } from './assessment'
import { generateReport, type ReportData, type SegmentReportData, type EinsatzdetailsData, type TruppstaerkeData, type EinsatzauftragData, type AnmeldungItem, type ChecklistGroupData, type PostFlightInspectionData, type PostFlightInspectionItem, type DisruptionsData, type MissionResultData, type EinsatzabschlussData, type EinsatzabschlussItem, type WartungPflegeData, type WartungPflegeItem } from './generateReport'
import { computeFollowupSuggestions, type FollowupContext } from './followupSuggestions'
import { AUFSTIEGSORT_ITEMS, UAV_ITEMS, RC_ITEMS } from '../components/sections/TechnischeKontrolleSections'
import { FLUGBRIEFING_ITEMS } from '../components/sections/FlugbriefingSection'
import { FUNKTIONS_ITEMS } from '../components/sections/FunktionskontrolleSection'

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

/**
 * Read a segment-specific field.
 * `legacyFallback` controls whether we fall back to the non-prefixed key.
 * Only the FIRST segment (or legacy missions without segments) should use
 * the legacy fallback — otherwise every segment would read the same data
 * from the old key when its own segment-key doesn't exist yet.
 */
function readSegmentField<T>(missionId: string, segmentId: string | null, key: string, fallback: T, legacyFallback: boolean = true): T {
  if (segmentId) {
    const segValue = readMissionField<T>(missionId, `seg:${segmentId}:${key}`, undefined as unknown as T)
    if (segValue !== undefined) return segValue
    if (!legacyFallback) return fallback
  }
  return readMissionField<T>(missionId, key, fallback)
}

function readManualLocation(missionId: string): { latitude: number; longitude: number; name: string } | null {
  try {
    const raw = localStorage.getItem(`uav-manual-location:${missionId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number' && typeof parsed.name === 'string') {
        return parsed
      }
    }
  } catch { /* ignore */ }

  // Fallback: try first segment key
  const segments = getSegments(missionId)
  if (segments.length > 0) {
    return readManualLocationSeg(missionId, segments[0].id)
  }

  return null
}

function readManualLocationSeg(missionId: string, segmentId: string): { latitude: number; longitude: number; name: string } | null {
  try {
    const raw = localStorage.getItem(`uav-manual-location:${missionId}:seg:${segmentId}`)
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

function computeGrc(missionId: string, segmentId: string | null = null, legacyFallback: boolean = true): number | null {
  const controlledGround = readSegmentField<boolean | null>(missionId, segmentId, 'grc:controlledGround', null, legacyFallback)
  const flightType = readSegmentField<'vlos' | 'bvlos' | null>(missionId, segmentId, 'grc:flightType', null, legacyFallback)
  const areaType = readSegmentField<'sparse' | 'dense' | 'crowd' | null>(missionId, segmentId, 'grc:areaType', null, legacyFallback)
  const strategicMitigation = readSegmentField(missionId, segmentId, 'grc:strategicMitigation', false, legacyFallback)
  const emergencyPlan = readSegmentField(missionId, segmentId, 'grc:emergencyPlan', false, legacyFallback)

  const intrinsicGrc = controlledGround === true
    ? 1
    : controlledGround === false && flightType && areaType
      ? GRC_TABLE[flightType][areaType]
      : null

  if (intrinsicGrc === null) return null
  const mitigationSum = (strategicMitigation ? 1 : 0) + (emergencyPlan ? 1 : 0)
  return Math.max(1, intrinsicGrc - mitigationSum)
}

function computeArc(missionId: string, segmentId: string | null = null, legacyFallback: boolean = true): ArcClass | null {
  const reservedAirspace = readSegmentField<boolean | null>(missionId, segmentId, 'arc:reservedAirspace', null, legacyFallback)
  const riskFlight = readSegmentField<boolean | null>(missionId, segmentId, 'arc:riskFlight', null, legacyFallback)
  const nearAirfield = readSegmentField<'no' | 'yes_without' | 'yes_with' | null>(missionId, segmentId, 'arc:nearAirfield', null, legacyFallback)
  const under150m = readSegmentField<boolean | null>(missionId, segmentId, 'arc:under150m', null, legacyFallback)
  const uncontrolledAirspace = readSegmentField<boolean | null>(missionId, segmentId, 'arc:uncontrolledAirspace', null, legacyFallback)
  const areaType = readSegmentField<'rural' | 'urban' | null>(missionId, segmentId, 'arc:areaType', null, legacyFallback)

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

/* ── Helpers for collecting segment-specific data ─────────────────── */

interface SegmentCollectedData {
  locationName: string
  lat: number | null
  lon: number | null
  categories: NearbyCategory[]
  manualChecks: Record<string, boolean>
  assessment: AssessmentResult | null
  persistedWeather: WeatherResponse | null
  grc: number | null
  arc: ArcClass | null
  sail: number | null
  anmeldungenItems: AnmeldungItem[]
  anmeldungenChecked: Record<string, boolean>
  anmeldungenAdditional: Array<{ label: string; detail: string }>
  mapImage: string
  flugfreigabe: string | null
  checklistGroups: ChecklistGroupData[]
  flightLog: FlightLogEntry[]
  eventNotes: EventNote[]
}

function collectSegmentData(
  missionId: string,
  segId: string | null,
  drone: DroneSpec,
  maxAltitude: number,
  persistedKIndex: { kIndex: number } | null,
  allFlightLog: FlightLogEntry[],
  allEventNotes: EventNote[],
  queryClient: QueryClient,
  /** Only the first segment (or legacy) may fall back to non-prefixed keys */
  isFirstSegment: boolean = true,
): SegmentCollectedData {
  const legacy = isFirstSegment
  const manualChecks = readSegmentField<Record<string, boolean>>(missionId, segId, 'nearby:manualChecks', {}, legacy)

  const grc = computeGrc(missionId, segId, legacy)
  const arc = computeArc(missionId, segId, legacy)
  const sail = grc !== null && arc !== null ? computeSail(grc, arc) : null

  // Resolve location name — only fall back to legacy key for first segment
  const manualLoc = segId
    ? readManualLocationSeg(missionId, segId) ?? (legacy ? readManualLocation(missionId) : null)
    : readManualLocation(missionId)
  let locationName = 'Unbekannt'
  let lat: number | null = null
  let lon: number | null = null

  if (manualLoc) {
    locationName = manualLoc.name.split(',').slice(0, 2).map(p => p.trim()).join(', ')
    lat = manualLoc.latitude
    lon = manualLoc.longitude
  }

  // Try geocode cache
  if (lat !== null && lon !== null) {
    const geocodeData = queryClient.getQueryData<{ city: string; country: string }>(['geocode', lat, lon])
    if (geocodeData?.city) {
      locationName = geocodeData.country
        ? `${geocodeData.city}, ${geocodeData.country}`
        : geocodeData.city
    }
  }

  // Nearby data
  const persistedNearby = readSegmentField<NearbyCategory[] | null>(missionId, segId, 'env:nearby', null, legacy)
  let categories: NearbyCategory[] = persistedNearby ?? []
  if (categories.length === 0 && lat !== null && lon !== null) {
    const roundedLat = Math.round(lat * 1000) / 1000
    const roundedLon = Math.round(lon * 1000) / 1000
    categories = queryClient.getQueryData<NearbyCategory[]>(['nearby', roundedLat, roundedLon]) ?? []
  }

  // Weather assessment
  let assessment: AssessmentResult | null = null
  const persistedWeather = readSegmentField<WeatherResponse | null>(missionId, segId, 'env:weather', null, legacy)

  if (persistedWeather?.current && persistedKIndex?.kIndex != null) {
    assessment = computeAssessment(persistedWeather.current, persistedKIndex.kIndex, drone, persistedWeather.windByAltitude ?? undefined, maxAltitude)
  } else if (lat !== null && lon !== null) {
    const roundedLat = Math.round(lat * 1000) / 1000
    const roundedLon = Math.round(lon * 1000) / 1000
    const weatherData = queryClient.getQueryData<WeatherResponse>(['weather', roundedLat, roundedLon, maxAltitude])
    const kIndexData = queryClient.getQueryData<{ kIndex: number }>(['kindex'])
    if (weatherData?.current && kIndexData?.kIndex != null) {
      assessment = computeAssessment(weatherData.current, kIndexData.kIndex, drone, weatherData.windByAltitude ?? undefined, maxAltitude)
    }
  }

  // Anmeldungen
  const anmeldungenChecked = readSegmentField<Record<string, boolean>>(missionId, segId, 'anmeldungen:checked', {}, legacy)
  const anmeldungenAdditional = readSegmentField<Array<{ label: string; detail: string }>>(missionId, segId, 'anmeldungen:additional', [], legacy)
  const anmeldungenItems: AnmeldungItem[] = [
    { label: 'Leitstelle', detail: '19222', checked: !!anmeldungenChecked['leitstelle'] },
    { label: 'Polizei', detail: '110', checked: !!anmeldungenChecked['polizei'] },
  ]
  const hasRailway = categories.some((c) => c.key === 'railway')
  const hasWaterway = categories.some((c) => c.key === 'waterway')
  if (hasRailway) {
    anmeldungenItems.push({ label: 'Bahn (DB Netz)', detail: 'Bahnlinien im Einsatzgebiet', checked: !!anmeldungenChecked['bahn'] })
  }
  if (hasWaterway) {
    anmeldungenItems.push({ label: 'Wasserstraßen- und Schifffahrtsamt', detail: 'Wasserstraßen im Einsatzgebiet', checked: !!anmeldungenChecked['wsa'] })
  }
  for (let i = 0; i < anmeldungenAdditional.length; i++) {
    const a = anmeldungenAdditional[i]
    if (a.label.trim() || a.detail.trim()) {
      anmeldungenItems.push({ label: a.label || 'Weitere Stelle', detail: a.detail, checked: !!anmeldungenChecked[`custom_${i}`] })
    }
  }

  // Map image
  const karteMode = readSegmentField<'map' | 'photo'>(missionId, segId, 'einsatzkarte:mode', 'map', legacy)
  const mapImage = karteMode === 'photo'
    ? readSegmentField<string>(missionId, segId, 'einsatzkarte:photo', '', legacy)
    : readSegmentField<string>(missionId, segId, 'einsatzkarte:snapshot', '', legacy)

  // Flugfreigabe
  const flugfreigabe = readSegmentField<string | null>(missionId, segId, 'flugfreigabe', null, legacy)

  // Checklist groups (segment-scoped: aufstiegsort, flugbriefing, funktionstest)
  const aufstiegsortChecked = readSegmentField<Record<string, boolean>>(missionId, segId, 'techcheck:aufstiegsort', {}, legacy)
  const flugbriefingChecked = readSegmentField<Record<string, boolean>>(missionId, segId, 'flugbriefing:checked', {}, legacy)
  const funktionstestChecked = readSegmentField<Record<string, boolean>>(missionId, segId, 'techcheck:funktionstest', {}, legacy)

  const checklistGroups: ChecklistGroupData[] = [
    {
      title: 'Aufstiegsort',
      items: AUFSTIEGSORT_ITEMS.map((i) => ({ label: i.label, checked: !!aufstiegsortChecked[i.key] })),
    },
    {
      title: 'Flugbriefing',
      items: FLUGBRIEFING_ITEMS.map((i) => ({ label: i.label, checked: !!flugbriefingChecked[i.key] })),
    },
    {
      title: 'Funktionskontrolle (3 m Aufstieg)',
      items: FUNKTIONS_ITEMS.map((i) => ({ label: i.label, checked: !!funktionstestChecked[i.key] })),
    },
  ]

  // Flight log & events filtered by segment
  const flightLog = segId
    ? allFlightLog.filter(f => f.segmentId === segId)
    : allFlightLog
  const eventNotes = segId
    ? allEventNotes.filter(e => e.segmentId === segId)
    : allEventNotes

  return {
    locationName,
    lat,
    lon,
    categories,
    manualChecks,
    assessment,
    persistedWeather,
    grc,
    arc,
    sail,
    anmeldungenItems,
    anmeldungenChecked,
    anmeldungenAdditional,
    mapImage,
    flugfreigabe,
    checklistGroups,
    flightLog,
    eventNotes,
  }
}

export function generateMissionReport(missionId: string, queryClient: QueryClient) {
  const mission = getMission(missionId)
  if (!mission) return

  const droneId = readMissionField<DroneId>(missionId, 'selectedDrone', 'matrice-350-rtk')
  const maxAltitude = readMissionField<number>(missionId, 'maxAltitude', 120)
  const drone = getDroneById(droneId)
  const persistedKIndex = readMissionField<{ kIndex: number } | null>(missionId, 'env:kindex', null)

  // All flight log entries & events (will be filtered per segment)
  const allFlightLog = readMissionField<FlightLogEntry[]>(missionId, 'flightlog:entries', [])
  const allEventNotes = readMissionField<EventNote[]>(missionId, 'flightlog:events', [])

  // Determine segments
  const segments = getSegments(missionId)
  const isMultiSegment = segments.length > 1

  // For single-segment or legacy missions, use active segment (backward compatible)
  const activeSegment = getActiveSegment(missionId)
  const primarySegId = activeSegment?.id ?? null

  // Collect segment data
  let segmentReportDataList: SegmentReportData[] | undefined
  let primaryData: SegmentCollectedData

  if (isMultiSegment) {
    segmentReportDataList = segments.map((seg, idx) => {
      const sd = collectSegmentData(missionId, seg.id, drone, maxAltitude, persistedKIndex, allFlightLog, allEventNotes, queryClient, idx === 0)
      return {
        label: seg.label || `Standort ${idx + 1}`,
        locationName: seg.locationName,
        location: sd.locationName,
        categories: sd.categories,
        manualChecks: sd.manualChecks,
        assessment: sd.assessment,
        grc: sd.grc,
        arc: sd.arc,
        sail: sd.sail,
        anmeldungen: sd.anmeldungenItems,
        mapImage: sd.mapImage || undefined,
        flugfreigabe: sd.flugfreigabe,
        checklistGroups: sd.checklistGroups,
        flightLog: sd.flightLog.length > 0 ? sd.flightLog : undefined,
        eventNotes: sd.eventNotes.length > 0 ? sd.eventNotes : undefined,
      }
    })
    // Use the first segment as primary data for legacy top-level fields
    primaryData = collectSegmentData(missionId, segments[0].id, drone, maxAltitude, persistedKIndex, allFlightLog, allEventNotes, queryClient, true)
  } else {
    // Single segment or legacy: no segments array needed
    primaryData = collectSegmentData(missionId, primarySegId, drone, maxAltitude, persistedKIndex, allFlightLog, allEventNotes, queryClient, true)
  }

  // Global checklist groups: UAV and RC checks (mission-scoped, not segment-scoped)
  const uavChecked = readMissionField<Record<string, boolean>>(missionId, 'techcheck:uav', {})
  const rcChecked = readMissionField<Record<string, boolean>>(missionId, 'techcheck:rc', {})
  const globalChecklistGroups: ChecklistGroupData[] = [
    {
      title: 'UAV',
      items: UAV_ITEMS.map((i) => ({ label: i.label, checked: !!uavChecked[i.key] })),
    },
    {
      title: 'Remote Controller (A und B)',
      items: RC_ITEMS.map((i) => ({ label: i.label, checked: !!rcChecked[i.key] })),
    },
  ]

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

  // Truppstärke
  const crewFk = readMissionField<string>(missionId, 'crew_fk', '')
  const crewFp = readMissionField<string>(missionId, 'crew_fp', '')
  const crewLrb = readMissionField<string>(missionId, 'crew_lrb', '')
  const crewBa = readMissionField<string>(missionId, 'crew_ba', '')
  const crewAdditional = readMissionField<Array<{ role: string; name: string }>>(missionId, 'crew_additional', [])
  const CREW_ROLE_LABELS: Record<string, string> = {
    fernpilot: 'Fernpilot',
    luftraumbeobachter: 'Luftraumbeobachter',
    bildauswerter: 'Bildauswerter',
  }
  const crewMembers: Array<{ role: string; name: string }> = []
  if (crewFk.trim()) crewMembers.push({ role: 'Führungskraft', name: crewFk })
  if (crewFp.trim()) crewMembers.push({ role: 'Fernpilot', name: crewFp })
  if (crewLrb.trim()) crewMembers.push({ role: 'Luftraumbeobachter', name: crewLrb })
  if (crewBa.trim()) crewMembers.push({ role: 'Bildauswerter', name: crewBa })
  for (const m of crewAdditional) {
    if (m.name.trim()) {
      crewMembers.push({ role: CREW_ROLE_LABELS[m.role] || m.role, name: m.name })
    }
  }
  const fkCount = crewFk.trim() ? 1 : 0
  const othersCount = [crewFp, crewLrb, crewBa].filter(n => n.trim()).length + crewAdditional.filter(m => m.name.trim()).length
  const truppstaerke: TruppstaerkeData | undefined = crewMembers.length > 0
    ? { members: crewMembers, summary: `${fkCount}/${othersCount}//${fkCount + othersCount}` }
    : undefined

  // Einsatzauftrag
  const missionTemplate = readMissionField<string>(missionId, 'mission_template', '')
  const missionFreitext = readMissionField<string>(missionId, 'mission_freitext', '')
  const TEMPLATE_LABELS: Record<string, string> = {
    personensuche: 'Personensuche',
    erkundung: 'Erkundung',
    transport: 'Transport',
    ueberwachung: 'Überwachung',
    custom: 'Sonstiges',
  }
  const auftragDetails: Array<{ label: string; value: string }> = []
  const templateFields: Record<string, Array<{ key: string; label: string }>> = {
    personensuche: [
      { key: 'mission_person_name', label: 'Name / Beschreibung' },
      { key: 'mission_person_alter', label: 'Alter' },
      { key: 'mission_person_geschlecht', label: 'Geschlecht' },
      { key: 'mission_person_position', label: 'Letzte bekannte Position' },
      { key: 'mission_person_kleidung', label: 'Kleidung / Merkmale' },
      { key: 'mission_person_vermisst_seit', label: 'Seit wann vermisst' },
    ],
    erkundung: [
      { key: 'mission_erkundung_gebiet', label: 'Erkundungsgebiet / -objekt' },
      { key: 'mission_erkundung_art', label: 'Art der Erkundung' },
    ],
    transport: [
      { key: 'mission_transport_gut', label: 'Transportgut' },
      { key: 'mission_transport_ziel', label: 'Zielort' },
    ],
    ueberwachung: [
      { key: 'mission_ueberwachung_objekt', label: 'Überwachungsobjekt / -gebiet' },
      { key: 'mission_ueberwachung_dauer', label: 'Dauer / Intervall' },
    ],
  }
  const fields = templateFields[missionTemplate]
  if (fields) {
    for (const f of fields) {
      const v = readMissionField<string>(missionId, f.key, '')
      if (v) auftragDetails.push({ label: f.label, value: v })
    }
  }
  const einsatzauftrag: EinsatzauftragData | undefined = missionTemplate
    ? { template: TEMPLATE_LABELS[missionTemplate] || missionTemplate, details: auftragDetails, freitext: missionFreitext }
    : undefined

  // Nachflugkontrolle
  const postflightChecked = readMissionField<Record<string, boolean>>(missionId, 'postflight:checked', {})
  const postflightNotes = readMissionField<Record<string, string>>(missionId, 'postflight:notes', {})
  const postflightRemarks = readMissionField<string>(missionId, 'postflight:remarks', '')

  const POST_FLIGHT_LABELS: Array<{ key: string; label: string }> = [
    { key: 'motoren', label: 'Motoren laufen gleichmäßig aus' },
    { key: 'uav_beschaedigung', label: 'UAV auf Beschädigungen prüfen' },
    { key: 'ueberwarmung', label: 'Überwärmung prüfen' },
    { key: 'akkus', label: 'Akkus auf Beschädigungen prüfen' },
    { key: 'rotoren', label: 'Rotoren auf Beschädigungen prüfen' },
    { key: 'payload', label: 'Payload auf Beschädigungen prüfen' },
    { key: 'fernbedienung', label: 'Fernbedienungen auf Schäden prüfen' },
    { key: 'kabel', label: 'Verbindungskabel sauber' },
  ]

  // Störungen & Vorfälle
  const disruptionsNone = readMissionField<boolean>(missionId, 'disruptions:none', false)
  const disruptionsCategories = readMissionField<string[]>(missionId, 'disruptions:categories', [])
  const disruptionsNotes = readMissionField<Record<string, string>>(missionId, 'disruptions:notes', {})

  const DISRUPTION_LABELS: Record<string, string> = {
    wetter: 'Wetter',
    technik: 'Technik',
    funk: 'Funk / Jamming',
    gps: 'GPS',
    luftverkehr: 'Luftverkehr',
    sonstiges: 'Sonstiges',
  }

  const disruptions: DisruptionsData | undefined = (disruptionsNone || disruptionsCategories.length > 0)
    ? {
        noDisruptions: disruptionsNone,
        categories: disruptionsCategories.map(key => ({
          key,
          label: DISRUPTION_LABELS[key] || key,
          note: disruptionsNotes[key]?.trim() || '',
        })),
      }
    : undefined

  // Ergebnis
  const resultOutcome = readMissionField<'erfolgreich' | 'erfolglos' | 'abgebrochen' | null>(missionId, 'result:outcome', null)
  const resultAbortReason = readMissionField<string>(missionId, 'result:abortReason', '')
  const resultAbortNotes = readMissionField<string>(missionId, 'result:abortNotes', '')

  // Einsatzabschluss
  const wrapupChecked = readMissionField<Record<string, boolean>>(missionId, 'wrapup:checked', {})
  const wrapupNotes = readMissionField<Record<string, string>>(missionId, 'wrapup:notes', {})
  const wrapupFeedback = readMissionField<string>(missionId, 'wrapup:feedback', '')

  // Build abmeldung items from ALL segments' anmeldungen
  const ABMELDUNG_LABEL_MAP: Record<string, string> = {
    leitstelle: 'Abmeldung Leitstelle',
    polizei: 'Abmeldung Polizei',
    bahn: 'Abmeldung Bahn (DB Netz)',
    wsa: 'Abmeldung WSA',
  }
  const abmeldungItems: EinsatzabschlussItem[] = []

  // Collect abmeldungen from all segments (or primary data for legacy)
  const abmeldungSources = isMultiSegment
    ? segments.map((seg, idx) => {
        const sd = collectSegmentData(missionId, seg.id, drone, maxAltitude, persistedKIndex, allFlightLog, allEventNotes, queryClient, idx === 0)
        return { segLabel: seg.label, checked: sd.anmeldungenChecked, additional: sd.anmeldungenAdditional }
      })
    : [{ segLabel: '', checked: primaryData.anmeldungenChecked, additional: primaryData.anmeldungenAdditional }]

  // Build a deduplicated abmeldung list across segments
  const seenAbmeldungKeys = new Set<string>()
  for (const source of abmeldungSources) {
    const prefix = isMultiSegment && source.segLabel ? `${source.segLabel}: ` : ''
    const registeredKeys = Object.entries(source.checked).filter(([, v]) => v).map(([k]) => k)
    for (const key of registeredKeys) {
      if (key.startsWith('custom_')) {
        const idx = parseInt(key.split('_')[1], 10)
        const custom = source.additional[idx]
        if (custom?.label) {
          const dedupeKey = `custom:${custom.label}`
          if (seenAbmeldungKeys.has(dedupeKey)) continue
          seenAbmeldungKeys.add(dedupeKey)
          const itemKey = `abmeldung_${key}`
          abmeldungItems.push({
            label: `${prefix}Abmeldung ${custom.label}`,
            checked: !!wrapupChecked[itemKey],
            note: wrapupNotes[itemKey]?.trim() || undefined,
          })
        }
      } else if (ABMELDUNG_LABEL_MAP[key]) {
        if (seenAbmeldungKeys.has(key)) continue
        seenAbmeldungKeys.add(key)
        const itemKey = `abmeldung_${key}`
        abmeldungItems.push({
          label: `${prefix}${ABMELDUNG_LABEL_MAP[key]}`,
          checked: !!wrapupChecked[itemKey],
          note: wrapupNotes[itemKey]?.trim() || undefined,
        })
      }
    }
  }

  // Dokumentation items
  const hasDisruptionsForReport = !disruptionsNone && disruptionsCategories.length > 0
  const hasAbnormalLanding = allFlightLog.some(e => e.landungStatus !== 'ok')
  const dokumentationItemKeys = ['datensicherung', 'flugbuecher']
  if (hasDisruptionsForReport || hasAbnormalLanding) {
    dokumentationItemKeys.push('ereignismeldung_bfu')
  }
  const DOKU_LABELS: Record<string, string> = {
    datensicherung: 'Datensicherung durchgeführt',
    flugbuecher: 'Flugbücher aktualisiert',
    ereignismeldung_bfu: 'Ereignis-/Unfallmeldung BFU',
  }
  const dokumentationItems: EinsatzabschlussItem[] = dokumentationItemKeys.map(key => ({
    label: DOKU_LABELS[key],
    checked: !!wrapupChecked[key],
  }))

  // Rückbau items
  const RUECKBAU_KEYS = ['uav_eingepackt', 'akkus_verstaut', 'fernbedienungen_verstaut', 'zubehoer_eingepackt', 'einsatzstelle_aufgeraeumt']
  const RUECKBAU_LABELS: Record<string, string> = {
    uav_eingepackt: `UAV eingepackt (${drone.name})`,
    akkus_verstaut: 'Akkus entfernt und sicher verstaut',
    fernbedienungen_verstaut: 'Fernbedienungen verstaut',
    zubehoer_eingepackt: 'Zubehör und Payload eingepackt',
    einsatzstelle_aufgeraeumt: 'Einsatzstelle aufgeräumt',
  }
  const rueckbauItems: EinsatzabschlussItem[] = RUECKBAU_KEYS.map(key => ({
    label: RUECKBAU_LABELS[key],
    checked: !!wrapupChecked[key],
  }))

  const hasWrapupData = Object.keys(wrapupChecked).length > 0 || wrapupFeedback.trim()
  const einsatzabschluss: EinsatzabschlussData | undefined = hasWrapupData
    ? { abmeldungen: abmeldungItems, dokumentation: dokumentationItems, rueckbau: rueckbauItems, feedback: wrapupFeedback }
    : undefined

  // Wartung & Pflege — use active segment's weather for followup context
  const followupDismissed = readMissionField<string[]>(missionId, 'followup:dismissed', [])
  const followupCustom = readMissionField<Array<{ id: string; label: string; isCustom: true }>>(missionId, 'followup:custom', [])

  let followupWeatherCurrent: FollowupContext['weatherCurrent'] = null
  let followupHumidityStatus: FollowupContext['humidityStatus'] = null

  if (primaryData.persistedWeather?.current) {
    followupWeatherCurrent = {
      precipitation: primaryData.persistedWeather.current.precipitation,
      temperature: primaryData.persistedWeather.current.temperature,
      humidity: primaryData.persistedWeather.current.humidity,
    }
    if (primaryData.assessment) {
      const humidityMetric = primaryData.assessment.metrics.find(m => m.key === 'humidity')
      if (humidityMetric) followupHumidityStatus = humidityMetric.status
    }
  }

  const followupCtx: FollowupContext = {
    postflightNotes,
    weatherCurrent: followupWeatherCurrent,
    humidityStatus: followupHumidityStatus,
    droneIpRating: drone.ipRating,
    droneName: drone.name,
    flightEntries: allFlightLog,
    disruptionCategories: disruptionsCategories,
    disruptionsNone,
  }

  const allSuggestions = computeFollowupSuggestions(followupCtx)
  const visibleSuggestions = allSuggestions.filter(s => !followupDismissed.includes(s.id))

  const wartungItems: WartungPflegeItem[] = [
    ...visibleSuggestions.map(s => ({
      label: s.label,
      source: `${s.source.sourcePhase}: ${s.source.label}`,
      isCustom: false,
    })),
    ...followupCustom.map(c => ({
      label: c.label,
      isCustom: true,
    })),
  ]

  const wartungPflege: WartungPflegeData | undefined = wartungItems.length > 0
    ? { items: wartungItems }
    : undefined

  const missionResult: MissionResultData | undefined = resultOutcome
    ? {
        outcome: resultOutcome,
        abortReason: resultOutcome === 'abgebrochen' && resultAbortReason ? resultAbortReason : undefined,
        abortNotes: resultOutcome === 'abgebrochen' && resultAbortNotes ? resultAbortNotes : undefined,
      }
    : undefined

  const hasPostflight = Object.keys(postflightChecked).length > 0 || postflightRemarks.trim()
  const postFlightInspection: PostFlightInspectionData | undefined = hasPostflight
    ? {
        items: POST_FLIGHT_LABELS.map((item): PostFlightInspectionItem => ({
          label: item.label,
          checked: !!postflightChecked[item.key],
          note: postflightNotes[item.key]?.trim() || undefined,
        })),
        remarks: postflightRemarks,
      }
    : undefined

  const data: ReportData = {
    missionLabel: buildMissionLabel({
      anlass: flugAnlassRaw,
      stichwort: readMissionField<string>(missionId, 'einsatzstichwort', ''),
      template: missionTemplate,
      location: readManualLocationName(missionId),
      flightCount: allFlightLog.length,
      createdAt: mission.createdAt,
    }),
    einsatzdetails,
    truppstaerke,
    einsatzauftrag,
    // Legacy top-level fields (from primary/first segment for backward compatibility)
    anmeldungen: primaryData.anmeldungenItems,
    mapImage: primaryData.mapImage || undefined,
    location: primaryData.locationName,
    drone,
    maxAltitude,
    categories: primaryData.categories,
    manualChecks: primaryData.manualChecks,
    grc: primaryData.grc,
    arc: primaryData.arc,
    sail: primaryData.sail,
    assessment: primaryData.assessment,
    checklistGroups: [...(primaryData.checklistGroups ?? []), ...globalChecklistGroups],
    flugfreigabe: primaryData.flugfreigabe,
    flightLog: allFlightLog.length > 0 ? allFlightLog : undefined,
    eventNotes: allEventNotes.length > 0 ? allEventNotes : undefined,
    disruptions,
    postFlightInspection,
    einsatzabschluss,
    wartungPflege,
    missionResult,
    // Multi-segment data (only present when >1 segment)
    segments: segmentReportDataList,
  }

  return generateReport(data)
}
