import { useState, useCallback, useEffect, useRef } from 'react'
import type { DroneId } from '../types/drone'
import { getDroneById } from '../data/drones'
import { useMissionId } from '../context/MissionContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { useWeather } from '../hooks/useWeather'
import { useKIndex } from '../hooks/useKIndex'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { useNearbyCheck } from '../hooks/useNearbyCheck'
import { useMissionPersistedState, clearMissionFormStorageByPrefix } from '../hooks/useMissionPersistedState'
import { readStorage } from '../hooks/usePersistedState'
import { computeAssessment } from '../utils/assessment'
import type { ArcClass } from './ArcDetermination'
import { generateReport, type ReportData, type EinsatzdetailsData, type TruppstaerkeData, type EinsatzauftragData } from '../utils/generateReport'
import { getMission } from '../utils/missionStorage'
import RahmenangabenSection from './sections/RahmenangabenSection'
import ExternalToolsSection from './sections/ExternalToolsSection'
import NearbyCheckSection from './sections/NearbyCheckSection'
import AnmeldungenSection from './sections/AnmeldungenSection'
import RiskClassSection from './sections/RiskClassSection'
import WeatherSection from './sections/WeatherSection'

interface VorflugkontrollePhaseProps {
  setExportPdf: (fn: () => void) => void
}

export default function VorflugkontrollePhase({ setExportPdf }: VorflugkontrollePhaseProps) {
  const missionId = useMissionId()
  const [selectedDrone, setSelectedDrone] = useMissionPersistedState<DroneId>('selectedDrone', 'matrice-350-rtk')
  const [maxAltitude, setMaxAltitude] = useMissionPersistedState<number>('maxAltitude', 120)
  const geo = useGeolocation(missionId)
  const nearby = useNearbyCheck(geo.latitude, geo.longitude)
  const weather = useWeather(geo.latitude, geo.longitude, maxAltitude)

  // Lifted state for PDF report
  const [soraData, setSoraData] = useState<{ grc: number | null; arc: ArcClass | null; sail: number | null }>({ grc: null, arc: null, sail: null })
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({})
  const handleSoraChange = useCallback((data: { grc: number | null; arc: ArcClass | null; sail: number | null }) => setSoraData(data), [])
  const handleManualChecksChange = useCallback((checked: Record<string, boolean>) => setManualChecks(checked), [])

  // Reset SORA when location changes significantly (~1.1 km)
  const locationKey = geo.latitude !== null && geo.longitude !== null
    ? `${geo.latitude.toFixed(2)},${geo.longitude.toFixed(2)}`
    : ''
  const [soraResetKey, setSoraResetKey] = useState(0)
  const prevLocationRef = useRef(locationKey)
  useEffect(() => {
    if (prevLocationRef.current && locationKey && prevLocationRef.current !== locationKey) {
      clearMissionFormStorageByPrefix('grc:', missionId)
      clearMissionFormStorageByPrefix('arc:', missionId)
      setSoraResetKey((k) => k + 1)
    }
    prevLocationRef.current = locationKey
  }, [locationKey, missionId])

  const kIndex = useKIndex()
  const geocode = useReverseGeocode(geo.latitude, geo.longitude)

  const drone = getDroneById(selectedDrone)
  const assessment =
    weather.current && kIndex.kIndex !== null
      ? computeAssessment(weather.current, kIndex.kIndex, drone, weather.windByAltitude ?? undefined, maxAltitude)
      : null

  const hasLocation = geo.latitude !== null && geo.longitude !== null

  // Register PDF export handler
  useEffect(() => {
    setExportPdf(() => {
      const mission = getMission(missionId)
      const locationName = geo.isManual && geo.manualName
        ? geo.manualName.split(',').slice(0, 2).map(p => p.trim()).join(', ')
        : geocode.city
          ? geocode.country ? `${geocode.city}, ${geocode.country}` : geocode.city
          : 'Unbekannt'
      const FLUG_ANLASS_LABELS: Record<string, string> = {
        einsatz: 'Einsatz',
        uebung: 'Übung',
        ausbildung: 'Ausbildung',
        testflug: 'Testflug/Wartung',
      }
      const flugAnlassRaw = readStorage<string>('flugAnlass', 'einsatz', missionId)
      const einsatzdetails: EinsatzdetailsData = {
        flugAnlass: FLUG_ANLASS_LABELS[flugAnlassRaw] ?? flugAnlassRaw,
        einsatzstichwort: readStorage<string>('einsatzstichwort', '', missionId),
        alarmzeit: readStorage<string>('alarmzeit', '', missionId),
        alarmierungDurch: readStorage<string>('alarmierungDurch', '', missionId),
        anforderndeStelle: readStorage<string>('anforderndeStelle', '', missionId),
        einsatzleiter: readStorage<string>('einsatzleiter', '', missionId),
        abschnittsleiter: readStorage<string>('abschnittsleiter', '', missionId),
      }

      // Truppstärke
      const crewFk = readStorage<string>('crew_fk', '', missionId)
      const crewFp = readStorage<string>('crew_fp', '', missionId)
      const crewLrb = readStorage<string>('crew_lrb', '', missionId)
      const crewBa = readStorage<string>('crew_ba', '', missionId)
      const crewAdditional = readStorage<Array<{ role: string; name: string }>>('crew_additional', [], missionId)
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
      const missionTemplate = readStorage<string>('mission_template', '', missionId)
      const missionFreitext = readStorage<string>('mission_freitext', '', missionId)
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
          const v = readStorage<string>(f.key, '', missionId)
          if (v) auftragDetails.push({ label: f.label, value: v })
        }
      }
      const einsatzauftrag: EinsatzauftragData | undefined = missionTemplate
        ? { template: TEMPLATE_LABELS[missionTemplate] || missionTemplate, details: auftragDetails, freitext: missionFreitext }
        : undefined

      // Fluganmeldungen
      const anmeldungenChecked = readStorage<Record<string, boolean>>('anmeldungen:checked', {}, missionId)
      const anmeldungenAdditional = readStorage<Array<{ label: string; detail: string }>>('anmeldungen:additional', [], missionId)
      const anmeldungenItems: Array<{ label: string; detail: string; checked: boolean }> = [
        { label: 'Leitstelle', detail: '19222', checked: !!anmeldungenChecked['leitstelle'] },
        { label: 'Polizei', detail: '110', checked: !!anmeldungenChecked['polizei'] },
      ]
      const hasRailway = nearby.categories.some((c: { key: string }) => c.key === 'railway')
      const hasWaterway = nearby.categories.some((c: { key: string }) => c.key === 'waterway')
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

      // Map snapshot from Einsatzdaten phase
      const mapImage = readStorage<string>('einsatzkarte:snapshot', '', missionId)

      const data: ReportData = {
        missionLabel: mission?.label,
        einsatzdetails,
        truppstaerke,
        einsatzauftrag,
        anmeldungen: anmeldungenItems,
        mapImage: mapImage || undefined,
        location: locationName,
        drone,
        maxAltitude,
        categories: nearby.categories,
        manualChecks,
        grc: soraData.grc,
        arc: soraData.arc,
        sail: soraData.sail,
        assessment,
      }
      generateReport(data)
    })
  }) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <RahmenangabenSection
        selectedDrone={selectedDrone}
        onSelectDrone={setSelectedDrone}
        maxAltitude={maxAltitude}
        onChangeAltitude={setMaxAltitude}
      />
      <ExternalToolsSection latitude={geo.latitude} longitude={geo.longitude} locked={!hasLocation} />
      <NearbyCheckSection categories={nearby.categories} loading={nearby.loading} error={nearby.error} locked={!hasLocation} onManualChecksChange={handleManualChecksChange} />
      <AnmeldungenSection categories={nearby.categories} />
      <RiskClassSection key={soraResetKey} locked={!hasLocation} onSoraChange={handleSoraChange} />
      <WeatherSection
        assessment={assessment}
        sun={weather.sun}
        windByAltitude={weather.windByAltitude}
        hourlyForecast={weather.hourlyForecast}
        maxAltitude={maxAltitude}
        drone={drone}
        isLoading={geo.loading || weather.loading || kIndex.loading}
        error={weather.error || kIndex.error}
        locked={!hasLocation}
      />
    </>
  )
}
