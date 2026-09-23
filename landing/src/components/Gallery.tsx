import { PhoneFrame } from './primitives'

const shots = [
  {
    file: 'uebersicht',
    alt: 'Einsatzübersicht mit einem laufenden und einem abgeschlossenen Einsatz',
    caption: 'Übersicht — laufende und abgeschlossene Einsätze mit Restlaufzeit.',
  },
  {
    file: 'sail',
    alt: 'Air Risk Class mit Fragebogen und SAIL-Matrix',
    caption: 'ARC-Fragebogen und SAIL-Matrix mit hervorgehobenem Ergebnis.',
  },
  {
    file: 'flugverkehr',
    alt: 'Flugverkehr aus ADS-B-Daten mit Rettungshubschrauber im Tiefflug, Kennzahlen und Empfehlungen',
    caption: 'Flugverkehr — Rettungshubschrauber im Tiefflug, 2,2 km entfernt: Warnung.',
  },
  {
    file: 'luftraum',
    alt: 'Meldung der Luftraumüberwachung während der Flugphase mit Eintrag im Ereignisprotokoll',
    caption: 'Luftraumüberwachung — neuer Tiefflieger, sofort gemeldet und protokolliert.',
  },
  {
    file: 'umgebung',
    alt: 'Umgebungsprüfung mit Krankenhäusern, Sicherheitsbehörden und Schutzgebieten',
    caption: 'Umgebungsprüfung — Entfernung und Himmelsrichtung je Kategorie.',
  },
  {
    file: 'vorhersage',
    alt: 'Wind nach Höhe und 24-Stunden-Vorhersage mit Temperatur, Wind, Böen, Feuchte, Sicht, Druck und Taupunkt',
    caption: 'Wind nach Höhe und 24-Stunden-Vorhersage — jede Stunde bewertet.',
  },
  {
    file: 'technik',
    alt: 'Technische Kontrolle mit abgeschlossenen Prüfungen für Aufstiegsort, UAV und Fernbedienungen',
    caption: 'Technische Kontrolle — positiv/negativ statt nur abhaken.',
  },
  {
    file: 'prozeduren',
    alt: 'Flugprozeduren als Bottom-Sheet mit normalen Verfahren und Contingency Procedures',
    caption: 'Prozeduren — im Einsatz aufrufbar, ohne den Einsatz zu verlassen.',
  },
  {
    file: 'abschluss',
    alt: 'Nachflugkontrolle mit Bemerkung und Einsatzabschluss-Checkliste',
    caption: 'Einsatzabschluss — Abmeldungen, Datensicherung, Rückbau.',
  },
  {
    file: 'fluege-dark',
    alt: 'Flugphase im dunklen Design',
    caption: 'Dunkles Design, ab Sonnenuntergang automatisch.',
  },
]

export default function Gallery() {
  return (
    <section aria-label="Bildstrecke" className="border-b border-line-dark bg-ink py-20 sm:py-24">
      <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line-dark pt-3">
          <span className="label text-signal-2">Bildstrecke</span>
          <span className="label text-paper-3/50">10 Ansichten · Originalaufnahmen</span>
        </div>
        <h2 className="display mt-6 max-w-[20ch] text-[length:var(--text-section)] text-paper">
          So sieht das im Feld aus.
        </h2>
      </div>

      <div className="mt-12 overflow-x-auto pb-4">
        <ul className="flex w-max gap-6 px-5 sm:gap-8 sm:px-8">
          {shots.map((s) => (
            <li key={s.file} className="w-[15rem] shrink-0 sm:w-[17rem]">
              <PhoneFrame src={`./screenshots/${s.file}.webp`} alt={s.alt} />
              <p className="mt-3 max-w-[26ch] font-mono text-[0.7rem] leading-relaxed text-paper-3/60">
                {s.caption}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
        <p className="font-mono text-[0.7rem] text-paper-3/40">← seitwärts scrollen →</p>
      </div>
    </section>
  )
}
