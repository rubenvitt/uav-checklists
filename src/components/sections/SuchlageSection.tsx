import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PiArrowSquareOut, PiBroadcast, PiLinkSimple, PiPlus, PiWarning } from 'react-icons/pi'
import ChecklistSection from '../ChecklistSection'
import TakeOverDialog from '../suchlage/TakeOverDialog'
import SuchlageRemoteNotice from '../suchlage/SuchlageRemoteNotice'
import { useMissionId } from '../../context/useMissionId'
import { useMissionSegment } from '../../hooks/useMissionSegment'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { useMapData } from '../../hooks/useMapData'
import { errorKindOf, useSuchlageMission } from '../../hooks/useSuchlage'
import { isSuchlageError, sameMissionId, suchlage } from '../../services/suchlageApi'
import { buildMissionLabel } from '../../utils/missionLabel'
import { ensureDefaultSegment, getMission } from '../../utils/missionStorage'
import { buildMapImport } from '../../utils/suchlageMap'
import { OUTBOX_KEY, type SuchlageLink, type SuchlageRemoteState } from '../../utils/suchlageStore'
import type { OutboxItem } from '../../utils/suchlageOutbox'
import type { FmMission, MissionState } from '../../types/suchlage'
import type { MetricStatus } from '../../types/assessment'

interface SuchlageSectionProps {
  /** Ortsname des aktiven Abschnitts (für „Neu anlegen“ vorbelegt) */
  locationName: string
  latitude: number | null
  longitude: number | null
}

const STATE_CHIP: Record<MissionState, { label: string; className: string }> = {
  running: { label: 'Läuft', className: 'bg-good-bg text-good border-good/40' },
  prepared: { label: 'Vorbereitet', className: 'bg-surface-alt text-text-2 border-line-strong' },
  closed: { label: 'Abgeschlossen', className: 'bg-surface-alt text-text-muted border-line' },
}

const REMOTE_BADGE: Record<SuchlageRemoteState, string> = {
  closed: 'Abgeschlossen',
  gone: 'Nicht mehr vorhanden',
  replaced: 'Abgelöst',
}

function formatDateTime(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
}

const inputClass = 'min-h-11 w-full border border-line bg-surface-alt px-3 text-sm text-text outline-none focus:border-control-border'

/**
 * Abschnitt „Suchlage“ in den Einsatzdaten. Erscheint nur, wenn Suchlage
 * konfiguriert ist, der Nutzer angemeldet ist und die Probe gelingt (oder der
 * Einsatz schon verknüpft ist). Zählt nie gegen die Vollständigkeit.
 */
export default function SuchlageSection({ locationName, latitude, longitude }: SuchlageSectionProps) {
  const missionId = useMissionId()
  const queryClient = useQueryClient()
  const sl = useSuchlageMission()
  const { activeSegment } = useMissionSegment()
  const [mapData] = useMapData()
  const [outbox] = useMissionPersistedState<OutboxItem[]>(OUTBOX_KEY, [])
  const [anlass] = useMissionPersistedState<string>('flugAnlass', '')
  const [stichwort] = useMissionPersistedState<string>('einsatzstichwort', '')
  const [template] = useMissionPersistedState<string>('mission_template', '')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [takeOver, setTakeOver] = useState<FmMission | null>(null)

  const defaultName = stichwort.trim() || buildMissionLabel({
    anlass,
    stichwort,
    template,
    location: locationName,
    flightCount: 0,
    createdAt: getMission(missionId)?.createdAt ?? 0,
  })
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [locationDraft, setLocationDraft] = useState<string | null>(null)
  const name = nameDraft ?? defaultName
  const location = locationDraft ?? locationName

  const missionsQuery = useQuery({
    queryKey: ['suchlage', 'missions'],
    queryFn: ({ signal }) => suchlage.listMissions(signal),
    enabled: sl.available && !sl.link && open,
    staleTime: 15_000,
    retry: false,
    meta: { persist: false },
  })
  const missions = missionsQuery.data ?? []

  if (!sl.available && !sl.linked) return null

  const runningOther = (exceptId?: number) => missions.find((m) => m.state === 'running' && m.id !== exceptId)

  function describeError(e: unknown, target: FmMission | 'new'): string {
    const kind = errorKindOf(e)
    if (kind === 'conflict') {
      const other = runningOther(target === 'new' ? undefined : target.id)
      return other
        ? `In Suchlage läuft schon „${other.name}“ – dort abschließen oder diesen wählen.`
        : 'In Suchlage läuft schon ein anderer Einsatz oder dieser ist anderweitig verknüpft – dort prüfen oder einen anderen wählen.'
    }
    if (kind === 'unprocessable') return 'Der Einsatz ist in Suchlage bereits abgeschlossen.'
    if (kind === 'offline' || kind === 'unavailable') return 'Suchlage ist gerade nicht erreichbar. Bitte später erneut versuchen.'
    if (kind === 'unauthorized' || kind === 'forbidden') return 'Keine Berechtigung in Suchlage.'
    const detail = isSuchlageError(e) ? e.serverMessage ?? (e.status ? `Fehler ${e.status}` : null) : null
    return `Verknüpfen fehlgeschlagen${detail ? `: ${detail}` : '.'}`
  }

  /**
   * Nach 409: Ist dieser Einsatz der Flugmappe in Suchlage schon verknüpft
   * (z. B. Antwort beim ersten Versuch verloren), die eigene Verknüpfung übernehmen.
   */
  async function findOwnLink(): Promise<FmMission | null> {
    try {
      const list = await suchlage.listMissions()
      return list.find((m) => sameMissionId(m.link?.flugmappe_mission_id, missionId)) ?? null
    } catch {
      return null
    }
  }

  async function connect(target: FmMission | 'new', confirmTakeOver = false) {
    const segment = activeSegment ?? ensureDefaultSegment(missionId)
    if (!segment) return
    setBusy(true)
    setError(null)
    const sectionLocation = location.trim() || null
    try {
      let mission: FmMission
      try {
        mission = target === 'new'
          ? await suchlage.createMission({
              name: name.trim() || defaultName,
              location: sectionLocation,
              section_label: segment.label,
              section_location: sectionLocation,
              flugmappe_mission_id: missionId,
              flugmappe_section_id: segment.id,
            })
          : await suchlage.linkMission(target.id, {
              flugmappe_mission_id: missionId,
              flugmappe_section_id: segment.id,
              section_label: segment.label,
              section_location: sectionLocation,
              take_over: confirmTakeOver,
            })
      } catch (e) {
        // 409 kann heißen: schon mit genau diesem Einsatz verknüpft (Antwort verloren).
        const own = errorKindOf(e) === 'conflict' ? await findOwnLink() : null
        if (!own) throw e
        mission = own
      }
      const link: SuchlageLink = {
        suchlageMissionId: mission.id,
        missionName: mission.name,
        linkedAt: new Date().getTime(),
        sections: { [segment.id]: true },
      }
      sl.setLink(link)
      setTakeOver(null)
      // Einmalig: Gezeichnetes und Standort übernehmen. Fehler blockieren nicht.
      const standort = latitude !== null && longitude !== null ? { lat: latitude, lon: longitude } : null
      try {
        await suchlage.importMap(mission.id, missionId, buildMapImport(mapData, standort))
        sl.setLink((l) => (l ? { ...l, mapImport: 'ok' } : l))
      } catch {
        sl.setLink((l) => (l ? { ...l, mapImport: 'failed' } : l))
      }
      void queryClient.invalidateQueries({ queryKey: ['suchlage'] })
    } catch (e) {
      const kind = errorKindOf(e)
      if (kind === 'unauthorized' || kind === 'forbidden') void queryClient.invalidateQueries({ queryKey: ['suchlage', 'me'] })
      setError(describeError(e, target))
      if (kind === 'conflict') void missionsQuery.refetch()
    } finally {
      setBusy(false)
    }
  }

  function choose(m: FmMission) {
    const linkedElsewhere = m.link !== null && !sameMissionId(m.link.flugmappe_mission_id, missionId)
    if (linkedElsewhere) setTakeOver(m)
    else void connect(m)
  }

  const link = sl.link
  const remote = link?.remoteState
  const badge: { label: string; status: MetricStatus } | undefined = link
    ? remote
      ? { label: REMOTE_BADGE[remote], status: 'caution' }
      : { label: 'Verknüpft', status: 'good' }
    : undefined
  const webUrl = suchlage.webUrl()

  return (
    <ChecklistSection
      title="Suchlage"
      icon={<PiBroadcast />}
      badge={badge}
      open={open}
      onToggle={() => setOpen((o) => !o)}
    >
      {link ? (
        <div className="space-y-3">
          <div className="border border-line">
            <div className="flex items-start gap-3 px-4 py-3">
              <PiLinkSimple className="mt-0.5 shrink-0 text-lg text-text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{link.missionName}</p>
                <p className="text-xs text-text-muted">
                  Verknüpft seit <span className="num">{formatDateTime(link.linkedAt)}</span>
                </p>
              </div>
            </div>
            {webUrl && (
              <a
                href={webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 border-t border-line text-sm font-medium text-accent-text hover:bg-surface-alt"
              >
                In Suchlage öffnen
                <PiArrowSquareOut />
              </a>
            )}
          </div>
          <SuchlageRemoteNotice state={remote} context="einsatz" />
          {link.mapImport === 'failed' && (
            <p className="text-xs text-text-muted">Die Einsatzkarte konnte beim Verknüpfen nicht nach Suchlage übernommen werden.</p>
          )}
          {outbox.length > 0 && (
            <p className="text-xs text-text-muted">
              <span className="num">{outbox.length}</span> {outbox.length === 1 ? 'Änderung wartet' : 'Änderungen warten'} auf
              Übertragung an Suchlage.
            </p>
          )}
          <p className="text-xs text-faint">
            Flüge erscheinen im Flugbuch als Vorschläge, die Einsatzkarte kommt aus Suchlage. Beendet wird die
            Verknüpfung durch den Abschluss des Einsatzes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Optional: Mit Suchlage verknüpft erscheinen erkannte Flüge im Flugbuch als Vorschläge, und die
            Einsatzkarte kommt aus Suchlage. Ohne Verknüpfung ändert sich nichts.
          </p>

          <div>
            <h3 className="eyebrow mb-2">Offene Einsätze in Suchlage</h3>
            {missionsQuery.isPending && missionsQuery.fetchStatus === 'fetching' && (
              <p className="text-sm text-text-muted">Wird geladen …</p>
            )}
            {missionsQuery.isError && (
              <p className="text-sm text-text-muted">Einsätze konnten nicht geladen werden.</p>
            )}
            {missionsQuery.isSuccess && missions.length === 0 && (
              <p className="text-sm text-text-muted">Keine offenen Einsätze.</p>
            )}
            {missions.length > 0 && (
              <ul className="divide-y divide-line border border-line">
                {missions.map((m) => {
                  const chip = STATE_CHIP[m.state]
                  const elsewhere = m.link !== null && !sameMissionId(m.link.flugmappe_mission_id, missionId)
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{m.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                          <span className={`num border px-1.5 py-px text-[11px] font-medium ${chip.className}`}>{chip.label}</span>
                          {m.started_at_ms !== null && <span>seit <span className="num">{formatDateTime(m.started_at_ms)}</span></span>}
                          {m.location && <span className="truncate">{m.location}</span>}
                        </p>
                        {elsewhere && m.link && (
                          <p className="mt-1 text-xs text-caution">
                            Mit anderer Flugmappe verknüpft ({m.link.linked_by}, <span className="num">{formatDateTime(m.link.linked_at_ms)}</span>)
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => choose(m)}
                        disabled={busy}
                        className="min-h-11 shrink-0 bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
                      >
                        {elsewhere ? 'Übernehmen …' : 'Wählen'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="eyebrow">Neu in Suchlage anlegen</h3>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setNameDraft(e.target.value)}
                className={inputClass}
                data-1p-ignore
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Ort</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocationDraft(e.target.value)}
                placeholder="Optional"
                className={inputClass}
                data-1p-ignore
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              onClick={() => void connect('new')}
              disabled={busy || !name.trim()}
              className="flex min-h-12 w-full items-center justify-center gap-2 bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
            >
              <PiPlus />
              {busy ? 'Wird verknüpft …' : 'In Suchlage anlegen und verknüpfen'}
            </button>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 border border-warning/40 bg-warning-bg px-3 py-2 text-xs text-warning">
              <PiWarning className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}
      <TakeOverDialog
        mission={takeOver}
        busy={busy}
        onConfirm={() => takeOver && void connect(takeOver, true)}
        onCancel={() => setTakeOver(null)}
      />
    </ChecklistSection>
  )
}
