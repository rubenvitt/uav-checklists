import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router'
import { useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MissionProvider } from './context/MissionContext'
import { getMission, isMissionExpired, updateMissionPhase } from './utils/missionStorage'
import { useTheme } from './hooks/useTheme'
import { migrateOldData } from './utils/migration'
import type { MissionPhase } from './types/mission'
import Header from './components/Header'
import MissionOverview from './components/MissionOverview'
import MissionStepper from './components/MissionStepper'
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
      </div>
    </div>
  )
}

function MissionLayout() {
  const { missionId, phase } = useParams<{ missionId: string; phase: string }>()

  if (!missionId || !phase) return <Navigate to="/" replace />

  const mission = getMission(missionId)
  if (!mission || isMissionExpired(mission)) return <Navigate to="/" replace />

  const validPhases: MissionPhase[] = ['vorflugkontrolle', 'fluege', 'nachbereitung']
  if (!validPhases.includes(phase as MissionPhase)) return <Navigate to="/" replace />

  const currentPhase = phase as MissionPhase

  // Update stored phase
  if (mission.phase !== currentPhase) {
    updateMissionPhase(missionId, currentPhase)
  }

  return (
    <MissionProvider missionId={missionId}>
      <MissionLayoutInner
        missionLabel={mission.label}
        currentPhase={currentPhase}
      />
    </MissionProvider>
  )
}

function MissionLayoutInner({ missionLabel, currentPhase }: {
  missionLabel: string
  currentPhase: MissionPhase
}) {
  const queryClient = useQueryClient()
  const { setting: themeSetting, cycle: cycleTheme } = useTheme(null)
  const exportPdfRef = useRef<(() => void) | null>(null)

  const setExportPdf = useCallback((fn: () => void) => {
    exportPdfRef.current = fn
  }, [])

  return (
    <div className="min-h-screen bg-base text-text">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Header
          mode="mission"
          missionLabel={missionLabel}
          themeSetting={themeSetting}
          onCycleTheme={cycleTheme}
          onRefresh={() => queryClient.invalidateQueries()}
          onExportPdf={currentPhase === 'vorflugkontrolle' ? () => exportPdfRef.current?.() : undefined}
        />
        <MissionStepper currentPhase={currentPhase} />
        {currentPhase === 'vorflugkontrolle' && (
          <VorflugkontrollePhase setExportPdf={setExportPdf} />
        )}
        {currentPhase === 'fluege' && <FluegePhase />}
        {currentPhase === 'nachbereitung' && <NachbereitungPhase />}
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
