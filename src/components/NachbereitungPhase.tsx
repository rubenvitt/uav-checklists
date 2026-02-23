import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PiCheckCircle, PiFilePdf, PiWarning, PiInfo, PiShareNetwork } from 'react-icons/pi'
import { useMissionId } from '../context/MissionContext'
import { getMission, getSegments } from '../utils/missionStorage'
import { readStorage } from '../hooks/usePersistedState'
import { useMissions } from '../hooks/useMissions'
import { generateMissionReport } from '../utils/generateMissionReport'
import { downloadPdf, sharePdf, canSharePdf } from '../utils/generateReport'
import { useAutoExpand } from '../hooks/useAutoExpand'
import { useNachbereitungCompleteness } from '../hooks/useSectionCompleteness'
import type { FlightLogEntry } from '../types/flightLog'
import EinsatzabschlussSection from './sections/EinsatzabschlussSection'
import FlightDisruptionsSection from './sections/FlightDisruptionsSection'
import MissionResultSection from './sections/MissionResultSection'
import PostFlightInspectionSection from './sections/PostFlightInspectionSection'
import WartungPflegeSection from './sections/WartungPflegeSection'
import SegmentSummarySection from './sections/SegmentSummarySection'

export default function NachbereitungPhase() {
  const missionId = useMissionId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { complete } = useMissions()
  const mission = getMission(missionId)
  const isCompleted = !!mission?.completedAt
  const [confirmComplete, setConfirmComplete] = useState(false)

  // Determine if flights were executed
  const entries = readStorage<FlightLogEntry[]>('flightlog:entries', [], missionId)
  const hasFlights = entries.some(e => e.blockOn !== null)
  const segments = getSegments(missionId)
  const isMultiSegment = segments.length > 1

  const handleComplete = () => {
    if (!confirmComplete) {
      setConfirmComplete(true)
      return
    }
    complete(missionId)
    navigate('/')
  }

  const handleDownloadPdf = () => {
    const result = generateMissionReport(missionId, queryClient)
    if (result) downloadPdf(result.blob, result.filename)
  }

  const handleSharePdf = () => {
    const result = generateMissionReport(missionId, queryClient)
    if (result) sharePdf(result.blob, result.filename).catch(() => { /* user cancelled */ })
  }

  // Auto-expand logic — must be called unconditionally (Rules of Hooks)
  const sections = useNachbereitungCompleteness(hasFlights)
  const { openState, toggle, continueToNext, isComplete } = useAutoExpand(sections, 'nachbereitung')

  if (isCompleted) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4 rounded-xl bg-good-bg py-12 text-center">
          <PiCheckCircle className="text-4xl text-good" />
          <div>
            <p className="text-sm font-medium text-good">Einsatz abgeschlossen</p>
            <p className="mt-1 text-xs text-text-muted">
              Dieser Einsatz wurde abgeschlossen. Die Daten werden noch 24 Stunden gespeichert.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPdf}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm font-medium text-text transition-colors hover:bg-surface-alt active:scale-[0.99]"
          >
            <PiFilePdf className="text-lg" />
            PDF herunterladen
          </button>
          {canSharePdf() && (
            <button
              onClick={handleSharePdf}
              className="flex items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm font-medium text-text transition-colors hover:bg-surface-alt active:scale-[0.99]"
              aria-label="PDF teilen"
              title="PDF teilen"
            >
              <PiShareNetwork className="text-lg" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hinweis: Einsatz ohne Flüge */}
      {!hasFlights && (
        <div className="flex items-start gap-3 rounded-xl bg-surface p-4">
          <PiInfo className="mt-0.5 shrink-0 text-lg text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text">Einsatz ohne Flüge</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Die Nachbereitung wurde auf die relevanten Schritte reduziert.
            </p>
          </div>
        </div>
      )}

      {isMultiSegment && <SegmentSummarySection segments={segments} flightEntries={entries} />}
      {hasFlights && <PostFlightInspectionSection open={openState.postflightinspection} onToggle={() => toggle('postflightinspection')} isComplete={isComplete.postflightinspection} onContinue={() => continueToNext('postflightinspection')} />}
      {hasFlights && <FlightDisruptionsSection open={openState.flightdisruptions} onToggle={() => toggle('flightdisruptions')} isComplete={isComplete.flightdisruptions} onContinue={() => continueToNext('flightdisruptions')} />}
      <EinsatzabschlussSection open={openState.einsatzabschluss} onToggle={() => toggle('einsatzabschluss')} isComplete={isComplete.einsatzabschluss} onContinue={() => continueToNext('einsatzabschluss')} />
      {hasFlights && <WartungPflegeSection open={openState.wartungpflege} onToggle={() => toggle('wartungpflege')} isComplete={isComplete.wartungpflege} onContinue={() => continueToNext('wartungpflege')} />}
      <MissionResultSection open={openState.missionresult} onToggle={() => toggle('missionresult')} isComplete={isComplete.missionresult} onContinue={() => continueToNext('missionresult')} />

      {confirmComplete && (
        <div className="flex items-start gap-3 rounded-xl bg-caution-bg p-4">
          <PiWarning className="mt-0.5 text-lg text-caution shrink-0" />
          <div>
            <p className="text-sm font-medium text-caution">Einsatz wirklich abschliessen?</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Der Einsatz kann danach nicht mehr bearbeitet werden und wird nach 24 Stunden automatisch gelöscht.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleComplete}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors active:scale-[0.99] ${
          confirmComplete
            ? 'bg-caution text-white'
            : 'bg-text text-base'
        }`}
      >
        <PiCheckCircle className="text-lg" />
        {confirmComplete ? 'Bestätigen: Einsatz abschliessen' : 'Einsatz abschliessen'}
      </button>
    </div>
  )
}
