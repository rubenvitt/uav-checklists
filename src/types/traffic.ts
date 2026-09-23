import type { MetricStatus } from './assessment'

/** Ein Luftfahrzeug aus den ADS-B-Daten, bezogen auf den Einsatzort. */
export interface TrafficAircraft {
  /** ICAO-24-Bit-Adresse (hex) — stabil je Luftfahrzeug */
  hex: string
  callsign: string | null
  registration: string | null
  /** ICAO-Typcode, z. B. „EC35“ */
  typeCode: string | null
  description: string | null
  /** ADS-B-Emitterkategorie, z. B. „A7“ (Drehflügler) */
  category: string | null
  isRotorcraft: boolean
  isMilitary: boolean
  lat: number
  lon: number
  distanceM: number
  bearingDeg: number
  direction: string
  onGround: boolean
  /** Höhe in ft ü. NN — geometrisch (GNSS) bevorzugt, sonst barometrisch */
  altitudeFt: number | null
  groundSpeedKt: number | null
  trackDeg: number | null
  verticalRateFpm: number | null
  squawk: string | null
  /** Notfallstatus (nur gesetzt, wenn ≠ „none“) */
  emergency: string | null
  /** Sekunden seit der letzten Positionsmeldung */
  seenPosSec: number | null
}

/** Momentaufnahme des Flugverkehrs im Umkreis (wird je Einsatzabschnitt gespeichert). */
export interface FlightTrafficSnapshot {
  /** Zeitpunkt der Abfrage (ISO) */
  fetchedAt: string
  /** Datenquelle, z. B. „adsb.lol“ */
  source: string
  radiusKm: number
  lat: number
  lon: number
  /** Nach Entfernung sortiert, auf den Suchradius begrenzt */
  aircraft: TrafficAircraft[]
}

export interface TrafficAircraftAssessment {
  aircraft: TrafficAircraft
  status: MetricStatus
  /** Geschätzte Höhe über Grund in m (bzw. über NN, wenn die Geländehöhe fehlt) */
  heightM: number | null
}

export interface TrafficAssessment {
  overall: MetricStatus
  /** Alle Luftfahrzeuge mit Einzelbewertung, nach Entfernung sortiert */
  items: TrafficAircraftAssessment[]
  /** Anzahl Luftfahrzeuge in der Luft im Suchradius */
  airborneCount: number
  /** Anzahl tieffliegender Luftfahrzeuge (≤ Höhenfilter) im Suchradius */
  lowLevelCount: number
  /** Nächstes tieffliegendes Luftfahrzeug */
  nearestLowLevel: TrafficAircraftAssessment | null
  /** Höhenangaben beziehen sich auf Grund (true) oder nur auf NN (false) */
  heightIsAgl: boolean
  recommendations: string[]
}

/* ── Überwachung während der Flüge ────────────────────────── */

/** Bereits gemeldetes Luftfahrzeug (je Einsatzabschnitt gespeichert) */
export interface TrafficMonitorTrack {
  /** Zeitpunkt der letzten Sichtung (ISO) */
  lastSeen: string
  /** Höchste bisher gemeldete Stufe — erneut gemeldet wird nur eine Verschärfung */
  alertedStatus: MetricStatus
}

export interface TrafficMonitorState {
  /** `fetchedAt` des zuletzt ausgewerteten Snapshots (ISO) */
  lastProcessedAt: string | null
  /** Nach ICAO-Adresse (hex) */
  tracked: Record<string, TrafficMonitorTrack>
}

export interface TrafficAlertItem {
  hex: string
  label: string
  /** `new` = neu aufgetaucht, `closer` = bekannt, aber jetzt kritischer */
  kind: 'new' | 'closer'
  status: MetricStatus
  typeCode: string | null
  isRotorcraft: boolean
  isMilitary: boolean
  emergency: string | null
  heightM: number | null
  distanceM: number
  direction: string
}

/** Meldung der Überwachung — eine je Abfrage mit neuen/kritischeren Luftfahrzeugen */
export interface TrafficAlert {
  id: string
  /** Zeitpunkt der zugrunde liegenden Abfrage (ISO) */
  at: string
  status: MetricStatus
  heightIsAgl: boolean
  items: TrafficAlertItem[]
}
