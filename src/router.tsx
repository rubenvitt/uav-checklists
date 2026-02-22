import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router'
import { PiShieldCheck, PiChatDots } from 'react-icons/pi'
import * as Sentry from '@sentry/react'
import { useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MissionProvider, useMissionId } from './context/MissionContext'
import { SegmentProvider } from './context/SegmentContext'
import { getMission, isMissionExpired, updateMissionPhase, canAccessPhase } from './utils/missionStorage'
import { useMissionSegment } from './hooks/useMissionSegment'
import { clearMissionEnvironment } from './hooks/useMissionEnvironment'
import { useTheme } from './hooks/useTheme'
import { migrateOldData, migrateLocationToSegment } from './utils/migration'
import type { MissionPhase } from './types/mission'
import Header from './components/Header'
import MissionOverview from './components/MissionOverview'
import MissionStepper from './components/MissionStepper'
import EinsatzdatenPhase from './components/EinsatzdatenPhase'
import VorflugkontrollePhase from './components/VorflugkontrollePhase'
import FluegePhase from './components/FluegePhase'
import NachbereitungPhase from './components/NachbereitungPhase'

function openFeedback() {
  const isDark = document.documentElement.classList.contains('dark')
  const feedback = Sentry.getFeedback()
  feedback?.createForm({ colorScheme: isDark ? 'dark' : 'light' }).then(form => { form.appendToDom(); form.open() })
}

function AppFooter() {
  return (
    <footer className="flex items-center justify-center gap-1.5 py-6 text-[11px] text-text-muted/40">
      <PiShieldCheck className="text-sm" />
      Alle Daten bleiben lokal auf deinem Gerät.
      <span className="mx-1">·</span>
      <button onClick={openFeedback} className="inline-flex items-center gap-1 hover:text-text-muted transition-colors">
        <PiChatDots className="text-sm" />
        Feedback
      </button>
    </footer>
  )
}

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
        <AppFooter />
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
  const { activeSegmentId, initializeSegment } = useMissionSegment()

  // Ensure default segment when entering vorflugkontrolle or fluege
  useEffect(() => {
    if ((currentPhase === 'vorflugkontrolle' || currentPhase === 'fluege') && !isCompleted) {
      initializeSegment()
    }
  }, [currentPhase, isCompleted, initializeSegment])

  const setExportPdf = useCallback((fn: () => void) => {
    exportPdfRef.current = fn
  }, [])

  const handleRefresh = useCallback(() => {
    clearMissionEnvironment(missionId, activeSegmentId)
    queryClient.removeQueries({ queryKey: ['weather'] })
    queryClient.removeQueries({ queryKey: ['kindex'] })
    queryClient.removeQueries({ queryKey: ['nearby'] })
    queryClient.invalidateQueries({ queryKey: ['geocode'] })
  }, [missionId, activeSegmentId, queryClient])

  return (
    <SegmentProvider segmentId={activeSegmentId}>
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
          <AppFooter />
        </div>
      </div>
    </SegmentProvider>
  )
}

export default function AppRouter() {
  useEffect(() => {
    migrateOldData()
    migrateLocationToSegment()
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
