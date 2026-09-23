import type { ArcClass } from '../components/ArcDetermination'
import type {
  GroundRiskMitigation,
  Oso,
  OsoGroup,
  OsoRobustness,
  PdraOverview,
  SoraAnnexId,
  SoraArc,
  SoraCitation,
  SoraSource,
  SoraVersion,
  StsBosScenario,
  TmprRequirement,
} from '../types/sora'

/**
 * SORA-Anhänge (Boden-/Luftrisiko, TMPR, OSO, PDRA) als statische Referenzdaten.
 *
 * Inhalte sind – soweit vorhanden – wörtlich bzw. sinngemäß aus den EGRED 2 (Anlage III)
 * und den STS-BOS übernommen. Beide beruhen auf SORA 2.0 und bleiben laut STS-BOS
 * „bis auf Weiteres“ gültig – unabhängig von SORA 2.5 (ED Decision 2025/018/R).
 * Die OSO-Übersetzung ist laut BBK eine freie, keine amtliche Übersetzung.
 */
export const SORA_VERSION: SoraVersion = '2.0'

// ── Quellen ──────────────────────────────────────────────────────────────

export const SOURCE_EGRED2: SoraSource = {
  short: 'EGRED 2',
  title: 'Empfehlungen für Gemeinsame Regelungen zum Einsatz von Drohnen im Bevölkerungsschutz (EGRED 2)',
  publisher: 'BBK',
  edition: 'Version 2, Stand Juni 2024',
  url: 'https://www.bbk.bund.de/egred',
}

export const SOURCE_STS_BOS: SoraSource = {
  short: 'STS-BOS',
  title: 'BOS-Standardszenarien (STS-BOS) zu den EGRED 2',
  publisher: 'BBK / LBA',
  edition: 'Version 1.0, Stand Juni 2025',
  url: 'https://www.lba.de/SharedDocs/Downloads/DE/B/B5_UAS/BBK_EGRED2_STS-BOS.html',
}

export const SOURCE_JARUS_ANNEX_D: SoraSource = {
  short: 'JARUS SORA Annex D',
  title: 'JARUS guidelines on SORA – Annex D: Tactical Mitigation Collision Risk Assessment',
  publisher: 'JARUS',
  edition: 'Edition 1.0, 30.01.2019',
  url: 'http://jarus-rpas.org/wp-content/uploads/2024/06/SORA-Annex-D-v1.0.pdf',
}

export const SOURCE_EAR: SoraSource = {
  short: 'EAR',
  title: 'Easy Access Rules for Unmanned Aircraft Systems – AMC1 Artikel 11 DVO (EU) 2019/947',
  publisher: 'EASA',
  edition: 'aktuelle Revision',
  url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-unmanned-aircraft-systems-regulations-eu',
}

// ── Anhänge (Navigation) ─────────────────────────────────────────────────

export interface SoraAnnexMeta {
  id: SoraAnnexId
  title: string
  subtitle: string
}

/** DOM-ID eines Anhangs, damit die Risikoklassifizierung dorthin springen kann */
export function soraAnnexElementId(idPrefix: string, annex: SoraAnnexId): string {
  return `${idPrefix}-sora-annex-${annex}`
}

/** Reihenfolge und Bezeichnungen der OM-Anhänge */
export const SORA_ANNEXES: SoraAnnexMeta[] = [
  { id: 'bodenrisiko', title: 'Minderung des Bodenrisikos', subtitle: 'Ground Risk Mitigation (M1–M3)' },
  { id: 'luftrisiko', title: 'Minderung des Luftrisikos', subtitle: 'Air Risk Category & strategische Minderung' },
  { id: 'tmpr', title: 'Taktische Minderung (TMPR)', subtitle: 'Tactical Mitigation Performance Requirements' },
  { id: 'oso', title: 'Sichere Betriebsschritte (OSO)', subtitle: 'Operational Safety Objectives' },
  { id: 'pdra', title: 'PDRA & Standardszenarien', subtitle: 'Predefined Risk Assessments, EU-STS, STS-BOS' },
]

// ── Minderung des Bodenrisikos ───────────────────────────────────────────

export const INTRINSIC_GRC_CITATION: SoraCitation = { source: SOURCE_EGRED2, location: 'Anlage III, S. 62, Abb. 9' }

/** Drohnenbezogene Bodenrisikoklasse (EGRED 2, Abb. 9) – Spalten: max. Abmaße 1 m / 3 m / 8 m / > 8 m */
export const INTRINSIC_GRC_COLUMNS = [
  { dimension: '1 m', energy: '< 700 J' },
  { dimension: '3 m', energy: '< 34 kJ' },
  { dimension: '8 m', energy: '< 1084 kJ' },
  { dimension: '> 8 m', energy: '< 1084 kJ' },
] as const

export const INTRINSIC_GRC_ROWS: Array<{ scenario: string; values: [number | null, number | null, number | null, number | null] }> = [
  { scenario: 'VLOS/BVLOS über kontrolliertem Gebiet (controlled ground area)', values: [1, 2, 3, 4] },
  { scenario: 'VLOS über dünn besiedeltem Gebiet', values: [2, 3, 4, 5] },
  { scenario: 'BVLOS über dünn besiedeltem Gebiet', values: [3, 4, 5, 6] },
  { scenario: 'VLOS über bewohntem Gebiet', values: [4, 5, 6, 8] },
  { scenario: 'BVLOS über bewohntem Gebiet', values: [5, 6, 8, 10] },
  { scenario: 'VLOS über Menschenansammlungen', values: [7, null, null, null] },
  { scenario: 'BVLOS über Menschenansammlungen', values: [8, null, null, null] },
]

export const GROUND_MITIGATION_CITATION: SoraCitation = { source: SOURCE_EGRED2, location: 'Anlage III, S. 62–63, Abb. 10' }

/** Auswirkungen der Minderungsmaßnahmen auf das Bodenrisiko (EGRED 2, Abb. 10; EAR Table 3) */
export const GROUND_RISK_MITIGATIONS: GroundRiskMitigation[] = [
  { id: 'M1', label: 'Strategische Minderung des Bodenrisikos', lowOrNone: '0: keine · −1: niedrig', medium: '−2', high: '−4' },
  { id: 'M2', label: 'Reduktion der Auswirkungen des Bodenaufschlages', lowOrNone: '0', medium: '−1', high: '−2' },
  { id: 'M3', label: 'Existenz eines Notfallplans', lowOrNone: '+1', medium: '0', high: '−1' },
]

export const GROUND_MITIGATION_RULE =
  'Zur Festlegung des Wertes des endgültigen Bodenrisikos ist die jeweils anwendbare Robustheitsziffer von der Ziffer für die zuvor gefundene Ground Risk Class abzuziehen bzw. ihr hinzuzufügen. Ein Wert, der höher ist als sieben, ist nach dem SORA-Verfahren nicht mehr zulässig.'

export const STS_BOS_GROUND_CITATION: SoraCitation = { source: SOURCE_STS_BOS, location: 'Ergänzende Hinweise, S. 9–11 und 14' }

/** Konkretisierung der Minderungen in den STS-BOS */
export const STS_BOS_GROUND_MITIGATIONS: Array<{ label: string; text: string }> = [
  {
    label: '„M1 Low“ – Reduzierung um Faktor 10',
    text: 'Die Gefährdetendichte wird um einen Faktor 10 niedriger angenommen als die Bevölkerungsdichte des Gebietes, z. B. wenn sich in der Nacht viele Personen in Gebäuden aufhalten.',
  },
  {
    label: '„M1 Medium“ – Reduzierung um Faktor 100',
    text: 'Bei einer Reduzierung der Gefährdetendichte um den Faktor 100 zur Bevölkerungsdichte muss dies durch offizielle Daten belegt und mittels einer zweiten Person überprüft und bestätigt werden.',
  },
  {
    label: 'Notfallplan (ERP) „high“ – Eingreifzeit (Hilfsfrist)',
    text: 'Ein Rettungsmittel mit geschulten Einsatzkräften ist innerhalb von 3 Minuten an der potenziellen Absturzstelle (3 Minuten entsprechen ca. 800 m fußläufig). Das beteiligte BOS-Betriebspersonal muss auf den ERP geschult und trainiert sein. Das Rettungsmittel muss an Größe und Art der Drohne angepasst sein.',
  },
]

export const STS_BOS_DENSITY_HINTS: string[] = [
  'Die Gefährdetendichte beschreibt die Anzahl der tatsächlich gefährdeten Personen im Flugbereich. Personen in geschlossenen Gebäuden gelten als nicht gefährdet (gilt für Drohnen bis max. 25 kg), Personen in Fahrzeugen gelten als gefährdet.',
  'Ermittlung der Bevölkerungsdichte z. B. über das dipul-Maptool (Layer: Siedlung und Industrieanlagen), Leitstelle (Geoportale) oder vorab vorgenommene Kategorisierungen. In Siedlungen, Industrie- und Gewerbegebieten ist im Allgemeinen mehr als 300 Personen/km² anzunehmen.',
  'BOS-Einsatzkräfte und weitere eingewiesene Beteiligte (z. B. Stadtwerke, Netzversorger) zählen nicht zu den unbeteiligten Personen und werden nicht in die Bevölkerungsdichte einbezogen.',
]

export const STS_BOS_BUFFER_CITATION: SoraCitation = { source: SOURCE_STS_BOS, location: 'Ergänzende Hinweise, S. 13, Tabellen 1 und 2' }

/** Grenzabstände (Contingency Volume + Ground Risk Buffer), Multikopter, max. CD 1,5 m, ballistischer Ansatz */
export const STS_BOS_BUFFER_TABLES: Array<{ title: string; rows: Array<{ height: number; total: string; parts: string }>; tip: string }> = [
  {
    title: 'Max. Fluggeschwindigkeit 12 m/s',
    rows: [
      { height: 30, total: '69,7 m', parts: '31,8 + 37,9' },
      { height: 50, total: '76,9 m', parts: '31,8 + 45,1' },
      { height: 70, total: '83,1 m', parts: '31,8 + 51,3' },
      { height: 100, total: '91,2 m', parts: '31,8 + 59,4' },
      { height: 120, total: '96,0 m', parts: '31,8 + 64,2' },
    ],
    tip: 'Bei einem festen Abstand von 100 m ist man auf der sicheren Seite (maximale Flughöhe 120 m).',
  },
  {
    title: '4 m/s (Langsamflug-Modus)',
    rows: [
      { height: 30, total: '23,9 m', parts: '12,5 + 11,4' },
      { height: 50, total: '26,7 m', parts: '12,5 + 14,2' },
      { height: 70, total: '28,9 m', parts: '12,5 + 16,4' },
      { height: 100, total: '31,8 m', parts: '12,5 + 19,3' },
      { height: 120, total: '33,5 m', parts: '12,5 + 21,0' },
    ],
    tip: 'Bei Einhaltung der 1:1-Regel ist man im Langsamflug-Modus auf der sicheren Seite (bei Mindestabstand 13 m).',
  },
]

// ── Minderung des Luftrisikos ────────────────────────────────────────────

export const AIR_RISK_CITATION: SoraCitation = { source: SOURCE_EGRED2, location: 'Anlage III, S. 63–65, Abb. 11' }

export const INITIAL_ARC_TEXT =
  'Die Luftrisikokategorien bewerten den Luftraum, in dem geflogen wird, hinsichtlich des Kollisionsrisikos. Sie sind charakterisiert durch Höhe, kontrollierten bzw. unkontrollierten Luftraum, Airport-/Heliport- bzw. Nicht-Airport-/Nicht-Heliport-Umgebung, Luftraum über städtischer bzw. ländlicher Umgebung und schließlich atypischen (z. B. gesperrten) bzw. typischen Luftraum. Die initiale ARC kann durch strategische Minderungsmaßnahmen (Step 5) sowie durch taktische Minderungsmaßnahmen (Step 6) modifiziert bzw. herabgesenkt werden.'

/** Beschreibung der Luftrisikoklassen (EGRED 2, S. 63 und 65) */
export const ARC_DESCRIPTIONS: Record<SoraArc, string> = {
  a: 'Luftraum, in dem das Kollisionsrisiko ohne weitere Maßnahmen in einem akzeptablen Maß gering ist. Dies kann meist nur für besondere Luftraumklassen erreicht werden.',
  b: 'Die Möglichkeit, bemannten Luftfahrzeugen zu begegnen, ist eher gering, aber nicht vernachlässigenswert, und/oder die strategischen Minderungsmöglichkeiten erfassen den größten Teil des Risikos und das verbleibende Kollisionsrisiko ist entsprechend gering.',
  c: 'Die Möglichkeit, bemannten Luftfahrzeugen zu begegnen, ist durchaus gegeben und/oder die strategischen Minderungsmöglichkeiten liegen im Mittelfeld.',
  d: 'Entweder ist die Rate der möglichen Begegnungen mit bemannten Luftfahrzeugen hoch und/oder die verfügbaren strategischen Minderungsmöglichkeiten sind gering.',
}

export const STRATEGIC_AIR_MITIGATION_TEXT =
  'Die Minderung der initialen Luftrisikoklasse durch strategische Maßnahmen bietet dem Betreiber die Möglichkeit, bei einem Einsatz in einem festgelegten Luftraum mit einer bestimmten ARC eine geringere Verkehrsdichte nachzuweisen. „Strategisch“ sind Maßnahmen, welche die Luftrisikokategorie bereits vor dem Start der Operation minimieren, wie beispielsweise Einsatzzeiten außerhalb der normalen Flugzeiten der bemannten Luftfahrt, sehr kurze Flugzeiten der Drohne oder vorab geklärte gemeinsame Flugregeln von bemannter und unbemannter Luftfahrt.'

export const ADJACENT_AREA_CITATION: SoraCitation = { source: SOURCE_EGRED2, location: 'Anlage III, S. 68' }

export const ADJACENT_AREA_TEXT =
  'Nicht nur das geplante Fluggebiet, sondern auch angrenzende Gebiete sind zu bewerten, da die Drohne bei ungewöhnlichem Verhalten die Grenzen des Einsatzgebiets überschreiten könnte. Zur Bestimmung der Abmaße des angrenzenden Luftraums sollte sich an der zurückgelegten Strecke bei 120 Sek. durchschnittlicher Fluggeschwindigkeit orientiert werden. Zugelassene Enhanced-Containment-Systeme können Zeit und Abmaße reduzieren.'

export const STS_BOS_AIRSPACE_CITATION: SoraCitation = { source: SOURCE_STS_BOS, location: 'Ergänzende Hinweise, S. 14' }

export const STS_BOS_AIRSPACE_RULES: Array<{ label: string; text: string }> = [
  {
    label: 'Kontrollzone',
    text: 'Flüge nur nach Flugverkehrskontrollfreigabe durch den Tower oder bei Nutzung einer Allgemeinverfügung (NfL 2023-1-2705 DFS, NfL 2023-1-2888 Austro Control, NfL 2022-1-2670 DFS Aviation Services). NfL vor Beginn auf Aktualität prüfen; Absprachen mit dem Tower sind empfehlenswert.',
  },
  {
    label: 'ED-R (Gebiet mit Flugbeschränkung)',
    text: 'Eine individuelle Flugfreigabe ist vom Verantwortlichen der ED-R einzuholen; Bedingungen aus NfL/NOTAM bzw. AIP ENR 5.1. Ein Betrieb ohne Freigabe wird geahndet – BOS sind nicht ausgenommen.',
  },
]

// ── Taktische Minderung (TMPR) ───────────────────────────────────────────

export const TMPR_CITATION: SoraCitation = { source: SOURCE_EGRED2, location: 'Anlage III, S. 64–65' }
export const TMPR_TABLE_CITATION: SoraCitation = { source: SOURCE_JARUS_ANNEX_D, location: 'Table 1; EAR AMC1 Art. 11, Step #6' }

export const TMPR_VLOS_TEXT =
  'VLOS und EVLOS können als akzeptable taktische Maßnahme zur Erreichung des Luftsicherheitsziels angesehen werden. Bei einem solchen Betrieb müssen deshalb keine weiteren TMPR ergriffen werden; auch die diesbezüglichen Robustheitsanforderungen müssen nicht eingehalten werden. Unabhängig davon sollte der Betreiber ein VLOS/EVLOS-„De-Confliction“-Schema dokumentiert haben, in dem dargestellt wird, welche Detektionsmethoden angewendet werden.'

export const TMPR_BVLOS_TEXT =
  'Für den BVLOS-Betrieb ist die verbleibende ARC zugrunde zu legen. Hierzu werden technische Maßnahmen wie „Detect and avoid“- oder „Traffic Alert and Collision Avoidance“-Systeme zur Reduzierung der Luftrisikokategorie eingesetzt. In Zukunft sollen auch U-Space-Dienste zur Verringerung des Luftrisikos beitragen.'

/** TMPR und TMPR-Robustheit je verbleibender ARC (JARUS SORA Annex D, Table 1; EAR AMC1 Art. 11 Step #6) */
export const TMPR_REQUIREMENTS: TmprRequirement[] = [
  { arc: 'd', description: ARC_DESCRIPTIONS.d, tmpr: 'Hoch (High Performance)', robustness: 'Hoch' },
  { arc: 'c', description: ARC_DESCRIPTIONS.c, tmpr: 'Mittel (Medium Performance)', robustness: 'Mittel' },
  { arc: 'b', description: ARC_DESCRIPTIONS.b, tmpr: 'Niedrig (Low Performance)', robustness: 'Niedrig' },
  { arc: 'a', description: ARC_DESCRIPTIONS.a, tmpr: 'Keine Anforderung', robustness: 'Keine Anforderung' },
]

/**
 * Ordnet die App-Luftrisikoklasse einer SORA-ARC zu. ARC-c* ist betreiberspezifisch
 * (Betriebshandbuch) und ARC-c/d nicht eindeutig – beide liefern `null`.
 */
export function toSoraArc(arc: ArcClass | null): SoraArc | null {
  if (arc === 'a' || arc === 'b') return arc
  return null
}

export type TmprResult =
  | { kind: 'unknown' }
  | { kind: 'vlos' }
  | { kind: 'bvlos'; requirement: TmprRequirement }
  | { kind: 'bvlos-unmapped' }

/** Ermittelt die TMPR-Anforderung aus Betriebsart und App-ARC. */
export function getTmpr(flightType: 'vlos' | 'bvlos' | null, arc: ArcClass | null): TmprResult {
  if (flightType === 'vlos') return { kind: 'vlos' }
  if (flightType !== 'bvlos' || arc === null) return { kind: 'unknown' }
  const soraArc = toSoraArc(arc)
  const requirement = soraArc ? TMPR_REQUIREMENTS.find((r) => r.arc === soraArc) : undefined
  return requirement ? { kind: 'bvlos', requirement } : { kind: 'bvlos-unmapped' }
}

/** Kurztext der TMPR-Anforderung (z. B. für den PDF-Report) */
export function describeTmpr(result: TmprResult): string {
  switch (result.kind) {
    case 'vlos': return 'Nicht erforderlich (VLOS) – De-Confliction-Schema'
    case 'bvlos':
      return result.requirement.arc === 'a'
        ? 'ARC-a: keine TMPR-Anforderung'
        : `ARC-${result.requirement.arc}: ${result.requirement.tmpr}, Robustheit ${result.requirement.robustness}`
    case 'bvlos-unmapped': return 'Gemäß Betriebshandbuch'
    case 'unknown': return 'Nicht bestimmt'
  }
}

// ── Sichere Betriebsschritte (OSO) ───────────────────────────────────────

export const OSO_CITATION: SoraCitation = { source: SOURCE_EGRED2, location: 'Anlage III, S. 66–67, Abb. 13' }

export const OSO_TRANSLATION_NOTE =
  'Die Inhalte der Tabelle wurden zur leichteren Nutzbarkeit „frei“ aus dem Englischen übersetzt; es handelt sich um keine amtliche Übersetzung. Die exakten Definitionen von O, L, M, H sind den EAR, Annex E zu AMC1 zu Artikel 11, zu entnehmen.'

export const OSO_ROBUSTNESS_LABELS: Record<OsoRobustness, string> = {
  O: 'Optional',
  L: 'Low',
  M: 'Medium',
  H: 'High',
}

export const OSO_GROUPS: OsoGroup[] = [
  { id: 'technik', label: 'Technische Probleme mit dem UAS' },
  { id: 'extern', label: 'Funktionsbeeinträchtigungen externer Unterstützungssysteme' },
  { id: 'mensch', label: 'Menschliches Versagen' },
  { id: 'umfeld', label: 'Ungünstige Betriebsbedingungen' },
]

/** Operative Sicherheitsziele mit Robustheit je SAIL I–VI (EGRED 2, Abb. 13) */
export const OSOS: Oso[] = [
  { number: 1, group: 'technik', label: 'Der Drohnensteuerer ist befähigt/kompetent', robustness: ['O', 'L', 'M', 'H', 'H', 'H'] },
  { number: 2, group: 'technik', label: 'Die Drohne wurde von einem erfahrenen/bewährten Unternehmen gefertigt', robustness: ['O', 'O', 'L', 'M', 'H', 'H'] },
  { number: 3, group: 'technik', label: 'Die Drohne wird von einer erfahrenen/bewährten Stelle gewartet', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 4, group: 'technik', label: 'Die Drohne wurde nach anerkannten Standards gefertigt', robustness: ['O', 'O', 'O', 'L', 'M', 'H'] },
  { number: 5, group: 'technik', label: 'Die Drohne wurde unter Berücksichtigung von Zuverlässigkeit und Sicherheit des Systems entwickelt', robustness: ['O', 'O', 'L', 'M', 'H', 'H'] },
  { number: 6, group: 'technik', label: 'Die Leistung des C3-Links ist für den Betrieb angemessen', robustness: ['O', 'L', 'L', 'M', 'H', 'H'] },
  { number: 7, group: 'technik', label: 'Inspektion des UAS (Produktinspektion), um die Übereinstimmung mit den ConOps sicherzustellen', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 8, group: 'technik', label: 'Die Betriebsabläufe sind definiert, validiert und werden eingehalten (um mit technischen Problemen umgehen zu können)', robustness: ['L', 'M', 'H', 'H', 'H', 'H'] },
  { number: 9, group: 'technik', label: 'Das Bedienpersonal ist trainiert sowie auf dem neuesten Stand und in der Lage, ungewöhnliche Situationen (z. B. Notfallsituationen) zu kontrollieren', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 10, group: 'technik', label: 'Sichere Behebung eines technischen Problems', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 11, group: 'extern', label: 'Eingeführte Verfahrensweisen, wie mit Funktionsbeeinträchtigungen externer Unterstützungssysteme umzugehen ist', robustness: ['L', 'M', 'H', 'H', 'H', 'H'] },
  { number: 12, group: 'extern', label: 'Das UAS ist konstruktiv in der Lage, Funktionsbeeinträchtigungen externer Unterstützungssysteme zu bewältigen', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 13, group: 'extern', label: 'Externe Dienste zur Unterstützung des UAS-Betriebes sind auf den Betrieb zugeschnitten', robustness: ['L', 'L', 'M', 'H', 'H', 'H'] },
  { number: 14, group: 'mensch', label: 'Betriebsverfahren sind definiert, validiert und werden befolgt', robustness: ['L', 'M', 'H', 'H', 'H', 'H'] },
  { number: 15, group: 'mensch', label: 'Das Bedienpersonal ist trainiert sowie auf dem neuesten Stand und in der Lage, ungewöhnliche Situationen (z. B. Notfallsituationen) zu kontrollieren', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 16, group: 'mensch', label: 'Koordinierung mehrerer Drohnenteams/Einsatzkräfte', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 17, group: 'mensch', label: 'Das Betriebspersonal ist einsatzfähig', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 18, group: 'mensch', label: 'Automatischer Schutz des „flight envelope“ (Flugbereichsgrenze) gegen menschliches Versagen', robustness: ['O', 'O', 'L', 'M', 'H', 'H'] },
  { number: 19, group: 'mensch', label: 'Sichere Behebung eines durch menschliches Versagen verursachten Problems', robustness: ['O', 'O', 'L', 'M', 'M', 'H'] },
  { number: 20, group: 'mensch', label: 'Es wurde eine Bewertung der menschlichen Faktoren durchgeführt und die Mensch-Maschine-Schnittstelle (HMI) als für den Einsatz geeignet befunden', robustness: ['O', 'L', 'L', 'M', 'M', 'H'] },
  { number: 21, group: 'umfeld', label: 'Betriebsverfahren sind definiert, validiert und werden befolgt', robustness: ['L', 'M', 'H', 'H', 'H', 'H'] },
  { number: 22, group: 'umfeld', label: 'Das Betriebspersonal ist darauf trainiert, kritische Umfeldbedingungen zu identifizieren und zu vermeiden', robustness: ['L', 'L', 'M', 'M', 'M', 'H'] },
  { number: 23, group: 'umfeld', label: 'Die Umfeldbedingungen für den sicheren Betrieb sind definiert, messbar und werden eingehalten', robustness: ['L', 'L', 'M', 'M', 'H', 'H'] },
  { number: 24, group: 'umfeld', label: 'Das UAS ist für ungünstige Umfeldbedingungen konstruiert und qualifiziert (z. B. passende Sensoren, DO-160-Qualifizierung)', robustness: ['O', 'O', 'M', 'H', 'H', 'H'] },
]

export const SAIL_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const

export function formatOsoNumber(n: number): string {
  return `OSO #${String(n).padStart(2, '0')}`
}

/** Robustheit eines OSO für ein SAIL (1–6) */
export function getOsoRobustness(oso: Oso, sail: number): OsoRobustness {
  return oso.robustness[Math.min(Math.max(sail, 1), 6) - 1]
}

/** OSO-Nummern für ein SAIL, gruppiert nach geforderter Robustheit (H → M → L → O) */
export function groupOsosByRobustness(sail: number): Array<{ robustness: OsoRobustness; numbers: number[] }> {
  const order: OsoRobustness[] = ['H', 'M', 'L', 'O']
  return order
    .map((robustness) => ({
      robustness,
      numbers: OSOS.filter((o) => getOsoRobustness(o, sail) === robustness).map((o) => o.number),
    }))
    .filter((g) => g.numbers.length > 0)
}

// ── PDRA & Standardszenarien ─────────────────────────────────────────────

export const PDRA_CITATION: SoraCitation = { source: SOURCE_EGRED2, location: 'Anlage III, S. 70–71, Abb. 15' }

export const PDRA_INTRO: string[] = [
  'Zur Vermeidung sich ständig wiederholender SORA-Verfahren bei standardisierten Einsätzen und/oder bei geringem Risiko empfiehlt es sich, sich an den Vorgaben der EASA für STS (EU-STS), an den STS-BOS oder PDRA zu orientieren.',
  'Den PDRAs liegt die SORA-Methode zugrunde; Minderungsmaßnahmen und OSOs sind bereits in die tabellarische Beschreibung des UAS-Betriebs einbezogen (AMC zu Artikel 11 DVO (EU) 2019/947). Es wird empfohlen, sich bei Bedarf nach dem jeweiligen PDRA in Gänze zu richten. Auch hier ist ein Betriebshandbuch zu erstellen und die Erfüllung der Anforderungen nachzuweisen.',
  'Eine PDRA kommt nur für Drohnen mit einem maximalen Umfang von 3 m und/oder einer kinetischen Energie von bis zu 34 kJ in Betracht. PDRA-S sind an die STS angelehnt (dieselben Operationen, ohne Klassenmarkierung); PDRA-G decken weitere, relativ häufige spezielle Drohnenoperationen ab.',
]

export const PDRA_OVERVIEW: PdraOverview[] = [
  { id: 'PDRA-S01', note: 'wie STS-01', betriebsart: 'VLOS', einsatzgebiet: 'Kontrolliertes Gebiet', luftraum: 'Kontrolliert und unkontrolliert', maxFlughoehe: '150 m' },
  { id: 'PDRA-S02', note: 'wie STS-02', betriebsart: 'BVLOS', einsatzgebiet: 'Kontrolliertes Gebiet', luftraum: 'Kontrolliert oder unkontrolliert', maxFlughoehe: '150 m' },
  { id: 'PDRA-G01', betriebsart: 'BVLOS', einsatzgebiet: 'Dünn besiedelt', luftraum: 'Unkontrolliert', maxFlughoehe: '150 m' },
  { id: 'PDRA-G02', betriebsart: 'BVLOS', einsatzgebiet: 'Dünn besiedelt', luftraum: 'Reserviert oder abgesperrt', maxFlughoehe: 'Nicht eingeschränkt' },
  { id: 'PDRA-G03', betriebsart: 'BVLOS', einsatzgebiet: 'Dünn besiedelt', luftraum: 'Kontrollierter oder unkontrollierter Luftraum', maxFlughoehe: 'Unter 30 m oder in der Nähe von Hindernissen (15 m Abstand) und unter Beachtung des „Contingency Volume“' },
]

export const STS_BOS_CITATION: SoraCitation = { source: SOURCE_STS_BOS, location: 'S. 3–14' }

/** Gemeinsame Rahmenbedingungen aller STS-BOS */
export const STS_BOS_COMMON_CONDITIONS: string[] = [
  'Betrieb im SAIL II',
  'Ausschließlich in Verbindung mit der aktuellen Fassung der EGRED 2 zu verwenden',
  'Keine Tag-/Nacht-Unterscheidung (bei Nacht: Beleuchtung nach EGRED 2 eingeschaltet)',
  'Maximale Flughöhe über Grund (AGL) 120 m',
  'Werden Heliports, PIS (Public Interest Sites) oder Flugplätze tangiert, sind Absprachen/Koordinierungen notwendig und durchzuführen',
  'Luftraum G (unkontrollierter Luftraum), keine Kontrollzone (Kontrollzone siehe Ergänzende Hinweise)',
  'Kein Flug über Menschenansammlungen',
  'Einsatzkräfte gelten als beteiligte Personen (werden in die Lage eingewiesen)',
]

export const STS_BOS_SCENARIOS: StsBosScenario[] = [
  {
    id: 'DE.STS.BOS-01',
    title: 'Flug über Einsatzstellen',
    subtitle: 'Controlled Ground Area',
    conditions: [
      'Kontrollierter Bereich am Boden ist gleich Einsatzgebiet (dynamisch an die Lage anzupassen). Der Zutritt unbeteiligter Personen („Dritter“) ist zu verhindern.',
      'Festlegung des Fluggebietes von außen nach innen: Die äußere Grenze des Ground Risk Buffer entspricht der Grenze zwischen Einsatzkräften und unbeteiligten Personen (u. a. Absperrung).',
    ],
    vlos: { upTo1m: 'OK', upTo3m: 'OK' },
    bvlos: { upTo1m: 'OK', upTo3m: 'OK' },
  },
  {
    id: 'DE.STS.BOS-02',
    title: 'Flug über ländlichem Gebiet',
    subtitle: 'Sparsely Populated Area',
    conditions: [
      'Bestimmung des Fluggebietes vom Standort des BOS-Drohnensteuerers',
      'Bei VLOS Beachtung der entsprechenden Distanzen',
      'Bei BVLOS keine Überlappung des Ground Risk Buffer mit bebauten Gebieten (Wohn-, Gewerbe-, Industrie- oder Erholungsgebiete)',
    ],
    vlos: { upTo1m: 'OK', upTo3m: 'OK' },
    bvlos: {
      upTo1m: 'OK',
      upTo3m: 'OK, wenn die Gefährdetendichte um einen Faktor 10 niedriger als die Bevölkerungsdichte des Gebietes oder ≤ 30 Personen/km² ist. Dies wird durch den BOS-Drohnensteuerer dokumentiert.',
    },
  },
  {
    id: 'DE.STS.BOS-03',
    title: 'Flug im urbanen Gebiet',
    subtitle: 'Populated Area',
    conditions: ['Bestimmung des Fluggebietes vom Standort des BOS-Drohnensteuerers'],
    vlos: {
      upTo1m: 'OK, wenn ein Rettungsmittel mit geschulten Einsatzkräften innerhalb der Eingreifzeit von 3 Minuten (Hilfsfrist) an der potenziellen Absturzstelle ist.',
      upTo3m: 'OK, wenn die Gefährdetendichte um einen Faktor 10 niedriger als die Bevölkerungsdichte des Gebietes oder ≤ 300 Personen/km² ist (dokumentiert durch den BOS-Drohnensteuerer) UND ein Rettungsmittel mit geschulten Einsatzkräften innerhalb von 3 Minuten (Hilfsfrist) an der potenziellen Absturzstelle ist.',
    },
    bvlos: {
      upTo1m: 'OK bei Variante 1: Die aktuelle Gefährdetendichte ist um einen Faktor 100 niedriger als die generelle Bevölkerungsdichte oder ≤ 300 Personen/km². ODER Variante 2: Rettungsmittel innerhalb von 3 Minuten (Hilfsfrist) UND Gefährdetendichte um einen Faktor 10 niedriger oder ≤ 300 Personen/km². Jeweils durch den BOS-Drohnensteuerer dokumentiert, auf Basis offizieller Daten, von einer zweiten Person überprüft und bestätigt.',
      upTo3m: 'OK, wenn ein Rettungsmittel innerhalb von 3 Minuten (Hilfsfrist) an der potenziellen Absturzstelle ist UND die Gefährdetendichte um einen Faktor 100 niedriger als die Bevölkerungsdichte oder ≤ 300 Personen/km² ist – dokumentiert durch den BOS-Drohnensteuerer, auf Basis offizieller Daten, von einer zweiten Person überprüft und bestätigt.',
    },
  },
]

/** Ergänzende Hinweise, die für alle STS-BOS zwingend gelten */
export const STS_BOS_NOTES: string[] = [
  'Die STS-BOS sind zwingend mit den „Ergänzenden Hinweisen“ anzuwenden und nur in der jeweils aktuellsten Fassung ohne Veränderungen. Organisationsspezifische Änderungen erfordern eine neue SORA.',
  'Für die DE.STS.BOS ist ein zusätzliches, eigenverantwortlich entwickeltes Modul in der BOS-Drohnenausbildung zwingend erforderlich.',
  'Vor Nutzung eines Szenarios muss ein Betriebshandbuch erstellt werden (Formulierungshilfe des LBA).',
  'Die STS-BOS gelten nicht für fest stationierte/gedockte Drohnen (Drohnen-Hangar).',
]

// ── Formatierung ─────────────────────────────────────────────────────────

export function formatCitation(c: SoraCitation): string {
  return `${c.source.short} (${c.source.edition}), ${c.location}`
}
