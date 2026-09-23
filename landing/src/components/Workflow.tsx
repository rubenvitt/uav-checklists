import { useState } from 'react'
import { TbClipboardList, TbDrone, TbFileCheck, TbMapPin } from 'react-icons/tb'
import { PhoneFrame, Reveal, SectionHead } from './primitives'

const phases = [
  {
    id: 'einsatzdaten',
    no: '01',
    name: 'Einsatzdaten',
    icon: TbMapPin,
    summary:
      'Alles, was zum Einsatz gehört, bevor die Drohne ausgepackt wird — inklusive gezeichneter Einsatzkarte.',
    points: [
      'Einsatzstichwort, Alarmzeit, alarmierende und anfordernde Stelle',
      'Einsatzleitung und Abschnittsleitung',
      'Auftragsvorlagen: Personensuche, Erkundung, Transport, Überwachung',
      'Truppstärke mit Fernpilot, Luftraumbeobachter und Bildauswerter',
      'Einsatzkarte zeichnen (Polygon, Kreis, Linie, Marker) oder Foto hinterlegen',
    ],
    shot: 'einsatzkarte',
    shotAlt: 'Einsatzauftrag und gezeichnete Einsatzkarte auf Basis von OpenStreetMap',
    caption: 'Einsatzauftrag mit Karte — Flächen werden automatisch berechnet.',
  },
  {
    id: 'vorflugkontrolle',
    no: '02',
    name: 'Vorflugkontrolle',
    icon: TbClipboardList,
    summary:
      'Die eigentliche Entscheidungsgrundlage: Wetter, Umgebung, Luftraum, Risikoklasse — und am Ende die dokumentierte Flugfreigabe.',
    points: [
      'Wetterbewertung gegen die Grenzwerte der gewählten Drohne',
      'Gegenprüfung mit DWD-Stationsmessung und amtlichen Unwetterwarnungen (Deutschland)',
      'Wind auf 10 / 80 / 120 / 180 m, interpoliert auf die geplante Flughöhe',
      'Umgebungsprüfung: Krankenhäuser, BOS, Bahn, Autobahn, Schutzgebiete, Strommasten',
      'Live-Flugverkehr (ADS-B) im Umkreis, mit Warnung bei Tiefflug in der Nähe',
      'Fluganmeldungen bei Leitstelle, Polizei und weiteren Stellen',
      'SORA: GRC, ARC und daraus abgeleitetes SAIL',
      'Technische Kontrolle, Flugbriefing, Funktionstest — dann Freigabe oder Ablehnung',
    ],
    shot: 'wetter',
    shotAlt: 'Wetterbewertung mit Ampelstatus, Windgeschwindigkeit, Böen und K-Index',
    caption: 'Jede Metrik bekommt einen Status: gut, Vorsicht oder Warnung.',
  },
  {
    id: 'fluege',
    no: '03',
    name: 'Flüge',
    icon: TbDrone,
    summary:
      'Während des Einsatzes zählt jede Minute. Start und Landung sind ein Knopfdruck, Besonderheiten landen als Ereignis im Protokoll.',
    points: [
      'Block Off / Block On je Flug mit Fernpilot und Luftraumbeobachter',
      'Landungsstatus: in Ordnung, auffällig oder Notfall',
      'Ereignisprotokoll mit Zeitstempel für alles, was gemeldet werden muss',
      'Standortwechsel („Verlegen“) legt einen neuen Abschnitt im selben Einsatz an',
      'Prozeduren-Nachschlagewerk und SOS-Schnellzugriff jederzeit erreichbar',
    ],
    shot: 'flugbuch',
    shotAlt: 'Flugtagebuch mit drei abgeschlossenen Flügen und Ereignisliste',
    caption: 'Drei Flüge, zwei Ereignisse — das Flugbuch schreibt sich nebenbei.',
  },
  {
    id: 'nachbereitung',
    no: '04',
    name: 'Nachbereitung',
    icon: TbFileCheck,
    summary:
      'Nachflugkontrolle, Einsatzabschluss, Unterschriften — und der fertige Bericht als PDF.',
    points: [
      'Nachflugkontrolle am Gerät: Motoren, Akkus, Rotoren, Payload, Kabel',
      'Störungen und Vorfälle kategorisiert erfassen',
      'Einsatzergebnis: erfolgreich, erfolglos oder abgebrochen',
      'Abschluss-Checkliste: Datensicherung, Abmeldungen, Rückbau',
      'Unterschrift von Fernpilot und Einsatzleitung direkt auf dem Gerät',
      'PDF-Einsatzbericht mit allen Daten, der Einsatzkarte und den Unterschriften',
    ],
    shot: 'nachbereitung',
    shotAlt: 'Nachflugkontrolle mit acht Prüfpunkten und Bemerkungsfeld',
    caption: 'Nachflugkontrolle — jeder Punkt positiv oder negativ, mit Bemerkung.',
  },
] as const

export default function Workflow() {
  const [active, setActive] = useState(0)
  const phase = phases[active]

  return (
    <section id="ablauf" className="border-b border-line py-20 sm:py-28">
      <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
        <SectionHead
          index="01"
          kicker="Der Einsatzablauf"
          title={<>Vier Phasen, die der Realität an der Einsatzstelle folgen.</>}
          lead={
            <>
              Ein Einsatz wandert von links nach rechts durch die App. Phase&nbsp;3 und&nbsp;4 sind
              gesperrt, bis die Flugfreigabe dokumentiert ist — man kann die Vorflugkontrolle also
              nicht versehentlich überspringen.
            </>
          }
        />

        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <ol className="border-t border-line">
              {phases.map((p, i) => {
                const Icon = p.icon
                const isActive = i === active
                return (
                  <li key={p.id} className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-expanded={isActive}
                      className={`group flex w-full items-start gap-4 px-1 py-5 text-left transition-colors sm:px-3 ${
                        isActive ? 'bg-paper-2/70' : 'hover:bg-paper-2/40'
                      }`}
                    >
                      <span
                        className={`mt-0.5 font-mono text-xs tracking-widest ${
                          isActive ? 'text-signal' : 'text-muted'
                        }`}
                      >
                        {p.no}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2.5">
                          <Icon className={`size-[1.15rem] ${isActive ? 'text-signal' : 'text-ink-3'}`} />
                          <span className="display text-xl">{p.name}</span>
                        </span>
                        <span className="mt-2 block text-sm leading-relaxed text-muted">{p.summary}</span>

                        {isActive ? (
                          <ul className="mt-5 space-y-2.5 border-l border-line pl-4">
                            {p.points.map((point) => (
                              <li key={point} className="flex gap-2.5 text-sm leading-snug text-ink-3">
                                <span aria-hidden className="mt-[0.45rem] size-1 shrink-0 bg-signal" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <p className="mt-5 font-mono text-[0.7rem] text-muted">
              Abschnitt anwählen, um die Details und den passenden Bildschirm zu sehen.
            </p>
          </div>

          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <PhoneFrame
              key={phase.shot}
              src={`./screenshots/${phase.shot}.webp`}
              alt={phase.shotAlt}
              caption={phase.caption}
              className="mx-auto max-w-[17rem] sm:max-w-[18.5rem]"
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
