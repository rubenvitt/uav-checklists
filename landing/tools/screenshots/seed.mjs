/**
 * Beispiel-Einsatz für die Screenshot-Aufnahmen.
 *
 * Schreibt genau die localStorage-Einträge, die die PWA selbst anlegen würde:
 * die Einsatzliste unter `uav-missions`, den manuell gesetzten Standort und
 * die Formularfelder unter `uav-form:<missionId>:<key>`. Felder, die an einen
 * Abschnitt gebunden sind, tragen zusätzlich das Präfix `seg:<segmentId>:`.
 *
 * Die Daten sind erfunden; Namen und Einsatzstichwort dienen nur der
 * Darstellung.
 */
export const MID = '11111111-2222-4333-8444-555555555555'
export const SEG = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
export const MID2 = '99999999-8888-4777-8666-555555555555'
export const SEG2 = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'

export function buildStorage(now) {
  const ls = {}
  const put = (k, v) => { ls[`uav-form:${MID}:${k}`] = JSON.stringify({ value: v, timestamp: now }) }
  const put2 = (k, v) => { ls[`uav-form:${MID2}:${k}`] = JSON.stringify({ value: v, timestamp: now }) }
  const seg = (k, v) => put(`seg:${SEG}:${k}`, v)

  ls['uav-missions'] = JSON.stringify([
    {
      id: MID2,
      createdAt: now - 26 * 3600e3,
      completedAt: now - 22 * 3600e3,
      label: 'Einsatz 20.09.2026 07:40',
      phase: 'nachbereitung',
      segments: [{ id: SEG2, createdAt: now - 26 * 3600e3, label: 'Standort 1', locationName: 'Wennigsen (Deister)', status: 'completed' }],
      activeSegmentId: SEG2,
    },
    {
      id: MID,
      createdAt: now - 95 * 60e3,
      label: 'Einsatz 22.09.2026 08:35',
      phase: 'fluege',
      segments: [{ id: SEG, createdAt: now - 95 * 60e3, label: 'Standort 1', locationName: 'Hannover-Herrenhausen', status: 'active' }],
      activeSegmentId: SEG,
    },
  ])

  put2('einsatzstichwort', 'Vegetationsbrand — Lageerkundung')
  put2('flugAnlass', 'einsatz')

  // Standort (manuell gesetzt -> keine GPS-Freigabe nötig)
  const loc = { latitude: 52.3906, longitude: 9.6979, name: 'Herrenhäuser Gärten, Hannover' }
  ls[`uav-manual-location:${MID}:seg:${SEG}`] = JSON.stringify(loc)
  ls[`uav-manual-location:${MID}`] = JSON.stringify(loc)

  // Einsatzdetails
  put('flugAnlass', 'einsatz')
  put('einsatzstichwort', 'Hochwasser — Deichkontrolle Abschnitt Nord')
  put('alarmzeit', '08:12')
  put('alarmierungDurch', 'Leitstelle Region Hannover')
  put('anforderndeStelle', 'Einsatzleitung THW OV Hannover-Land')
  put('einsatzleiter', 'M. Brinkmann')
  put('abschnittsleiter', 'S. Köhler')

  // Truppstärke
  put('crew_fk', 'R. Vitt')
  put('crew_fp', 'J. Hansen')
  put('crew_lrb', 'T. Meier')
  put('crew_ba', 'A. Schuster')
  put('crew_additional', [{ name: 'L. Petersen', role: 'luftraumbeobachter' }])

  // Einsatzauftrag
  put('mission_template', 'erkundung')
  put('mission_erkundung_gebiet', 'Deichabschnitt Nord, km 4,2 – 6,8')
  put('mission_erkundung_art', 'Sichtkontrolle auf Sickerstellen und Treibgut, Foto-Dokumentation')
  put('mission_freitext', 'Anforderung durch Deichverband. Ergebnis laufend an EL melden.')

  // Rahmenangaben
  put('selectedDrone', 'matrice-350-rtk')
  put('maxAltitude', 120)
  seg('maxAltitude', 120)

  // SORA
  seg('grc:controlledGround', true)
  seg('grc:flightType', 'vlos')
  seg('grc:areaType', 'sparse')
  seg('grc:strategicMitigation', true)
  seg('grc:emergencyPlan', true)
  seg('arc:reservedAirspace', false)
  seg('arc:riskFlight', false)
  seg('arc:nearAirfield', 'no')
  seg('arc:under150m', true)
  seg('arc:uncontrolledAirspace', true)
  seg('arc:areaType', 'rural')
  seg('arc:adsbMonitoring', true)
  seg('arc:coordination', true)

  // Anmeldungen
  seg('anmeldungen:checked', { leitstelle: true, polizei: true })
  seg('anmeldungen:additional', [{ label: 'Deichverband Leine', detail: '0511 / 44 55 66' }])

  // Technische Kontrolle + Briefing
  const allTrue = (keys) => Object.fromEntries(keys.map((k) => [k, 'positive']))
  seg('techcheck:aufstiegsort', allTrue(['flaeche', 'homepoint', 'hindernisse', 'absperrung', 'beleuchtung', 'aufsteller']))
  put('techcheck:uav', allTrue(['gehaeuse', 'klappmechanismus', 'schrauben', 'rotoren', 'anbauteile', 'rotorlauf', 'beleuchtung', 'kabel', 'akkus', 'sensoren']))
  put('techcheck:rc', allTrue(['akkus', 'verbindung_uav', 'anbauteile', 'antennen', 'absprache', 'gps', 'bild', 'rechner', 'ground_control', 'display']))
  seg('techcheck:funktionstest', allTrue(['flugfunktionen', 'beleuchtung', 'bilduebertragung']))
  seg('flugbriefing:checked', allTrue(['aufgaben', 'landeplatz', 'notfallplan', 'fluggebiete', 'notam', 'geozonen', 'wetter', 'stoerquellen', 'kommunikation', 'vorflugkontrolle', 'stromversorgung', 'benachbarte', 'risikobewertung', 'gefahren', 'naturschutz', 'fragen']))

  // Flugfreigabe
  const freigabe = new Date(now - 70 * 60e3).toISOString()
  seg('flugfreigabe', freigabe)
  seg('flugentscheidung', { status: 'granted', timestamp: freigabe })

  // Flugbuch
  const iso = (minsAgo) => new Date(now - minsAgo * 60e3).toISOString()
  put('flightlog:entries', [
    { id: 'f1', blockOff: iso(64), blockOn: iso(41), fernpilot: 'J. Hansen', lrb: 'T. Meier', landungStatus: 'ok', bemerkung: 'Übersichtsflug Deich km 4,2–5,5', segmentId: SEG },
    { id: 'f2', blockOff: iso(38), blockOn: iso(17), fernpilot: 'J. Hansen', lrb: 'L. Petersen', landungStatus: 'ok', bemerkung: 'Detailaufnahmen Sickerstelle km 5,1', segmentId: SEG },
    { id: 'f3', blockOff: iso(14), blockOn: iso(3), fernpilot: 'R. Vitt', lrb: 'T. Meier', landungStatus: 'ok', bemerkung: '', segmentId: SEG },
  ])
  put('flightlog:events', [
    { id: 'e1', timestamp: iso(52), text: 'Sickerstelle bei km 5,1 lokalisiert — Position an EL gemeldet.', segmentId: SEG },
    { id: 'e2', timestamp: iso(29), text: 'Rettungshubschrauber im Anflug gesichtet, UAV auf 30 m abgesunken.', segmentId: SEG },
  ])
  // Nachbereitung
  put('postflight:checked', Object.fromEntries(['motoren','uav_beschaedigung','ueberwarmung','akkus','rotoren','payload','fernbedienung','kabel'].map(k=>[k,'positive'])))
  put('postflight:remarks', 'Keine Auffälligkeiten. Akkutemperatur nach dem dritten Flug erhöht, im Normbereich.')
  put('disruptions:none', true)
  put('result:outcome', 'erfolgreich')
  put('wrapup:checked', Object.fromEntries(['datensicherung','flugbuecher','uav_eingepackt','akkus_verstaut','fernbedienungen_verstaut','zubehoer_eingepackt','einsatzstelle_aufgeraeumt'].map(k=>[k,true])))
  put('wrapup:feedback', 'Zusammenarbeit mit dem Deichverband reibungslos. Funkdisziplin gut.')
  put('fluegeAbgeschlossen', true)

  return ls
}
