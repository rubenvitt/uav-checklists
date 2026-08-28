export interface CheckItem {
  key: string
  label: string
  hint?: string
}

export const AUFSTIEGSORT_ITEMS: CheckItem[] = [
  { key: 'flaeche', label: 'Ebene Fläche (min. 1×1 m) für Landeplatz' },
  { key: 'homepoint', label: 'Homepoint nach Norden ausgerichtet' },
  { key: 'hindernisse', label: 'Keine Hindernisse im Radius von mind. 3 m' },
  { key: 'absperrung', label: 'Geeignete Absperrung vorhanden' },
  { key: 'beleuchtung', label: 'Bei Dunkelheit ausreichend beleuchtet' },
  { key: 'aufsteller', label: 'Ggf. Aufsteller „UAV-Einsatz" aufgestellt' },
]

export const UAV_ITEMS: CheckItem[] = [
  { key: 'gehaeuse', label: 'Gehäuse intakt' },
  { key: 'klappmechanismus', label: 'Klappmechanismus intakt und stabil' },
  { key: 'schrauben', label: 'Schraubenverbindungen fest' },
  { key: 'rotoren', label: 'Rotoren ohne Beschädigungen' },
  { key: 'anbauteile', label: 'Anbauteile intakt und fest eingerastet' },
  { key: 'rotorlauf', label: 'Rotoren laufen gleichmäßig' },
  { key: 'beleuchtung', label: 'Beleuchtung intakt und eingeschaltet' },
  { key: 'kabel', label: 'Kabelsteckverbindungen fest' },
  { key: 'akkus', label: 'Akkus intakt und aufgeladen' },
  { key: 'sensoren', label: 'Sensoren intakt' },
]

export const RC_ITEMS: CheckItem[] = [
  { key: 'akkus', label: 'Akkus geladen' },
  { key: 'verbindung_uav', label: 'RC-Verbindung zum UAV hergestellt' },
  { key: 'anbauteile', label: 'Kontrolle über Anbauteile' },
  { key: 'antennen', label: 'Antennen ausgerichtet' },
  { key: 'absprache', label: 'Absprache: wer bedient das UAV' },
  { key: 'gps', label: 'GPS-Verbindung hergestellt' },
  { key: 'bild', label: 'Bildwiedergabe auf beiden RC' },
  { key: 'rechner', label: 'Verbindung zum Rechner' },
  { key: 'ground_control', label: 'Ground Control / Funkverbindung zum L-ATM' },
  { key: 'display', label: 'Displayeinstellungen dem Wetter angepasst' },
]
