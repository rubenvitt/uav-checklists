import { describe, expect, it } from 'vitest'
import type { NearbyCategory } from '../services/overpassApi'
import { mergeNearbyCategories, type ManualNearbyEntry } from './manualNearby'

const auto: NearbyCategory[] = [
  { key: 'hospital', label: 'Krankenhäuser', isLinear: false, items: [{ name: 'Klinikum', distance: 800, direction: 'SW' }] },
  { key: 'railway', label: 'Bahnanlagen', isLinear: true, items: [{ name: 'Bahnstrecke', distance: null, direction: null }] },
]

function entry(over: Partial<ManualNearbyEntry>): ManualNearbyEntry {
  return { id: 'm1', category: 'hospital', name: 'Landeplatz', distance: 300, direction: 'N', ...over }
}

describe('mergeNearbyCategories', () => {
  it('lässt das Abfrageergebnis ohne Handeinträge unverändert', () => {
    expect(mergeNearbyCategories(auto, [])).toBe(auto)
  })

  it('ordnet Handeinträge in die bestehende Objektart ein, nach Entfernung', () => {
    const merged = mergeNearbyCategories(auto, [entry({})])
    const hospital = merged.find((c) => c.key === 'hospital')!
    expect(hospital.items.map((i) => i.name)).toEqual(['Landeplatz', 'Klinikum'])
    expect(hospital.items[0].manualId).toBe('m1')
    expect(hospital.items[1].manualId).toBeUndefined()
    // Das Original bleibt unberührt
    expect(auto[0].items).toHaveLength(1)
  })

  it('legt fehlende Objektarten in Abfragereihenfolge an', () => {
    const merged = mergeNearbyCategories(auto, [entry({ id: 'm2', category: 'aviation', name: '' })])
    expect(merged.map((c) => c.key)).toEqual(['aviation', 'hospital', 'railway'])
    expect(merged[0].label).toBe('Flugplätze & Heliports')
    // Ohne Bezeichnung steht die Objektart
    expect(merged[0].items[0].name).toBe('Flugplätze & Heliports')
  })

  it('funktioniert ohne Abfrageergebnis und fängt unbekannte Arten als Sonstige auf', () => {
    const merged = mergeNearbyCategories([], [entry({ category: 'gibt-es-nicht', distance: null, direction: 'N' })])
    expect(merged).toHaveLength(1)
    expect(merged[0].key).toBe('other')
    // Ohne Entfernung keine Richtung
    expect(merged[0].items[0]).toMatchObject({ distance: null, direction: null })
  })
})
