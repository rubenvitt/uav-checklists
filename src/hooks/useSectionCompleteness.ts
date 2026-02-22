import { useStore } from '@tanstack/react-store'
import { useMissionId } from '../context/MissionContext'
import { getMissionAtom } from '../stores/missionFormStore'
import type { SectionConfig } from './useAutoExpand'
import { AUFSTIEGSORT_ITEMS, UAV_ITEMS, RC_ITEMS } from '../components/sections/TechnischeKontrolleSections'
import { FLUGBRIEFING_ITEMS } from '../components/sections/FlugbriefingSection'

// Helper: check if all items in a checklist are checked
function allChecked(checked: Record<string, boolean> | undefined, items: ReadonlyArray<{ readonly key: string }>): boolean {
  if (!checked) return false
  return items.every(item => !!checked[item.key])
}

// --- Phase 1: Einsatzdaten ---

export function useEinsatzdatenCompleteness(): SectionConfig[] {
  const missionId = useMissionId()
  const atom = getMissionAtom(missionId)

  const state = useStore(atom, (s: Record<string, unknown>) => ({
    flugAnlass: s['flugAnlass'] as string | undefined,
    einsatzstichwort: s['einsatzstichwort'] as string | undefined,
    missionTemplate: s['mission_template'] as string | undefined,
    crewFk: s['crew_fk'] as string | undefined,
    crewFp: s['crew_fp'] as string | undefined,
    crewLrb: s['crew_lrb'] as string | undefined,
    karteSnapshot: s['einsatzkarte:snapshot'] as string | undefined,
    kartePhoto: s['einsatzkarte:photo'] as string | undefined,
    briefingChecked: s['briefing:checked'] as Record<string, boolean> | undefined,
  }))

  const BRIEFING_KEYS = ['auftrag', 'priorisierung', 'rollen', 'aufgaben', 'kommunikation']

  return [
    {
      id: 'einsatzdetails',
      isComplete: !!(state.flugAnlass && state.einsatzstichwort),
      firstVisitOpen: true,
    },
    {
      id: 'einsatzauftrag',
      isComplete: !!state.missionTemplate,
      firstVisitOpen: true,
    },
    {
      id: 'truppstaerke',
      isComplete: !!(state.crewFk && state.crewFp && state.crewLrb),
    },
    {
      id: 'einsatzkarte',
      isComplete: !!(state.karteSnapshot || state.kartePhoto),
    },
    {
      id: 'missionsbriefing',
      isComplete: state.briefingChecked
        ? BRIEFING_KEYS.every(k => !!state.briefingChecked![k])
        : false,
    },
  ]
}

// --- Phase 2: Vorflugkontrolle ---

export function useVorflugkontrolleCompleteness(
  weatherWarning: boolean,
  nearbyWarning: boolean,
  hasLocation: boolean,
): SectionConfig[] {
  const missionId = useMissionId()
  const atom = getMissionAtom(missionId)

  const state = useStore(atom, (s: Record<string, unknown>) => ({
    anmeldungenChecked: s['anmeldungen:checked'] as Record<string, boolean> | undefined,
    anmeldungenAdditional: s['anmeldungen:additional'] as Array<{ label: string; detail: string }> | undefined,
    aufstiegsortChecked: s['techcheck:aufstiegsort'] as Record<string, boolean> | undefined,
    uavChecked: s['techcheck:uav'] as Record<string, boolean> | undefined,
    rcChecked: s['techcheck:rc'] as Record<string, boolean> | undefined,
    flugbriefingChecked: s['flugbriefing:checked'] as Record<string, boolean> | undefined,
    flugfreigabe: s['flugfreigabe'] as string | null | undefined,
  }))

  // Anmeldungen: at least leitstelle + polizei must be checked
  const anmeldungenComplete = !!(
    state.anmeldungenChecked?.['leitstelle'] &&
    state.anmeldungenChecked?.['polizei']
  )

  return [
    {
      id: 'externaltools',
      isComplete: false, // always incomplete (just links)
      locked: !hasLocation,
    },
    {
      id: 'nearbycheck',
      isComplete: !nearbyWarning,
      hasWarning: nearbyWarning,
      locked: !hasLocation,
    },
    {
      id: 'anmeldungen',
      isComplete: anmeldungenComplete,
    },
    {
      id: 'riskclass',
      isComplete: false, // handled by SORA state in parent — simplified: always incomplete until SAIL computed
      locked: !hasLocation,
    },
    {
      id: 'weather',
      isComplete: !weatherWarning,
      hasWarning: weatherWarning,
      locked: !hasLocation,
      firstVisitOpen: true,
    },
    {
      id: 'aufstiegsort',
      isComplete: allChecked(state.aufstiegsortChecked, AUFSTIEGSORT_ITEMS),
    },
    {
      id: 'uavcheck',
      isComplete: allChecked(state.uavChecked, UAV_ITEMS),
    },
    {
      id: 'remotecontroller',
      isComplete: allChecked(state.rcChecked, RC_ITEMS),
    },
    {
      id: 'flugbriefing',
      isComplete: allChecked(state.flugbriefingChecked, FLUGBRIEFING_ITEMS),
    },
    {
      id: 'funktionskontrolle',
      isComplete: !!state.flugfreigabe,
    },
  ]
}

// --- Phase 4: Nachbereitung ---

export function useNachbereitungCompleteness(): SectionConfig[] {
  const missionId = useMissionId()
  const atom = getMissionAtom(missionId)

  const POST_FLIGHT_KEYS = [
    'motoren', 'uav_beschaedigung', 'ueberwarmung', 'akkus',
    'rotoren', 'payload', 'fernbedienung', 'kabel',
  ]

  // Minimum set of always-present wrapup items (rueckbau + dokumentation)
  const WRAPUP_CORE_KEYS = [
    'datensicherung', 'flugbuecher',
    'uav_eingepackt', 'akkus_verstaut', 'fernbedienungen_verstaut',
    'zubehoer_eingepackt', 'einsatzstelle_aufgeraeumt',
  ]

  const state = useStore(atom, (s: Record<string, unknown>) => ({
    postflightChecked: s['postflight:checked'] as Record<string, boolean> | undefined,
    wrapupChecked: s['wrapup:checked'] as Record<string, boolean> | undefined,
    resultOutcome: s['result:outcome'] as string | null | undefined,
  }))

  return [
    {
      id: 'postflightinspection',
      isComplete: state.postflightChecked
        ? POST_FLIGHT_KEYS.every(k => !!state.postflightChecked![k])
        : false,
      firstVisitOpen: true,
    },
    {
      id: 'flightdisruptions',
      isComplete: true, // optional section
    },
    {
      id: 'einsatzabschluss',
      isComplete: state.wrapupChecked
        ? WRAPUP_CORE_KEYS.every(k => !!state.wrapupChecked![k])
        : false,
    },
    {
      id: 'wartungpflege',
      isComplete: true, // optional section
    },
    {
      id: 'missionresult',
      isComplete: !!state.resultOutcome,
    },
  ]
}
