// Vollständigkeit des Abschnitts Einsatzkarte (Phase Einsatzdaten).
// EinsatzkarteSection speichert Karte und Foto über useSegmentPersistedState,
// also unter `seg:<id>:einsatzkarte:…`. Einsätze von vor den Abschnitten tragen
// die Schlüssel ohne Präfix; die gelten weiter, solange der Abschnitt selbst
// noch nichts gespeichert hat (wie die übrigen Felder in useSectionCompleteness).

export function isEinsatzkarteComplete(
  s: Record<string, unknown>,
  segPrefix: string,
  suchlageLinked: boolean,
): boolean {
  const read = (key: string) => s[`${segPrefix}${key}`] ?? s[key]
  if (suchlageLinked) {
    // Verknüpft mit Suchlage: Karte aus Suchlage geladen oder Foto vorhanden
    return !!s[`${segPrefix}suchlage:map`] || !!s[`${segPrefix}einsatzkarte:photo`]
  }
  return !!(read('einsatzkarte:snapshot') || read('einsatzkarte:photo'))
}
