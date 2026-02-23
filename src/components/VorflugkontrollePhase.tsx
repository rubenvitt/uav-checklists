import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import type { DroneId } from '../types/drone'
import { getDroneById } from '../data/drones'
import { useMissionId } from '../context/MissionContext'
import { useSegmentId } from '../context/SegmentContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { useMissionWeather, useMissionKIndex, useMissionNearby } from '../hooks/useMissionEnvironment'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { useMissionPersistedState, clearMissionFormStorageByPrefix } from '../hooks/useMissionPersistedState'
import { readStorage } from '../hooks/usePersistedState'
import { computeAssessment } from '../utils/assessment'
import { useAutoExpand } from '../hooks/useAutoExpand'
import { useVorflugkontrolleCompleteness } from '../hooks/useSectionCompleteness'
import { useMissionSegment } from '../hooks/useMissionSegment'
import type { ArcClass } from './ArcDetermination'
import { generateReport, type ReportData, type EinsatzdetailsData, type TruppstaerkeData, type EinsatzauftragData, type ChecklistGroupData } from '../utils/generateReport'
import { getMission } from '../utils/missionStorage'
import LocationBar from './LocationBar'
import RelocationConfirmDialog from './RelocationConfirmDialog'
import SegmentBanner from './SegmentBanner'
import RahmenangabenSection from './sections/RahmenangabenSection'
import ExternalToolsSection from './sections/ExternalToolsSection'
import NearbyCheckSection from './sections/NearbyCheckSection'
import AnmeldungenSection from './sections/AnmeldungenSection'
import RiskClassSection from './sections/RiskClassSection'
import WeatherSection from './sections/WeatherSection'
import { AufstiegsortSection, UavCheckSection, RemoteControllerSection, AUFSTIEGSORT_ITEMS, UAV_ITEMS, RC_ITEMS } from './sections/TechnischeKontrolleSections'
import FlugbriefingSection, { FLUGBRIEFING_ITEMS } from './sections/FlugbriefingSection'
import FunktionskontrolleSection, { FUNKTIONS_ITEMS } from './sections/FunktionskontrolleSection'

interface VorflugkontrollePhaseProps {
  setGetPdfBlob: (fn: () => { blob: Blob; filename: string }) => void
}

export default function VorflugkontrollePhase({ setGetPdfBlob }: VorflugkontrollePhaseProps) {
  const missionId = useMissionId()
  const segmentId = useSegmentId()
  const queryClient = useQueryClient()
  const { segments, activeSegment, setLocationName, startRelocation } = useMissionSegment()
  const [showRelocationDialog, setShowRelocationDialog] = useState(false)
  const [selectedDrone, setSelectedDrone] = useMissionPersistedState<DroneId>('selectedDrone', 'matrice-350-rtk')
  const [maxAltitude, setMaxAltitude] = useMissionPersistedState<number>('maxAltitude', 120)
  const isFirstSegment = segments.length > 0 && activeSegment?.id === segments[0].id
  const geo = useGeolocation(missionId, segmentId, isFirstSegment)

  // Clear weather/nearby query cache when segment changes to avoid stale data
  const prevSegmentRef = useRef(segmentId)
  useEffect(() => {
    if (prevSegmentRef.current && segmentId && prevSegmentRef.current !== segmentId) {
      queryClient.removeQueries({ queryKey: ['weather'] })
      queryClient.removeQueries({ queryKey: ['nearby'] })
    }
    prevSegmentRef.current = segmentId
  }, [segmentId, queryClient])
  const nearby = useMissionNearby(geo.latitude, geo.longitude)
  const weather = useMissionWeather(geo.latitude, geo.longitude, maxAltitude)

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
      const prefix = segmentId ? `seg:${segmentId}:` : ''
      clearMissionFormStorageByPrefix(`${prefix}grc:`, missionId)
      clearMissionFormStorageByPrefix(`${prefix}arc:`, missionId)
      setSoraResetKey((k) => k + 1)
    }
    prevLocationRef.current = locationKey
  }, [locationKey, missionId, segmentId])

  const kIndex = useMissionKIndex()
  const geocode = useReverseGeocode(geo.latitude, geo.longitude)

  // Update segment location name from geocode
  useEffect(() => {
    if (segmentId && geocode.city) {
      const name = geocode.country ? `${geocode.city}, ${geocode.country}` : geocode.city
      setLocationName(segmentId, name)
    }
  }, [segmentId, geocode.city, geocode.country, setLocationName])

  const drone = getDroneById(selectedDrone)
  const assessment =
    weather.current && kIndex.kIndex !== null
      ? computeAssessment(weather.current, kIndex.kIndex, drone, weather.windByAltitude ?? undefined, maxAltitude)
      : null

  const hasLocation = geo.latitude !== null && geo.longitude !== null

  // Auto-expand logic
  const weatherWarning = assessment?.overall === 'warning'
  const nearbyWarning = nearby.categories?.some((c: { key: string }) =>
    ['aviation', 'military', 'prison'].includes(c.key)
  )
  const sections = useVorflugkontrolleCompleteness(!!weatherWarning, !!nearbyWarning, hasLocation)
  const { openState, toggle, continueToNext, isComplete } = useAutoExpand(sections, 'vorflugkontrolle')
  const navigate = useNavigate()
  const goToNextPhase = () => navigate(`/mission/${missionId}/fluege`)

  // Register PDF export handler
  useEffect(() => {
    setGetPdfBlob(() => {
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

      // Fluganmeldungen (segment-specific)
      const segPrefix = segmentId ? `seg:${segmentId}:` : ''
      const anmeldungenChecked = readStorage<Record<string, boolean>>(`${segPrefix}anmeldungen:checked`, {}, missionId)
      const anmeldungenAdditional = readStorage<Array<{ label: string; detail: string }>>(`${segPrefix}anmeldungen:additional`, [], missionId)
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

      // Map image from Einsatzdaten phase — mode decides source (segment-specific)
      const karteMode = readStorage<'map' | 'photo'>(`${segPrefix}einsatzkarte:mode`, 'map', missionId)
      const mapImage = karteMode === 'photo'
        ? readStorage<string>(`${segPrefix}einsatzkarte:photo`, '', missionId)
        : readStorage<string>(`${segPrefix}einsatzkarte:snapshot`, '', missionId)

      // Technische Vorflugkontrolle Checklisten (segment-specific where applicable)
      const aufstiegsortChecked = readStorage<Record<string, boolean>>(`${segPrefix}techcheck:aufstiegsort`, {}, missionId)
      const uavChecked = readStorage<Record<string, boolean>>('techcheck:uav', {}, missionId)
      const rcChecked = readStorage<Record<string, boolean>>('techcheck:rc', {}, missionId)
      const flugbriefingChecked = readStorage<Record<string, boolean>>(`${segPrefix}flugbriefing:checked`, {}, missionId)
      const funktionstestChecked = readStorage<Record<string, boolean>>(`${segPrefix}techcheck:funktionstest`, {}, missionId)
      const flugfreigabe = readStorage<string | null>(`${segPrefix}flugfreigabe`, null, missionId)

      const checklistGroups: ChecklistGroupData[] = [
        {
          title: 'Aufstiegsort',
          items: AUFSTIEGSORT_ITEMS.map((i) => ({ label: i.label, checked: !!aufstiegsortChecked[i.key] })),
        },
        {
          title: 'UAV',
          items: UAV_ITEMS.map((i) => ({ label: i.label, checked: !!uavChecked[i.key] })),
        },
        {
          title: 'Remote Controller (A und B)',
          items: RC_ITEMS.map((i) => ({ label: i.label, checked: !!rcChecked[i.key] })),
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
        checklistGroups,
        flugfreigabe,
      }
      return generateReport(data)
    })
  })

  return (
    <>
      <SegmentBanner
        segments={segments}
        activeSegment={activeSegment}
        onRelocate={() => setShowRelocationDialog(true)}
      />
      <LocationBar
        city={geocode.city}
        country={geocode.country}
        loading={geocode.loading}
        hasLocation={hasLocation}
        isManual={geo.isManual}
        manualName={geo.manualName}
        needsManualLocation={geo.needsManualLocation}
        onManualLocation={geo.setManualLocation}
        onClearManual={geo.clearManualLocation}
      />
      <RahmenangabenSection
        selectedDrone={selectedDrone}
        onSelectDrone={setSelectedDrone}
        maxAltitude={maxAltitude}
        onChangeAltitude={setMaxAltitude}
      />
      {/* Gruppen-Divider */}
      <div className="flex items-center gap-3 px-1 pt-2">
        <div className="h-px flex-1 bg-surface-alt" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted/60">Standortabhängige Prüfungen</span>
        <div className="h-px flex-1 bg-surface-alt" />
      </div>
      <ExternalToolsSection latitude={geo.latitude} longitude={geo.longitude} locked={!hasLocation} open={openState.externaltools} onToggle={() => toggle('externaltools')} isComplete={isComplete.externaltools} onContinue={() => continueToNext('externaltools')} />
      <NearbyCheckSection categories={nearby.categories} loading={nearby.loading} error={nearby.error} locked={!hasLocation} onManualChecksChange={handleManualChecksChange} open={openState.nearbycheck} onToggle={() => toggle('nearbycheck')} isComplete={isComplete.nearbycheck} onContinue={() => continueToNext('nearbycheck')} />
      <AnmeldungenSection categories={nearby.categories} open={openState.anmeldungen} onToggle={() => toggle('anmeldungen')} isComplete={isComplete.anmeldungen} onContinue={() => continueToNext('anmeldungen')} />
      <RiskClassSection key={soraResetKey} locked={!hasLocation} onSoraChange={handleSoraChange} open={openState.riskclass} onToggle={() => toggle('riskclass')} isComplete={isComplete.riskclass} onContinue={() => continueToNext('riskclass')} />
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
        open={openState.weather}
        onToggle={() => toggle('weather')}
        isComplete={isComplete.weather}
        onContinue={() => continueToNext('weather')}
      />
      <AufstiegsortSection open={openState.aufstiegsort} onToggle={() => toggle('aufstiegsort')} isComplete={isComplete.aufstiegsort} onContinue={() => continueToNext('aufstiegsort')} />
      <FlugbriefingSection open={openState.flugbriefing} onToggle={() => toggle('flugbriefing')} isComplete={isComplete.flugbriefing} onContinue={() => continueToNext('flugbriefing')} />
      {/* Gruppen-Divider */}
      <div className="flex items-center gap-3 px-1 pt-2">
        <div className="h-px flex-1 bg-surface-alt" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted/60">Geräteprüfungen</span>
        <div className="h-px flex-1 bg-surface-alt" />
      </div>
      <UavCheckSection open={openState.uavcheck} onToggle={() => toggle('uavcheck')} isComplete={isComplete.uavcheck} onContinue={() => continueToNext('uavcheck')} />
      <RemoteControllerSection open={openState.remotecontroller} onToggle={() => toggle('remotecontroller')} isComplete={isComplete.remotecontroller} onContinue={() => continueToNext('remotecontroller')} />
      {/* Gruppen-Divider */}
      <div className="flex items-center gap-3 px-1 pt-2">
        <div className="h-px flex-1 bg-surface-alt" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted/60">Funktionskontrolle & Freigabe</span>
        <div className="h-px flex-1 bg-surface-alt" />
      </div>
      <FunktionskontrolleSection
        open={openState.funktionskontrolle}
        onToggle={() => toggle('funktionskontrolle')}
        isComplete={isComplete.funktionskontrolle}
        onContinue={goToNextPhase}
        continueLabel="Weiter zu den Flügen"
        isPhaseComplete
      />
      <RelocationConfirmDialog
        open={showRelocationDialog}
        segmentNumber={segments.length + 1}
        onConfirm={(label) => {
          setShowRelocationDialog(false)
          startRelocation(label)
          navigate(`/mission/${missionId}/vorflugkontrolle`)
        }}
        onCancel={() => setShowRelocationDialog(false)}
      />
    </>
  )
}
