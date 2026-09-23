/** SORA-Version, auf der EGRED 2 und STS-BOS beruhen (bleibt laut STS-BOS „bis auf Weiteres“ gültig). */
export type SoraVersion = '2.0'

/** Robustheit eines OSO: O = Optional, L = Low, M = Medium, H = High (EGRED 2, Abb. 13). */
export type OsoRobustness = 'O' | 'L' | 'M' | 'H'

export type SoraAnnexId = 'bodenrisiko' | 'luftrisiko' | 'tmpr' | 'oso' | 'pdra'

/** Residuale Luftrisikoklasse nach SORA 2.0 (nicht die betreiberspezifische App-Klasse `ArcClass`). */
export type SoraArc = 'a' | 'b' | 'c' | 'd'

export interface SoraSource {
  /** Kurzbezeichnung für Quellenangaben, z. B. „EGRED 2“ */
  short: string
  title: string
  publisher: string
  edition: string
  url: string
}

/** Verweis auf eine Stelle in einer Quelle */
export interface SoraCitation {
  source: SoraSource
  /** z. B. „Anlage III, S. 63, Abb. 10“ */
  location: string
}

export interface GroundRiskMitigation {
  id: 'M1' | 'M2' | 'M3'
  label: string
  /** GRC-Korrektur je Robustheit (Niedrig/keine, Mittel, Hoch) als Anzeigetext */
  lowOrNone: string
  medium: string
  high: string
}

export interface OsoGroup {
  id: 'technik' | 'extern' | 'mensch' | 'umfeld'
  label: string
}

export interface Oso {
  /** OSO-Nummer 1–24 */
  number: number
  group: OsoGroup['id']
  label: string
  /** Robustheit je SAIL I–VI (Index 0 = SAIL I) */
  robustness: [OsoRobustness, OsoRobustness, OsoRobustness, OsoRobustness, OsoRobustness, OsoRobustness]
}

export interface TmprRequirement {
  arc: SoraArc
  /** Beschreibung des Luftraums */
  description: string
  /** Taktische Minderung (TMPR) */
  tmpr: string
  /** TMPR-Robustheit */
  robustness: string
}

export interface PdraOverview {
  id: string
  /** z. B. „wie STS-01“ */
  note?: string
  betriebsart: string
  einsatzgebiet: string
  luftraum: string
  maxFlughoehe: string
}

export interface StsBosScenario {
  id: string
  title: string
  subtitle: string
  /** Szenariospezifische Rahmenbedingungen (zusätzlich zu den gemeinsamen) */
  conditions: string[]
  /** Bedingungen je Betriebsart und charakteristischer Dimension (≤ 1 m / > 1 m bis < 3 m) */
  vlos: { upTo1m: string; upTo3m: string }
  bvlos: { upTo1m: string; upTo3m: string }
}
