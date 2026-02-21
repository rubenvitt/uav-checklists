import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PiCheckCircle, PiFilePdf, PiWarning } from 'react-icons/pi'
import { useMissionId } from '../context/MissionContext'
import { getMission } from '../utils/missionStorage'
import { useMissions } from '../hooks/useMissions'
import { generateMissionReport } from '../utils/generateMissionReport'
import FlightDisruptionsSection from './sections/FlightDisruptionsSection'

export default function NachbereitungPhase() {
  const missionId = useMissionId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { complete } = useMissions()
  const mission = getMission(missionId)
  const isCompleted = !!mission?.completedAt
  const [confirmComplete, setConfirmComplete] = useState(false)

  const handleComplete = () => {
    if (!confirmComplete) {
      setConfirmComplete(true)
      return
    }
    complete(missionId)
    navigate('/')
  }

  const handleExportPdf = () => {
    generateMissionReport(missionId, queryClient)
  }

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
        <button
          onClick={handleExportPdf}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm font-medium text-text transition-colors hover:bg-surface-alt active:scale-[0.99]"
        >
          <PiFilePdf className="text-lg" />
          Einsatzbericht als PDF exportieren
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FlightDisruptionsSection />

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
