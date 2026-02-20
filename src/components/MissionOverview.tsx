import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PiPlus, PiTrash, PiClock, PiMapTrifold, PiFilePdf, PiCheckCircle } from 'react-icons/pi'
import { useMissions } from '../hooks/useMissions'
import { getRemainingTime } from '../utils/missionStorage'
import { generateMissionReport } from '../utils/generateMissionReport'
import type { Mission, MissionPhase } from '../types/mission'

const PHASE_LABELS: Record<MissionPhase, string> = {
  einsatzdaten: 'Einsatzdaten',
  vorflugkontrolle: 'Vorflugkontrolle',
  fluege: 'Flüge',
  nachbereitung: 'Nachbereitung',
}

const PHASE_COLORS: Record<MissionPhase, string> = {
  einsatzdaten: 'bg-surface-alt text-text-muted',
  vorflugkontrolle: 'bg-caution-bg text-caution',
  fluege: 'bg-good-bg text-good',
  nachbereitung: 'bg-surface-alt text-text-muted',
}

export default function MissionOverview() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { missions, create, remove, clean } = useMissions()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    clean()
  }, [clean])

  const handleCreate = () => {
    const mission = create()
    navigate(`/mission/${mission.id}/einsatzdaten`)
  }

  const handleDelete = (missionId: string) => {
    if (confirmDelete === missionId) {
      remove(missionId)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(missionId)
    }
  }

  // Dismiss confirm state when clicking elsewhere
  useEffect(() => {
    if (confirmDelete === null) return
    const timer = setTimeout(() => setConfirmDelete(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmDelete])

  const activeMissions = missions.filter((m) => !m.completedAt)
  const completedMissions = missions.filter((m) => !!m.completedAt)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Einsätze</h2>
          <p className="text-sm text-text-muted">
            {activeMissions.length === 0 ? 'Keine aktiven Einsätze' : `${activeMissions.length} aktive${activeMissions.length === 1 ? 'r' : ''} Einsatz${activeMissions.length === 1 ? '' : 'e'}`}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-lg bg-text px-4 py-2.5 text-sm font-medium text-base transition-colors hover:opacity-90 active:scale-95"
        >
          <PiPlus />
          Neuer Einsatz
        </button>
      </div>

      {missions.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-surface py-16 text-center">
          <PiMapTrifold className="text-4xl text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text">Noch keine Einsätze</p>
            <p className="mt-1 text-xs text-text-muted">Erstelle einen neuen Einsatz, um zu beginnen.</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activeMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            isConfirmingDelete={confirmDelete === mission.id}
            onNavigate={() => navigate(`/mission/${mission.id}/${mission.phase}`)}
            onDelete={() => handleDelete(mission.id)}
            onExportPdf={() => generateMissionReport(mission.id, queryClient)}
          />
        ))}
      </div>

      {completedMissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted">
            Abgeschlossen ({completedMissions.length})
          </h3>
          {completedMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              isConfirmingDelete={confirmDelete === mission.id}
              onNavigate={() => navigate(`/mission/${mission.id}/nachbereitung`)}
              onDelete={() => handleDelete(mission.id)}
              onExportPdf={() => generateMissionReport(mission.id, queryClient)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MissionCard({ mission, isConfirmingDelete, onNavigate, onDelete, onExportPdf }: {
  mission: Mission
  isConfirmingDelete: boolean
  onNavigate: () => void
  onDelete: () => void
  onExportPdf: () => void
}) {
  const isCompleted = !!mission.completedAt
  const iconBtnClass = 'rounded-lg p-2 text-text-muted transition-colors'

  return (
    <button
      onClick={onNavigate}
      className={`w-full rounded-xl p-4 text-left transition-colors active:scale-[0.99] ${
        isCompleted
          ? 'bg-surface/60 opacity-75 hover:bg-surface-alt/60'
          : 'bg-surface hover:bg-surface-alt'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isCompleted ? 'text-text-muted' : 'text-text'}`}>
            {mission.label}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isCompleted ? (
              <span className="flex items-center gap-1 rounded-full bg-good-bg px-2.5 py-0.5 text-xs font-medium text-good">
                <PiCheckCircle />
                Abgeschlossen
              </span>
            ) : (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PHASE_COLORS[mission.phase]}`}>
                {PHASE_LABELS[mission.phase]}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <PiClock />
              {getRemainingTime(mission)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExportPdf()
            }}
            className={`${iconBtnClass} hover:bg-surface-alt hover:text-text`}
            aria-label="Als PDF exportieren"
            title="Als PDF exportieren"
          >
            <PiFilePdf />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={`${iconBtnClass} ${
              isConfirmingDelete
                ? 'bg-warning-bg text-warning'
                : 'hover:bg-warning-bg hover:text-warning'
            }`}
            aria-label={isConfirmingDelete ? 'Nochmal klicken zum Löschen' : 'Einsatz löschen'}
            title={isConfirmingDelete ? 'Nochmal klicken zum Löschen' : 'Einsatz löschen'}
          >
            <PiTrash />
          </button>
        </div>
      </div>
    </button>
  )
}
