import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyStorageChange,
  getMissionAtom,
  handleStorageEvent,
  parseMissionStorageKey,
  setMissionField,
} from './missionFormStore'

const M = '0d6c1f6e-2b1a-4c7e-9a43-5f0b8a7d1c22'

function entry(value: unknown) {
  return JSON.stringify({ value, timestamp: Date.now() })
}

/** Minimaler Ersatz für localStorage (Vitest läuft ohne DOM). */
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
    clear: () => map.clear(),
  }
}

describe('parseMissionStorageKey', () => {
  it('zerlegt Einsatz und Feld, auch mit Doppelpunkten im Feld', () => {
    expect(parseMissionStorageKey(`uav-form:${M}:suchlage:outbox`)).toEqual({ missionId: M, key: 'suchlage:outbox' })
  })

  it('ignoriert fremde und unvollständige Schlüssel', () => {
    expect(parseMissionStorageKey('uav-missions')).toBeNull()
    expect(parseMissionStorageKey('uav-form:theme')).toBeNull()
    expect(parseMissionStorageKey(`uav-form:${M}:`)).toBeNull()
  })
})

describe('applyStorageChange', () => {
  it('übernimmt einen neuen Wert und lässt andere Felder stehen', () => {
    const state = { flightLog: [1], crew: 'A' }
    expect(applyStorageChange(state, 'flightLog', entry([1, 2]))).toEqual({ flightLog: [1, 2], crew: 'A' })
  })

  it('entfernt ein gelöschtes Feld', () => {
    expect(applyStorageChange({ a: 1, b: 2 }, 'a', null)).toEqual({ b: 2 })
  })

  it('lässt den Zustand bei unbekanntem Löschen und kaputtem Eintrag unverändert', () => {
    const state = { a: 1 }
    expect(applyStorageChange(state, 'x', null)).toBe(state)
    expect(applyStorageChange(state, 'a', '{kaputt')).toBe(state)
    expect(applyStorageChange(state, 'a', '42')).toBe(state)
  })
})

describe('handleStorageEvent', () => {
  let storage: Storage

  beforeEach(() => {
    storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
  })

  it('zieht einen Flugbucheintrag aus Tab A in Tab B nach', () => {
    const atom = getMissionAtom(M)
    setMissionField(M, 'flightLog', [{ id: 'f1' }])

    // Tab A schreibt direkt in den gemeinsamen Speicher …
    const value = entry([{ id: 'f1' }, { id: 'f2' }])
    storage.setItem(`uav-form:${M}:flightLog`, value)
    handleStorageEvent({ key: `uav-form:${M}:flightLog`, newValue: value, storageArea: storage })

    expect(atom.get().flightLog).toEqual([{ id: 'f1' }, { id: 'f2' }])

    // … und der nächste Schreibvorgang in Tab B baut auf dem frischen Stand auf.
    const prev = atom.get().flightLog as Array<{ id: string }>
    setMissionField(M, 'flightLog', [...prev, { id: 'f3' }])
    expect(JSON.parse(storage.getItem(`uav-form:${M}:flightLog`)!).value).toEqual([{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }])
  })

  it('lädt nach clear() alle bekannten Einsätze neu', () => {
    const atom = getMissionAtom(M)
    setMissionField(M, 'crew', 'A')
    storage.clear()
    handleStorageEvent({ key: null, newValue: null, storageArea: storage })
    expect(atom.get()).toEqual({})
  })

  it('ignoriert sessionStorage', () => {
    const atom = getMissionAtom(M)
    setMissionField(M, 'crew', 'A')
    handleStorageEvent({ key: `uav-form:${M}:crew`, newValue: entry('B'), storageArea: fakeStorage() })
    expect(atom.get().crew).toBe('A')
  })
})
