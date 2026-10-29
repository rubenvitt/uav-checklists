import { describe, expect, it } from 'vitest'
import { isEinsatzkarteComplete } from './einsatzkarteState'

const seg = 'seg:abc:'

describe('isEinsatzkarteComplete', () => {
  it('Karte im aktiven Abschnitt gilt als vollständig', () => {
    expect(isEinsatzkarteComplete({ 'seg:abc:einsatzkarte:snapshot': 'data:image/png;base64,x' }, seg, false)).toBe(true)
  })

  it('Foto im aktiven Abschnitt gilt als vollständig', () => {
    expect(isEinsatzkarteComplete({ 'seg:abc:einsatzkarte:photo': 'data:image/jpeg;base64,x' }, seg, false)).toBe(true)
  })

  it('nichts gespeichert → unvollständig', () => {
    expect(isEinsatzkarteComplete({}, seg, false)).toBe(false)
  })

  it('Karte eines anderen Abschnitts zählt nicht', () => {
    expect(isEinsatzkarteComplete({ 'seg:other:einsatzkarte:snapshot': 'x' }, seg, false)).toBe(false)
  })

  it('alte Einsätze ohne Präfix bleiben vollständig', () => {
    expect(isEinsatzkarteComplete({ 'einsatzkarte:snapshot': 'x' }, seg, false)).toBe(true)
    expect(isEinsatzkarteComplete({ 'einsatzkarte:photo': 'x' }, '', false)).toBe(true)
  })

  it('im Abschnitt geleerte Karte schlägt die Altdaten', () => {
    expect(isEinsatzkarteComplete({ 'seg:abc:einsatzkarte:snapshot': '', 'einsatzkarte:snapshot': 'x' }, seg, false)).toBe(false)
  })

  it('mit Suchlage: geladene Karte oder Foto des Abschnitts', () => {
    expect(isEinsatzkarteComplete({ 'seg:abc:suchlage:map': { features: [] } }, seg, true)).toBe(true)
    expect(isEinsatzkarteComplete({ 'seg:abc:einsatzkarte:photo': 'x' }, seg, true)).toBe(true)
    expect(isEinsatzkarteComplete({ 'einsatzkarte:snapshot': 'x' }, seg, true)).toBe(false)
  })
})
