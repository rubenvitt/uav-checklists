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

const PHASE_NR: Record<MissionPhase, string> = {
  einsatzdaten: '01',
  vorflugkontrolle: '02',
  fluege: '03',
  nachbereitung: '04',
}

/** Phasen-Chip: getönte Fläche nur, wo die Phase etwas aussagt (Flüge laufen). */
const PHASE_COLORS: Record<MissionPhase, string> = {
  einsatzdaten: 'border-line-strong bg-surface-alt text-text-muted',
  vorflugkontrolle: 'border-accent/40 bg-accent-bg text-accent-text',
  fluege: 'border-good/40 bg-good-bg text-good',
  nachbereitung: 'border-line-strong bg-surface-alt text-text-muted',
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
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Flugmappe</p>
          <h1 className="text-[22px] leading-7 font-semibold text-text">Einsätze</h1>
          <p className="num text-xs text-text-muted">
            {activeMissions.length === 0 ? 'keine aktiven' : `${activeMissions.length} aktiv`}
            {completedMissions.length > 0 && ` · ${completedMissions.length} abgeschlossen`}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex h-11 shrink-0 items-center gap-2 bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          <PiPlus className="text-base" />
          Neuer Einsatz
        </button>
      </div>

      {showArchive && (
        <div className="space-y-3">
          <button
            onClick={() => setArchiveOpen((v) => !v)}
            className="flex min-h-12 w-full items-center justify-between gap-2 border border-line bg-surface px-4 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
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
        <div className="flex flex-col items-center gap-4 border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <PiMapTrifold className="text-4xl text-faint" />
          <div>
            <p className="text-sm font-semibold text-text">Noch keine Einsätze</p>
            <p className="mt-1 text-xs text-text-muted">Lege einen Einsatz an. Die Flugmappe führt dich von den Einsatzdaten über die Vorflugkontrolle bis zum Abschluss.</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex h-11 items-center gap-2 bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            <PiPlus className="text-base" />
            Ersten Einsatz anlegen
          </button>
        </div>
      )}

      {activeMissions.length > 0 && (
      <section className="border border-line bg-surface">
        <div className="flex h-9 items-center justify-between border-b border-line bg-surface-alt/60 px-4">
          <h2 className="eyebrow">Aktiv</h2>
          <span className="num text-[11px] text-faint">{activeMissions.length}</span>
        </div>
        <div className="divide-y divide-line">
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
      </section>
      )}

      {completedMissions.length > 0 && (
        <section className="border border-line bg-surface">
          <div className="flex h-9 items-center justify-between border-b border-line bg-surface-alt/60 px-4">
            <h2 className="eyebrow">Abgeschlossen</h2>
            <span className="num text-[11px] text-faint">{completedMissions.length}</span>
          </div>
          <div className="divide-y divide-line">
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
        </section>
      )}

      {deletedMissions.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setTrashOpen((v) => !v)}
            className="flex min-h-12 w-full items-center justify-between gap-2 border border-line bg-surface px-4 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
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
        <div className="border-t border-line pt-2">
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
  const iconBtnClass = 'flex h-11 w-11 items-center justify-center text-lg text-text-muted transition-colors'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate() } }}
      className="group w-full cursor-pointer py-2 pr-1 pl-4 text-left transition-colors hover:bg-surface-alt"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 py-1">
          <p className={`truncate text-[15px] leading-5 font-semibold ${isCompleted ? 'text-text-muted' : 'text-text'}`}>
            {displayLabel}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {isCompleted ? (
              <span className="flex items-center gap-1 border border-good/40 bg-good-bg px-1.5 py-px text-[11px] font-medium text-good">
                <PiCheckCircle />
                Abgeschlossen
              </span>
            ) : (
              <span className={`flex items-center gap-1.5 border px-1.5 py-px text-[11px] font-medium ${PHASE_COLORS[mission.phase]}`}>
                <span className="num opacity-70">{PHASE_NR[mission.phase]}</span>
                {PHASE_LABELS[mission.phase]}
              </span>
            )}
            <span className="num flex items-center gap-1 text-[11px] text-text-muted" title="Verbleibende Aufbewahrung auf diesem Gerät">
              <PiClock />
              {getRemainingTime(mission)}
            </span>
          </div>
        </div>
        <div className="flex items-center">
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
  const iconBtnClass = 'flex h-11 w-11 items-center justify-center text-lg text-text-muted transition-colors'

  return (
    <div className="w-full border border-line bg-surface py-2 pr-1 pl-4 opacity-75">
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
