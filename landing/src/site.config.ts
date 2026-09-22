/**
 * Zentrale Stellschrauben der Landingpage.
 *
 * `appUrl` zeigt auf die laufende Instanz der PWA. Solange keine eigene
 * Instanz veröffentlicht ist, kann hier auch eine Testinstanz oder das
 * Repository stehen — die Seite funktioniert unverändert.
 */
export const site = {
  name: 'Flugmappe',
  /** Untertitel, der den Namen überall dort erklärt, wo er allein steht. */
  tagline: 'Einsatzdokumentation für UAV-Trupps',
  /** URL der gehosteten Anwendung — zum Ausprobieren und für den Einsatz. */
  appUrl: 'https://app.flugmappe.de',
  repoUrl: 'https://github.com/rubenvitt/uav-checklists',
  issuesUrl: 'https://github.com/rubenvitt/uav-checklists/issues',
  /** Fassung, auf die sich die Beschreibungen dieser Seite beziehen. */
  revision: '2026.09',
} as const

/** Kennzahlen im Band unter dem Hero. */
export const keyFigures = [
  { value: '4', unit: 'Phasen', note: 'Einsatzdaten → Vorflug → Flüge → Nachbereitung' },
  { value: '9', unit: 'Wettermetriken', note: 'gegen die Grenzwerte der gewählten Drohne geprüft' },
  { value: '0', unit: 'Benutzerkonten', note: 'kein Login, keine Registrierung, keine Cloud' },
  { value: '56\u00a0h', unit: 'Aufbewahrung', note: 'danach löscht sich ein Einsatz selbst' },
] as const
