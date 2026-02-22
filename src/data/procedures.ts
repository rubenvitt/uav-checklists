// Prozeduren-Daten für UAV-Betrieb (Normal, Contingency, Emergency)

export type ProcedureCategory = 'normal' | 'contingency' | 'emergency' | 'erp';
export type ProcedureRole = 'RPIC' | 'RP' | 'Bodenpersonal' | 'RPIC oder Bodenpersonal' | 'Alle';

export interface ProcedureAction {
  role: ProcedureRole;
  steps: string[];
}

export interface ProcedureConditional {
  condition: string;
  action: string;
  referenceId?: string;
}

export interface Procedure {
  id: string;
  title: string;
  shortTitle: string;
  category: ProcedureCategory;
  description: string;
  generalNotes?: string[];
  actions: ProcedureAction[];
  conditionals?: ProcedureConditional[];
  notes?: string[];
}

export const GENERAL_RULES: string[] = [
  'Es wird eine Mindestflughöhe von 8 Metern eingehalten, die die Gefährdung von Menschen, Tieren und Verkehrsmitteln minimiert, sofern der Einsatzauftrag keine niedrigere Flughöhe erfordert.',
  'Die Mindestflughöhe wird im Regelfall nur für Start, Landung oder im Rahmen von Contingency/Emergency-Prozeduren, wenn dies als nötig erachtet wird, unterschritten.',
  'Ausgenommen ist der Flugbetrieb zu Trainingszwecken über „Controlled Ground".',
];

export const PROCEDURES: Procedure[] = [
  // ═══════════════════════════════════════════
  // NORMALE VERFAHREN (N1–N6)
  // ═══════════════════════════════════════════
  {
    id: 'N1',
    title: 'Vor dem Start',
    shortTitle: 'Vor Start',
    category: 'normal',
    description: 'Vorbereitende Checks und Motorenstart vor dem Abheben.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Vorflugkontrolle abgeschlossen',
          'Check Controlled Ground hergestellt',
          'Check GNSS verfügbar (wenn benötigt)',
          'Check Startgebiet frei (z.\u00A0B. Menschen, FOD oder Hindernisse)',
          'Call Out: CLEAR PROP!',
          'Motoren starten (Steuerknüppel links und rechts nach unten in die Mitte drücken, sobald Motoren drehen, loslassen)',
          'Check Initialisierung erfolgt',
          'Check, ob Fehlermeldungen oder ein ungewöhnliches Verhalten/Geräusch auftreten',
        ],
      },
    ],
    conditionals: [
      {
        condition: 'Fehlermeldung oder ungewöhnliches Verhalten/Geräusch',
        action: 'Motoren ausschalten (Schub-Steuerknüppel nach 6 Uhr drücken und halten, bis Motoren stoppen) und Prozedur abbrechen',
      },
    ],
  },
  {
    id: 'N2',
    title: 'Start',
    shortTitle: 'Start',
    category: 'normal',
    description:
      'Der Start wird immer mit manueller Steuerung durchgeführt.',
    generalNotes: [
      'Keine Warn- und Fehlermeldungen?',
      'Start der Rotoren über Combination Stick Command (CSC)',
      'Gleichmäßiger Lauf der Rotoren, keine ungewöhnlichen Vibrationen?',
      'Erhöhen der Drehzahl und gleichmäßiges Steigen auf mindestens 7 Meter Höhe',
      'Durchführung einer Steuerungsprobe',
    ],
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Check Abflugrichtung frei',
          'Check Luftraum',
          'Call Out: Achtung: START!',
          'Starten',
          'In sicherer Höhe prüfen, ob die Reaktion des UAS normal (wie erwartet) ist',
        ],
      },
    ],
    conditionals: [
      {
        condition: 'Reaktion des UAS nicht normal',
        action: 'Landung ASAP',
        referenceId: 'N6',
      },
    ],
  },
  {
    id: 'N3',
    title: 'Flug',
    shortTitle: 'Flug',
    category: 'normal',
    description: 'Missionsflug – manuell oder autonom.',
    generalNotes: [
      'N3.1 – Missionsflug (manuelle Steuerung): Flugmodus P (Positioning) im Regelfall. Flugmodus T (Tripod) bei Hindernissen/Nähe zu Menschen. Flugmodus S (Sport) nur in Ausnahmefällen.',
      'N3.2 – Autonomer Missionsflug: Flugmodus P. Vorherige Planung im 4-Augen-Prinzip. Kontinuierliche Überwachung durch Pilot und Luftraumbeobachter. Bei Abweichungen sofort abbrechen.',
    ],
    actions: [
      {
        role: 'RPIC',
        steps: [
          'UAS steuern (manuelle Steuerung oder automatischer Flug)',
          'Überwachen: Flugparameter (Höhe, Geschwindigkeit, Batterie, C2/3-Link, …)',
          'Überwachen: Korrekte Durchführung des automatischen Flugplans (wenn aktiviert)',
          'Beobachten: Wetteränderungen',
          'Beobachten: Bodenbereich auf unbeteiligte Personen und Hindernisse',
          'Beobachten: Luftraum',
        ],
      },
      {
        role: 'Bodenpersonal',
        steps: [
          'Beobachten: Wetteränderungen',
          'Beobachten: Bodenbereich auf unbeteiligte Personen und Hindernisse',
          'Beobachten: Luftraum',
          'RPIC über Änderungen informieren, falls erforderlich',
        ],
      },
    ],
    conditionals: [
      {
        condition: 'Abweichung vom automatischen Flugplan',
        action: 'Manuelle Steuerung übernehmen',
        referenceId: 'N4',
      },
      {
        condition: 'Auftauchen eines unbeteiligten UAV',
        action: 'Siehe Prozedur C4.1',
        referenceId: 'C4.1',
      },
      {
        condition: 'Auftauchen eines bemannten Luftfahrzeuges',
        action: 'Siehe Prozedur C4.2',
        referenceId: 'C4.2',
      },
    ],
  },
  {
    id: 'N4',
    title: 'Übernahme manueller Steuerung',
    shortTitle: 'Manuell übernehmen',
    category: 'normal',
    description:
      'Wenn ein sicherer Flug unter automatischer Kontrolle in Frage steht oder wann immer der RPIC es für notwendig hält.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Flugmodus auf manuelle Steuerung umschalten',
          'Check, ob die manuelle Steuerung hergestellt ist',
          'Call Out: MANUELLE STEUERUNG ÜBERNOMMEN!',
          'Rückkehr zur sicheren Höhe und Entfernung',
        ],
      },
    ],
  },
  {
    id: 'N5',
    title: 'Kontrolle an Co-Piloten übergeben',
    shortTitle: 'Übergabe',
    category: 'normal',
    description:
      'Übergabe der Kontrolle vom RPIC an den RP. Der RP wird dadurch zum RPIC. Der Wechsel ist zu dokumentieren.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Check, ob RP in unmittelbarer Nähe steht oder per Funk in Kontakt und bereit ist',
          'Call Out: ÜBERGEBE STEUERUNG!',
          'Betätigung der Aircraft Authority-Taste, bis sie rot leuchtet',
        ],
      },
      {
        role: 'RP',
        steps: [
          'Betätigung der Aircraft Authority-Taste, bis sie grün leuchtet',
          'Call Out: STEUERUNG ÜBERNOMMEN!',
        ],
      },
    ],
  },
  {
    id: 'N6',
    title: 'Landung',
    shortTitle: 'Landung',
    category: 'normal',
    description:
      'Die Landung wird in der Regel mit manueller Steuerung durchgeführt.',
    generalNotes: [
      'Anflug auf die Landezone',
      'Landezone frei?',
      'Sinken auf ca. 8 Meter Höhe',
      'Ausrichten der Drohne (Heck zum Piloten)',
      'Sinken über der Landezone',
      'Landung',
      'Bei Landung auf reflektierenden Oberflächen (insbes. nachts) kann eine „erzwungene Landung" erforderlich sein. Alternativ: abwärts gerichtete Sichtpositionierung kurzzeitig deaktivieren.',
      'Ggf. Abschalten der Rotoren über Combination Stick Command (CSC)',
    ],
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Check Anflugweg frei',
          'Check Landestelle frei',
          'Call Out: ACHTUNG: LANDUNG!',
          'Landung',
          'Sobald UAS sicher am Boden: Motoren ausschalten (Schub-Steuerknüppel nach 6 Uhr drücken und halten, bis Motoren stoppen)',
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // CONTINGENCY PROCEDURES (C0–C6)
  // ═══════════════════════════════════════════
  {
    id: 'C0',
    title: 'Reaktion auf unerwartete widrige Wetterbedingungen',
    shortTitle: 'Widriges Wetter',
    category: 'contingency',
    description:
      'Sicherheit aller beteiligten Personen hat oberste Priorität. RPIC entscheidet über Abbruch oder sicherste Beendigung.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Call Out: WIDRIGES WETTER!',
          'Im automatischen Flug → Übernahme der manuellen Steuerung (N4)',
          'Landung (N6)',
        ],
      },
    ],
    conditionals: [
      {
        condition:
          'Wetterbedingungen so widrig, dass kontrollierter Flug nicht mehr möglich',
        action: 'Terminierung',
        referenceId: 'E1',
      },
    ],
  },
  {
    id: 'C1',
    title: 'Unerwartetes Verhalten des UAS innerhalb der Flight Geography',
    shortTitle: 'Unerwartetes Verhalten',
    category: 'contingency',
    description:
      'Das UAS verhält sich anders als erwartet, z.\u00A0B. Abweichung vom Flugweg im automatischen Modus.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Call Out: WARNUNG! WARNUNG! WARNUNG!',
          'Im automatischen Flug → Übernahme der manuellen Steuerung (N4)',
          'Landung (N6)',
        ],
      },
    ],
    conditionals: [
      {
        condition: 'Erwartbares Verhalten kann nicht wiederhergestellt werden',
        action:
          'Terminierung (koordinierter Absturz) über Combination Stick Command (CSC)',
        referenceId: 'E1',
      },
    ],
    notes: [
      'Flugbetrieb kann erst wieder aufgenommen werden, wenn die Ursache geklärt wurde und sichergestellt ist, dass sie nicht wieder auftreten kann.',
    ],
  },
  {
    id: 'C2',
    title: 'Contingency Manöver lateral – „Anhalten"',
    shortTitle: 'Lateral verlassen',
    category: 'contingency',
    description: 'Das UA verlässt die Flight Geography seitlich (lateral).',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Im automatischen Flug → Übernahme der manuellen Steuerung (N4)',
          'Laterale Bewegung des UA stoppen',
          'UA in die Flight Geography zurücksteuern',
        ],
      },
    ],
    conditionals: [
      {
        condition:
          'UA kann nicht zurückgesteuert werden oder wird voraussichtlich das Contingency Volumen verlassen',
        action: 'Terminierung',
        referenceId: 'E1',
      },
    ],
  },
  {
    id: 'C3',
    title: 'Contingency Manöver vertikal – „Sinken oder Steigen"',
    shortTitle: 'Vertikal verlassen',
    category: 'contingency',
    description: 'Das UA verlässt die Flight Geography vertikal.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Im automatischen Flug → Übernahme der manuellen Steuerung (N4)',
          'Vertikale Bewegung des UA stoppen',
          'UA in die Flight Geography zurücksteuern',
        ],
      },
    ],
    conditionals: [
      {
        condition:
          'UA kann nicht zurückgesteuert werden oder wird voraussichtlich das Contingency Volumen verlassen',
        action: 'Terminierung',
        referenceId: 'E1',
      },
    ],
  },
  {
    id: 'C4.1',
    title: 'Auftauchen eines unbeteiligten UAV',
    shortTitle: 'Fremdes UAV',
    category: 'contingency',
    description:
      'Ein fremdes UAS droht in das Operational Volumen einzufliegen oder ist bereits eingeflogen.',
    actions: [
      {
        role: 'RPIC oder Bodenpersonal',
        steps: ['Call Out: UNBEKANNTES UAV!'],
      },
      {
        role: 'RPIC',
        steps: ['Initiieren der Landung des UA → Landung (N6)'],
      },
    ],
    notes: [
      'Betrieb kann erst wiederaufgenommen werden, wenn sichergestellt ist, dass es nicht erneut zum Konflikt kommt.',
    ],
  },
  {
    id: 'C4.2',
    title: 'Auftauchen eines bemannten Luftfahrzeugs',
    shortTitle: 'Bemanntes Lfz.',
    category: 'contingency',
    description:
      'Ein bemanntes Luftfahrzeug droht in das Betriebsvolumen einzufliegen oder ist bereits eingeflogen.',
    actions: [
      {
        role: 'RPIC oder Bodenpersonal',
        steps: ['Call Out: UNBEKANNTES LUFTFAHRZEUG!'],
      },
      {
        role: 'RPIC',
        steps: [
          'Initiieren der Landung des UA → Landung (N6)',
          'Meldung gem. Reporting (wenn erforderlich)',
        ],
      },
    ],
    notes: [
      'Betrieb kann erst wiederaufgenommen werden, wenn sichergestellt ist, dass es nicht erneut zum Konflikt kommt.',
    ],
  },
  {
    id: 'C5',
    title: 'Verlust des Controlled Ground',
    shortTitle: 'Controlled Ground',
    category: 'contingency',
    description:
      'Unbeteiligte Personen haben den als Controlled Ground ausgewiesenen Bereich betreten.',
    actions: [
      {
        role: 'RPIC oder Bodenpersonal',
        steps: ['Call Out: UNBETEILIGTE PERSONEN IM FLUGGEBIET!'],
      },
      {
        role: 'Bodenpersonal',
        steps: ['Wenn nötig: Sicherheitsbereich um den Landebereich räumen'],
      },
      {
        role: 'RPIC',
        steps: ['Initiieren der Landung des UA → Landung (N6)'],
      },
    ],
    notes: [
      'Betrieb kann erst wiederaufgenommen werden, wenn sichergestellt ist, dass es nicht erneut zum Konflikt kommt.',
    ],
  },
  {
    id: 'C6',
    title: 'Link-Verlust',
    shortTitle: 'Link Loss',
    category: 'contingency',
    description: 'Der C2-Link zum UAS ist unterbrochen.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Call Out: LINK LOSS!',
          'Signal überprüfen und Versuche, die Verbindung wiederherzustellen',
        ],
      },
    ],
    conditionals: [
      {
        condition:
          'UA wird voraussichtlich das Contingency Volumen verlassen',
        action: 'Terminierung',
        referenceId: 'E1',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // EMERGENCY PROCEDURES (E1–E3)
  // ═══════════════════════════════════════════
  {
    id: 'E1',
    title: 'Terminierung des Fluges',
    shortTitle: 'Terminierung',
    category: 'emergency',
    description:
      'Spätestens beim Verlassen des Contingency Volumens, oder wann immer durch den Fernpilot für nötig erachtet, um ein erkanntes Risiko für Personen zu minimieren.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Fluggerät durch Steuerknüppel Kombinationsbefehl (CSC) terminieren',
          'Call Out: ABSTURZ! ABSTURZ! ABSTURZ!',
          'Letzte Position und Richtung des UA merken',
        ],
      },
      {
        role: 'Bodenpersonal',
        steps: [
          'Deckung suchen',
          'Wenn nötig, andere Personen laut warnen',
          'Call Out: ACHTUNG DECKUNG!',
          'Letzte Position und Richtung des UA merken',
        ],
      },
    ],
    conditionals: [
      {
        condition: 'Terminierung erfolgreich?',
        action: 'Ja → Absturz (E3) / Nein → Fly Away (E2)',
      },
    ],
  },
  {
    id: 'E2',
    title: 'Fly Away',
    shortTitle: 'Fly Away',
    category: 'emergency',
    description: 'Das UAS reagiert nicht auf Terminierung und fliegt unkontrolliert weiter.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Call Out: FLY AWAY! FLY AWAY! FLY AWAY!',
          'Auslösen des ERP → Fly-Away-Notfallplan (ERP-FA)',
          'Erneuter Versuch Terminierung (E1) – parallel zum ERP, solange ERP nicht verzögert wird',
        ],
      },
    ],
    conditionals: [
      {
        condition: 'ERP auslösen',
        action: 'Fly-Away-Notfallplan befolgen',
        referenceId: 'ERP-FA',
      },
    ],
  },
  {
    id: 'E3',
    title: 'Absturz',
    shortTitle: 'Absturz',
    category: 'emergency',
    description: 'Nach Einschlag des UAS auf dem Boden.',
    actions: [
      {
        role: 'RPIC',
        steps: [
          'Call Out: ABSTURZ! ABSTURZ! ABSTURZ!',
          'Auslösen des ERP → Absturz-Notfallplan (ERP-ABS)',
        ],
      },
    ],
    conditionals: [
      {
        condition: 'ERP auslösen',
        action: 'Absturz-Notfallplan befolgen',
        referenceId: 'ERP-ABS',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // NOTFALLPLAN – ERP (M3 – High)
  // ═══════════════════════════════════════════
  {
    id: 'ERP',
    title: 'Notfallplan – Emergency Response Plan',
    shortTitle: 'ERP Allgemein',
    category: 'erp',
    description:
      'Auch wenn das oberste Ziel der sichere UAS-Betrieb ist, kann es zu Zwischen- oder Unfällen kommen. Im ersten Moment geht es darum, die Auswirkungen zu minimieren. Erst Menschen, dann Eigentum!',
    generalNotes: [
      'Ruhe bewahren und einen Überblick verschaffen',
      'Eigenschutz beachten',
      'Unfallstelle absichern',
      'Personen aus der Gefahrenzone bringen',
      'Notfall melden',
      'Erste-Hilfe leisten',
      'Jeder beteiligt sich nach seinen Möglichkeiten, ohne sich dabei in Gefahr zu bringen.',
      'Bei jedem Flugbetrieb ist die PSA zu tragen und ein Verbandkasten nach DIN 13157 sowie ein Feuerlöscher nach DIN EN 3 mitzuführen.',
      'Verbandkasten: GW AufklTruLu, unter Arbeitsplatte im Mittelteil des Kfz',
      'Feuerlöscher: GW AufklTruLu, unter Arbeitsplatte im Mittelteil des Kfz',
    ],
    actions: [
      {
        role: 'Alle',
        steps: [
          'Vor dem Betrieb wird der ERP mit allen Beteiligten besprochen',
          'Erst wenn alle Fragen zum ERP geklärt sind, kann der Betrieb aufgenommen werden',
        ],
      },
    ],
    notes: [
      'Der ERP wurde unter Teilnahme aller Funktionsträger durch eine „Table Top-Übung" auf Eignung geprüft (M3Crit1bAs).',
      'Der ERP ist geeignet für die Situation, begrenzt Folgewirkungen, enthält Definitionen zur Identifizierung von Notfällen, ist praktisch umsetzbar und benennt Zuständigkeiten klar (M3Int).',
    ],
  },
  {
    id: 'ERP-ABS',
    title: 'Notfallplan bei Absturz des UAS',
    shortTitle: 'ERP Absturz',
    category: 'erp',
    description:
      'Schrittweises Vorgehen nach einem Absturz des UAS. Grundregeln: Ruhe bewahren. Menschenrettung vor Objektrettung.',
    actions: [
      {
        role: 'Alle',
        steps: [
          '1. ÜBERBLICK VERSCHAFFEN: Schnellstmöglich zur Unfallstelle begeben, Unfallstelle absichern, Eigenschutz beachten',
        ],
      },
      {
        role: 'Alle',
        steps: [
          '2. Wenn Personen betroffen: RETTEN – Menschen aus der Gefahrenzone bergen, Sicherheitsabstand einnehmen, Eigenschutz beachten',
        ],
      },
      {
        role: 'Alle',
        steps: [
          '3. Wenn nötig: NOTRUF ABSETZEN – Wer meldet? Wo ist es passiert? Was ist passiert? Wie viele Verletzte? Warten auf Rückfragen!',
        ],
      },
      {
        role: 'Alle',
        steps: [
          '4. Wenn nötig: BRAND LÖSCHEN – Sich selbst nicht in Gefahr bringen, Brand bekämpfen (Feuerlöscher oder Löschdecke), Besondere Vorsicht bei Akkus! Explosionsgefahr!, Eintreffende Feuerwehr einweisen',
        ],
      },
      {
        role: 'Alle',
        steps: [
          '5. Wenn nötig: ERSTE HILFE LEISTEN – Verletzte auf Lebenszeichen prüfen, Reanimation bei Kreislaufstillstand, Stillen von Blutungen, Stabile Seitenlage, Rettungskräfte einweisen',
        ],
      },
      {
        role: 'RPIC',
        steps: [
          '6. UNFALL MELDEN – Unverzügliche Meldung an die Bundesstelle für Flugunfalluntersuchung (BFU) bei: Unfällen oder schweren Störungen, Beschädigung von Eigentum, schwerer oder tödlicher Verletzung',
        ],
      },
    ],
  },
  {
    id: 'ERP-FA',
    title: 'Notfallplan bei Fly-Away des UAS',
    shortTitle: 'ERP Fly-Away',
    category: 'erp',
    description:
      'Das UAS fliegt trotz ausgelöster Terminierung weiter. Sofortige Meldungen an ATM, Tower und Polizei erforderlich.',
    generalNotes: [
      'ATM-Betreiber: DFS Deutsche Flugsicherung Hannover – Tel: 0511-7797101',
      'Für Betrieb in Flugplatz-/Flughafennähe: Name und Telefonnummer des Towers vor Einsatzbeginn ermitteln',
    ],
    actions: [
      {
        role: 'RPIC',
        steps: [
          '1. BEI C2-LINK PROBLEM: Verbindungsversuch mehrfach wiederholen, Positionsänderung der Fernsteuerung oder Antenne am Boden (wenn möglich)',
        ],
      },
      {
        role: 'RPIC',
        steps: [
          '2. MELDUNG AN FLUGHAFEN/FLUGPLATZ: Telefonische Meldung des Fly-Aways an Tower – Wer meldet? Wo passiert? Was passiert? Größe/Konfiguration des UAS, letzte Flugrichtung, max. Flugzeit, max. Flughöhe – Warten auf Rückfragen!',
        ],
      },
      {
        role: 'RPIC',
        steps: [
          '3. MELDUNG AN ATM-BETREIBER: Telefonische Meldung an DFS (0511-7797101) – Wer meldet? Wo passiert? Was passiert? Größe/Konfiguration des UAS, letzte Flugrichtung, max. Flugzeit, max. Flughöhe – Warten auf Rückfragen!',
        ],
      },
      {
        role: 'RPIC',
        steps: [
          '4. POLIZEI INFORMIEREN: Telefonische Meldung des Fly-Aways und Warnung über möglichen Absturz – Wer meldet? Wo passiert? Was passiert? – Warten auf Rückfragen!',
        ],
      },
    ],
  },
];

// Hilfsfunktionen
export function getProceduresByCategory(category: ProcedureCategory): Procedure[] {
  return PROCEDURES.filter((p) => p.category === category);
}

export function getProcedureById(id: string): Procedure | undefined {
  return PROCEDURES.find((p) => p.id === id);
}

export const CATEGORY_LABELS: Record<ProcedureCategory, string> = {
  normal: 'Normale Verfahren',
  contingency: 'Notfallverfahren',
  emergency: 'Emergency',
  erp: 'Notfallplan (ERP)',
};

export const CATEGORY_DESCRIPTIONS: Record<ProcedureCategory, string> = {
  normal: 'Standardprozeduren für den regulären Flugbetrieb',
  contingency: 'Verfahren bei unerwarteten Situationen',
  emergency: 'Sofortmaßnahmen bei kritischen Notfällen',
  erp: 'Emergency Response Plan – Detaillierte Notfallpläne',
};
