import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router'
import { PiShieldCheck } from 'react-icons/pi'
import { useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MissionProvider, useMissionId } from './context/MissionContext'
import { getMission, isMissionExpired, updateMissionPhase, canAccessPhase } from './utils/missionStorage'
import { clearMissionEnvironment } from './hooks/useMissionEnvironment'
import { useTheme } from './hooks/useTheme'
import { migrateOldData } from './utils/migration'
import type { MissionPhase } from './types/mission'
import Header from './components/Header'
import MissionOverview from './components/MissionOverview'
import MissionStepper from './components/MissionStepper'
import EinsatzdatenPhase from './components/EinsatzdatenPhase'
import VorflugkontrollePhase from './components/VorflugkontrollePhase'
import FluegePhase from './components/FluegePhase'
import NachbereitungPhase from './components/NachbereitungPhase'

function OverviewLayout() {
  const { setting: themeSetting, cycle: cycleTheme } = useTheme(null)

  return (
    <div className="min-h-screen bg-base text-text">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Header
          mode="overview"
          themeSetting={themeSetting}
          onCycleTheme={cycleTheme}
        />
        <MissionOverview />
        <footer className="flex items-center justify-center gap-1.5 py-6 text-[11px] text-text-muted/40">
          <PiShieldCheck className="text-sm" />
          Alle Daten bleiben lokal auf deinem Gerät.
        </footer>
      </div>
    </div>
  )
}

function MissionLayout() {
  const { missionId, phase } = useParams<{ missionId: string; phase: string }>()

  if (!missionId || !phase) return <Navigate to="/" replace />

  const mission = getMission(missionId)
  if (!mission || isMissionExpired(mission)) return <Navigate to="/" replace />

  const validPhases: MissionPhase[] = ['einsatzdaten', 'vorflugkontrolle', 'fluege', 'nachbereitung']
  if (!validPhases.includes(phase as MissionPhase)) return <Navigate to="/" replace />

  // Completed missions can only be viewed on the nachbereitung phase
  if (mission.completedAt && phase !== 'nachbereitung') {
    return <Navigate to={`/mission/${missionId}/nachbereitung`} replace />
  }

  const currentPhase = phase as MissionPhase

  // Phase access guard: redirect to last accessible phase if target is locked
  if (!mission.completedAt && !canAccessPhase(missionId, currentPhase)) {
    const redirectPhase = currentPhase === 'nachbereitung' && canAccessPhase(missionId, 'fluege')
      ? 'fluege'
      : 'vorflugkontrolle'
    return <Navigate to={`/mission/${missionId}/${redirectPhase}`} replace />
  }

  // Update stored phase (skip for completed missions)
  if (!mission.completedAt && mission.phase !== currentPhase) {
    updateMissionPhase(missionId, currentPhase)
  }

  return (
    <MissionProvider missionId={missionId}>
      <MissionLayoutInner
        missionLabel={mission.label}
        currentPhase={currentPhase}
        isCompleted={!!mission.completedAt}
      />
    </MissionProvider>
  )
}

function MissionLayoutInner({ missionLabel, currentPhase, isCompleted }: {
  missionLabel: string
  currentPhase: MissionPhase
  isCompleted: boolean
}) {
  const missionId = useMissionId()
  const queryClient = useQueryClient()
  const { setting: themeSetting, cycle: cycleTheme } = useTheme(null)
  const exportPdfRef = useRef<(() => void) | null>(null)

  const setExportPdf = useCallback((fn: () => void) => {
    exportPdfRef.current = fn
  }, [])

  const handleRefresh = useCallback(() => {
    clearMissionEnvironment(missionId)
    queryClient.removeQueries({ queryKey: ['weather'] })
    queryClient.removeQueries({ queryKey: ['kindex'] })
    queryClient.removeQueries({ queryKey: ['nearby'] })
    queryClient.invalidateQueries({ queryKey: ['geocode'] })
  }, [missionId, queryClient])

  return (
    <div className="min-h-screen bg-base text-text">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Header
          mode="mission"
          missionLabel={missionLabel}
          themeSetting={themeSetting}
          onCycleTheme={cycleTheme}
          onRefresh={isCompleted ? undefined : handleRefresh}
          onExportPdf={currentPhase === 'vorflugkontrolle' ? () => exportPdfRef.current?.() : undefined}
        />
        {!isCompleted && <MissionStepper currentPhase={currentPhase} />}
        {currentPhase === 'einsatzdaten' && <EinsatzdatenPhase />}
        {currentPhase === 'vorflugkontrolle' && (
          <VorflugkontrollePhase setExportPdf={setExportPdf} />
        )}
        {currentPhase === 'fluege' && <FluegePhase />}
        {currentPhase === 'nachbereitung' && <NachbereitungPhase />}
        <footer className="flex items-center justify-center gap-1.5 py-6 text-[11px] text-text-muted/40">
          <PiShieldCheck className="text-sm" />
          Alle Daten bleiben lokal auf deinem Gerät.
        </footer>
      </div>
    </div>
  )
}

export default function AppRouter() {
  useEffect(() => {
    migrateOldData()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OverviewLayout />} />
        <Route path="/mission/:missionId/:phase" element={<MissionLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
