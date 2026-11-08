import { describe, expect, it } from 'vitest'
import type { FmLinkInfo, FmMission } from '../types/suchlage'
import { linkInfoFromMission, migrateLink, openPeers, type SuchlageLink } from './suchlageStore'

const OWN = '0f6b2a1e-5d43-4c8e-9b7a-2e1f3c4d5a6b'

function linkInfo(id: string, extra: Partial<FmLinkInfo> = {}): FmLinkInfo {
  return { flugmappe_mission_id: id, aircraft_label: 'DJI Matrice 200', linked_by: 'Trupp 2', linked_at_ms: 1, done_at_ms: null, released_at_ms: null, ...extra }
}

function mission(links: FmLinkInfo[]): FmMission {
  return { id: 1, name: 'Übung', location: null, state: 'running', started_at_ms: 0, created_at_ms: 0, created_by: 'A', sections: [], links }
}

describe('linkInfoFromMission', () => {
  it('trennt die eigene Verknüpfung (UUID ohne Groß-/Kleinschreibung) von den anderen, ohne gelöste', () => {
    const info = linkInfoFromMission(OWN, mission([
      linkInfo(OWN.toUpperCase(), { aircraft_label: 'DJI Matrice 350 RTK', done_at_ms: 50 }),
      linkInfo('b', { done_at_ms: 70 }),
      linkInfo('c', { released_at_ms: 80 }),
      linkInfo('d'),
    ]))
    expect(info.doneAt).toBe(50)
    expect(info.peers).toEqual([
      { aircraftLabel: 'DJI Matrice 200', linkedBy: 'Trupp 2', linkedAt: 1, doneAt: 70 },
      { aircraftLabel: 'DJI Matrice 200', linkedBy: 'Trupp 2', linkedAt: 1, doneAt: null },
    ])
    expect(openPeers({ peers: info.peers } as SuchlageLink)).toHaveLength(1)
  })

  it('ohne eigene Verknüpfung kein Abschluss', () => {
    expect(linkInfoFromMission(OWN, mission([])).doneAt).toBeUndefined()
  })
})

describe('migrateLink', () => {
  it('macht aus dem alten „abgelöst“ ein „gelöst“', () => {
    const old = { suchlageMissionId: 1, missionName: 'X', linkedAt: 0, sections: {}, remoteState: 'replaced' } as unknown as SuchlageLink
    expect(migrateLink(old)?.remoteState).toBe('released')
    const current: SuchlageLink = { suchlageMissionId: 1, missionName: 'X', linkedAt: 0, sections: {} }
    expect(migrateLink(current)).toBe(current)
    expect(migrateLink(null)).toBeNull()
  })
})
