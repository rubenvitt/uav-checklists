import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PiPlus, PiTrash, PiClock, PiMapTrifold, PiFilePdf, PiCheckCircle, PiShareNetwork, PiArchive, PiCaretDown, PiArrowCounterClockwise } from 'react-icons/pi'
import { useAuth } from '../context/useAuth'
import { isSignApiConfigured } from '../services/signApi'
import ArchivePanel from './ArchivePanel'
import SignatureVerifyPanel from './SignatureVerifyPanel'
import { useMissions } from '../hooks/useMissions'
import { useMissionDisplayLabel } from '../hooks/useMissionDisplayLabel'
import { getRemainingTime } from '../utils/missionStorage'
import { generateMissionReport } from '../utils/generateMissionReport'
import { downloadPdf, sharePdf, canSharePdf } from '../utils/generateReport'
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
  const { missions, create, remove, restore, purge, clean } = useMissions()
  const { configured, isAuthenticated, isAdmin } = useAuth()
  const [confirmPurge, setConfirmPurge] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)

  // The archive viewer is admin-only and degrades gracefully: hidden for
  // non-admins, logged-out users, and when the backend/OIDC is unconfigured.
  const showArchive = configured && isAuthenticated && isAdmin

  // Public signature verification: shown whenever a backend is configured at
  // all (no login or health ping required) — and only here, on the main page.
  const showVerify = isSignApiConfigured()

  useEffect(() => {
    clean()
  }, [clean])

  const handleCreate = () => {
    const mission = create()
    navigate(`/mission/${mission.id}/einsatzdaten`)
  }

  // Permanently removing a recoverable mission is the only destructive action
  // left, so it keeps a click-twice confirmation.
  const handlePurge = (missionId: string) => {
    if (confirmPurge === missionId) {
      purge(missionId)
      setConfirmPurge(null)
    } else {
      setConfirmPurge(missionId)
    }
  }

  // Dismiss confirm state automatically
  useEffect(() => {
    if (confirmPurge === null) return
    const timer = setTimeout(() => setConfirmPurge(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmPurge])

  const activeMissions = missions.filter((m) => !m.completedAt && !m.deletedAt)
  const completedMissions = missions.filter((m) => !!m.completedAt && !m.deletedAt)
  const deletedMissions = missions
    .filter((m) => !!m.deletedAt)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))

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

      {showArchive && (
        <div className="space-y-3">
          <button
            onClick={() => setArchiveOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-[0.99]"
            aria-expanded={archiveOpen}
          >
            <span className="flex items-center gap-2">
              <PiArchive />
              Archiv
            </span>
            <PiCaretDown className={`transition-transform ${archiveOpen ? 'rotate-180' : ''}`} />
          </button>
          {archiveOpen && <ArchivePanel />}
        </div>
      )}

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
            onNavigate={() => navigate(`/mission/${mission.id}/${mission.phase}`)}
            onDelete={() => remove(mission.id)}
            onDownloadPdf={() => { const r = generateMissionReport(mission.id, queryClient); if (r) downloadPdf(r.blob, r.filename) }}
            onSharePdf={() => { const r = generateMissionReport(mission.id, queryClient); if (r) sharePdf(r.blob, r.filename).catch(() => {}) }}
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
              onNavigate={() => navigate(`/mission/${mission.id}/nachbereitung`)}
              onDelete={() => remove(mission.id)}
              onDownloadPdf={() => { const r = generateMissionReport(mission.id, queryClient); if (r) downloadPdf(r.blob, r.filename) }}
            onSharePdf={() => { const r = generateMissionReport(mission.id, queryClient); if (r) sharePdf(r.blob, r.filename).catch(() => {}) }}
            />
          ))}
        </div>
      )}

      {deletedMissions.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setTrashOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-[0.99]"
            aria-expanded={trashOpen}
          >
            <span className="flex items-center gap-2">
              <PiTrash />
              Kürzlich gelöscht ({deletedMissions.length})
            </span>
            <PiCaretDown className={`transition-transform ${trashOpen ? 'rotate-180' : ''}`} />
          </button>
          {trashOpen && (
            <>
              <p className="text-xs text-text-muted">
                Gelöschte Einsätze bleiben 30 Minuten wiederherstellbar.
              </p>
              {deletedMissions.map((mission) => (
                <DeletedMissionCard
                  key={mission.id}
                  mission={mission}
                  isConfirmingPurge={confirmPurge === mission.id}
                  onRestore={() => restore(mission.id)}
                  onPurge={() => handlePurge(mission.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {showVerify && (
        <div className="border-t border-text-muted/10 pt-2">
          <SignatureVerifyPanel />
        </div>
      )}
    </div>
  )
}

function MissionCard({ mission, onNavigate, onDelete, onDownloadPdf, onSharePdf }: {
  mission: Mission
  onNavigate: () => void
  onDelete: () => void
  onDownloadPdf: () => void
  onSharePdf: () => void
}) {
  const isCompleted = !!mission.completedAt
  const displayLabel = useMissionDisplayLabel(mission.id, mission.createdAt)
  const iconBtnClass = 'rounded-lg p-2 text-text-muted transition-colors'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate() } }}
      className={`w-full rounded-xl p-4 text-left transition-colors active:scale-[0.99] cursor-pointer ${
        isCompleted
          ? 'bg-surface/60 opacity-75 hover:bg-surface-alt/60'
          : 'bg-surface hover:bg-surface-alt'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isCompleted ? 'text-text-muted' : 'text-text'}`}>
            {displayLabel}
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
              onDownloadPdf()
            }}
            className={`${iconBtnClass} hover:bg-surface-alt hover:text-text`}
            aria-label="PDF herunterladen"
            title="PDF herunterladen"
          >
            <PiFilePdf />
          </button>
          {canSharePdf() && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSharePdf()
              }}
              className={`${iconBtnClass} hover:bg-surface-alt hover:text-text`}
              aria-label="PDF teilen"
              title="PDF teilen"
            >
              <PiShareNetwork />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={`${iconBtnClass} hover:bg-warning-bg hover:text-warning`}
            aria-label="Einsatz löschen"
            title="Einsatz löschen (30 Min. wiederherstellbar)"
          >
            <PiTrash />
          </button>
        </div>
      </div>
    </div>
  )
}

function DeletedMissionCard({ mission, isConfirmingPurge, onRestore, onPurge }: {
  mission: Mission
  isConfirmingPurge: boolean
  onRestore: () => void
  onPurge: () => void
}) {
  const displayLabel = useMissionDisplayLabel(mission.id, mission.createdAt)
  const iconBtnClass = 'rounded-lg p-2 text-text-muted transition-colors'

  return (
    <div className="w-full rounded-xl bg-surface/60 p-4 opacity-75">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-muted line-through">
            {displayLabel}
          </p>
          <span className="mt-2 flex items-center gap-1 text-xs text-text-muted">
            <PiClock />
            Endgültig gelöscht in {getRemainingTime(mission)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRestore}
            className={`${iconBtnClass} hover:bg-good-bg hover:text-good`}
            aria-label="Einsatz wiederherstellen"
            title="Wiederherstellen"
          >
            <PiArrowCounterClockwise />
          </button>
          <button
            onClick={onPurge}
            className={`${iconBtnClass} ${
              isConfirmingPurge
                ? 'bg-warning-bg text-warning'
                : 'hover:bg-warning-bg hover:text-warning'
            }`}
            aria-label={isConfirmingPurge ? 'Nochmal klicken zum endgültigen Löschen' : 'Endgültig löschen'}
            title={isConfirmingPurge ? 'Nochmal klicken zum endgültigen Löschen' : 'Endgültig löschen'}
          >
            <PiTrash />
          </button>
        </div>
      </div>
    </div>
  )
}
