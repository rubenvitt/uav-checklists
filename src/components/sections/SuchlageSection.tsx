import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PiArrowClockwise, PiArrowSquareOut, PiBroadcast, PiLinkSimple, PiPlus, PiWarning } from 'react-icons/pi'
import ChecklistSection from '../ChecklistSection'
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
import {
  OUTBOX_KEY,
  enqueueSuchlage,
  kickSuchlageSync,
  linkInfoFromMission,
  setSuchlageRemoteState,
  type SuchlageLink,
  type SuchlagePeer,
  type SuchlageRemoteState,
} from '../../utils/suchlageStore'
import type { OutboxItem } from '../../utils/suchlageOutbox'
import { UNKNOWN_AIRCRAFT } from '../../utils/suchlageLogbook'
import { drones } from '../../data/drones'
import type { DroneId } from '../../types/drone'
import type { FmLinkInfo, FmMission, MissionState } from '../../types/suchlage'
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
  released: 'Gelöst',
}

function formatDateTime(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
}

/** Andere, nicht gelöste Verknüpfungen eines Einsatzes in der Auswahl. */
function otherLinks(m: FmMission, missionId: string): FmLinkInfo[] {
  return m.links.filter((l) => l.released_at_ms === null && !sameMissionId(l.flugmappe_mission_id, missionId))
}

function PeerList({ peers }: { peers: SuchlagePeer[] }) {
  if (peers.length === 0) return null
  return (
    <div>
      <h3 className="eyebrow mb-2">Ebenfalls verknüpft</h3>
      <ul className="divide-y divide-line border border-line">
        {peers.map((p) => (
          <li key={`${p.linkedBy}:${p.linkedAt}`} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text">{p.aircraftLabel}</p>
              <p className="truncate text-xs text-text-muted">
                {p.linkedBy} · seit <span className="num">{formatDateTime(p.linkedAt)}</span>
              </p>
            </div>
            {p.doneAt !== null ? (
              <span className="num shrink-0 border border-line bg-surface-alt px-1.5 py-px text-[11px] text-text-muted">Fertig</span>
            ) : (
              <span className="num shrink-0 border border-good/40 bg-good-bg px-1.5 py-px text-[11px] text-good">Offen</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
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
  const [selectedDrone] = useMissionPersistedState<DroneId>('selectedDrone', 'matrice-350-rtk')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const aircraftLabel = drones.find((d) => d.id === selectedDrone)?.name ?? UNKNOWN_AIRCRAFT

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
      if (other) return `In Suchlage läuft schon „${other.name}“ – dort abschließen oder diesen wählen.`
      const detail = isSuchlageError(e) ? e.serverMessage : null
      return detail
        ? `${detail}. In Suchlage prüfen oder einen anderen Einsatz wählen.`
        : 'In Suchlage läuft schon ein anderer Einsatz, oder diese Flugmappe ist mit einem anderen verknüpft – dort prüfen.'
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
      return list.find((m) => m.links.some((l) => l.released_at_ms === null && sameMissionId(l.flugmappe_mission_id, missionId))) ?? null
    } catch {
      return null
    }
  }

  async function connect(target: FmMission | 'new') {
    const segment = activeSegment ?? ensureDefaultSegment(missionId)
    if (!segment) return
    setBusy(true)
    setError(null)
    setNotice(null)
    const sectionLocation = location.trim() || null
    try {
      let mission: FmMission
      let adopted = false
      const requestedName = name.trim() || defaultName
      try {
        mission = target === 'new'
          ? await suchlage.createMission({
              name: requestedName,
              location: sectionLocation,
              section_label: segment.label,
              section_location: sectionLocation,
              flugmappe_mission_id: missionId,
              flugmappe_section_id: segment.id,
              aircraft_label: aircraftLabel,
            })
          : await suchlage.linkMission(target.id, {
              flugmappe_mission_id: missionId,
              flugmappe_section_id: segment.id,
              section_label: segment.label,
              section_location: sectionLocation,
              aircraft_label: aircraftLabel,
            })
      } catch (e) {
        // Ein wiederholtes Anlegen eines eigenen offenen Einsatzes liefert 200 (siehe unten).
        // 409 heißt: diese Flugmappe ist schon mit einem anderen Einsatz verknüpft – oder
        // ein anderer läuft. Eigene Verknüpfung nur übernehmen, wenn sie passt.
        const own = errorKindOf(e) === 'conflict' ? await findOwnLink() : null
        if (!own) throw e
        if (target !== 'new' && own.id !== target.id) {
          setError(`Dieser Einsatz ist in Suchlage bereits mit „${own.name}“ verknüpft.`)
          void missionsQuery.refetch()
          return
        }
        mission = own
        adopted = true
      }
      // Neu angelegt, aber Suchlage liefert den schon vorhandenen eigenen Einsatz (200).
      if (target === 'new' && !adopted && mission.name !== requestedName) adopted = true
      if (adopted) setNotice(`Dieser Einsatz war in Suchlage schon mit „${mission.name}“ verknüpft – Verknüpfung übernommen.`)
      const sections: Record<string, true> = adopted ? {} : { [segment.id]: true }
      for (const sec of mission.sections) if (sec.flugmappe_section_id) sections[sec.flugmappe_section_id] = true
      const info = linkInfoFromMission(missionId, mission)
      const link: SuchlageLink = {
        suchlageMissionId: mission.id,
        missionName: mission.name,
        linkedAt: new Date().getTime(),
        sections,
        peers: info.peers,
        ...(info.doneAt !== undefined ? { doneAt: info.doneAt } : {}),
      }
      sl.setLink(link)
      // Übernommene Verknüpfung ohne den aktiven Abschnitt: dort nachträglich anlegen.
      if (!sections[segment.id]) {
        enqueueSuchlage(missionId, { kind: 'section', segmentId: segment.id, label: segment.label, location: sectionLocation })
      }
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

  /**
   * In Suchlage gelöst: denselben Einsatz erneut verknüpfen. Die alte
   * Verknüpfung lebt dort wieder auf (Abschnitte und Flugbuch bleiben ihr),
   * Wartendes geht danach hinaus.
   */
  async function relink() {
    const current = sl.link
    const segment = activeSegment ?? ensureDefaultSegment(missionId)
    if (!current || !segment) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const mission = await suchlage.linkMission(current.suchlageMissionId, {
        flugmappe_mission_id: missionId,
        flugmappe_section_id: segment.id,
        section_label: segment.label,
        section_location: segment.locationName?.trim() || null,
        aircraft_label: aircraftLabel,
      })
      const info = linkInfoFromMission(missionId, mission)
      sl.setLink((l) => {
        if (!l) return l
        const sections = { ...l.sections }
        for (const sec of mission.sections) if (sec.flugmappe_section_id) sections[sec.flugmappe_section_id] = true
        const next: SuchlageLink = { ...l, missionName: mission.name, sections, peers: info.peers }
        delete next.doneAt
        if (info.doneAt !== undefined) next.doneAt = info.doneAt
        return next
      })
      setSuchlageRemoteState(missionId, mission.state === 'closed' ? 'closed' : undefined)
      kickSuchlageSync()
      void queryClient.invalidateQueries({ queryKey: ['suchlage'] })
    } catch (e) {
      const kind = errorKindOf(e)
      if (kind === 'unauthorized' || kind === 'forbidden') void queryClient.invalidateQueries({ queryKey: ['suchlage', 'me'] })
      setError(kind === 'unprocessable' ? 'Der Einsatz ist in Suchlage bereits abgeschlossen.' : describeError(e, 'new'))
    } finally {
      setBusy(false)
    }
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
          {notice && <p role="status" className="border border-line bg-surface-alt px-3 py-2 text-xs text-text-2">{notice}</p>}
          <SuchlageRemoteNotice state={remote} context="einsatz" />
          {remote === 'released' && (
            <button
              type="button"
              onClick={() => void relink()}
              disabled={busy}
              className="flex min-h-11 w-full items-center justify-center gap-2 bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
            >
              <PiArrowClockwise />
              {busy ? 'Wird verknüpft …' : 'Erneut verknüpfen'}
            </button>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-2 border border-warning/40 bg-warning-bg px-3 py-2 text-xs text-warning">
              <PiWarning className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <PeerList peers={link.peers ?? []} />
          {link.mapImport === 'failed' && (
            <p className="text-xs text-text-muted">Die Einsatzkarte konnte beim Verknüpfen nicht nach Suchlage übernommen werden.</p>
          )}
          {outbox.length > 0 && (
            <p className="text-xs text-text-muted">
              <span className="num">{outbox.length}</span>{' '}
              {remote === 'gone' || remote === 'released'
                ? `${outbox.length === 1 ? 'Änderung ist' : 'Änderungen sind'} pausiert, solange ${remote === 'gone' ? 'der Einsatz in Suchlage nicht gefunden wird' : 'die Verknüpfung in Suchlage gelöst ist'}.`
                : `${outbox.length === 1 ? 'Änderung wartet' : 'Änderungen warten'} auf Übertragung an Suchlage.`}
            </p>
          )}
          <p className="text-xs text-faint">
            Flüge erscheinen im Flugbuch als Vorschläge, die Einsatzkarte kommt aus Suchlage. Jeder Eintrag im
            Flugbuch geht auch an Suchlage. Beendet wird die Verknüpfung durch den Abschluss des Einsatzes; der
            Suchlage-Einsatz schließt, wenn alle verknüpften Flugmappen fertig sind.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Optional: Mit Suchlage verknüpft erscheinen erkannte Flüge im Flugbuch als Vorschläge, die
            Einsatzkarte kommt aus Suchlage und das Flugbuch geht an Suchlage. Mehrere Trupps können denselben
            Einsatz verknüpfen. Ohne Verknüpfung ändert sich nichts.
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
                  const others = otherLinks(m, missionId)
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{m.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                          <span className={`num border px-1.5 py-px text-[11px] font-medium ${chip.className}`}>{chip.label}</span>
                          {m.started_at_ms !== null && <span>seit <span className="num">{formatDateTime(m.started_at_ms)}</span></span>}
                          {m.location && <span className="truncate">{m.location}</span>}
                        </p>
                        {others.length > 0 && (
                          <p className="mt-1 text-xs text-text-muted">
                            Verknüpft: {others.map((l) => `${l.aircraft_label} (${l.linked_by})`).join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void connect(m)}
                        disabled={busy}
                        className="min-h-11 shrink-0 bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
                      >
                        Wählen
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
    </ChecklistSection>
  )
}
