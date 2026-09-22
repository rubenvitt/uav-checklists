import { TbPlus } from 'react-icons/tb'
import type { ReactNode } from 'react'
import { site } from '../site.config'
import { SectionHead } from './primitives'

const faq: Array<{ q: string; a: ReactNode }> = [
  {
    q: 'Ersetzt die App eine Betriebsgenehmigung oder eine Flugfreigabe?',
    a: (
      <>
        Nein. Sie strukturiert und dokumentiert, was ohnehin geprüft werden muss, und hält das
        Ergebnis fest. Die fachliche Entscheidung trifft weiterhin die verantwortliche Person, und
        behördliche Genehmigungen, NOTAM-Prüfung und Flugverkehrskontrollfreigaben laufen
        unverändert über die zuständigen Stellen. Die App verlinkt sie nur an der passenden Stelle.
      </>
    ),
  },
  {
    q: 'Funktioniert das mit unseren Drohnen?',
    a: (
      <>
        Mitgeliefert sind Profile für die DJI Matrice 350 RTK und die Matrice 200. Ein weiteres
        Profil ist eine Handvoll Zahlen — Windgrenze, Temperaturbereich, IP-Schutzart,
        Dienstgipfelhöhe, Abflugmasse — in{' '}
        <code className="font-mono text-[0.85em]">src/data/drones.ts</code>. Danach bewertet die App
        das Wetter gegen genau diese Werte.
      </>
    ),
  },
  {
    q: 'Was passiert bei Funkloch an der Einsatzstelle?',
    a: (
      <>
        Die App startet und arbeitet offline, inklusive Checklisten, Flugtagebuch, Prozeduren und
        PDF-Export. Wetter, K-Index und Umgebungsprüfung brauchen einmal Netz; einmal geladen
        bleiben sie beim Einsatz gespeichert. Kartenkacheln, die schon einmal angezeigt wurden,
        kommen aus dem Zwischenspeicher.
      </>
    ),
  },
  {
    q: 'Können mehrere Leute gleichzeitig an einem Einsatz arbeiten?',
    a: (
      <>
        Nein — und das ist Absicht. Ohne Server gibt es keinen gemeinsamen Stand. Ein Einsatz wird
        auf einem Gerät geführt; der Austausch läuft über den exportierten PDF-Bericht. Wer
        gleichzeitiges Arbeiten braucht, braucht eine andere Architektur.
      </>
    ),
  },
  {
    q: 'Wie lange bleiben die Daten erhalten?',
    a: (
      <>
        Ein laufender Einsatz 56 Stunden, ein abgeschlossener 24, ein gelöschter noch 30 Minuten zum
        Wiederherstellen. Danach räumt die App selbst auf. Der Bericht gehört also vor dem Ende der
        Schicht exportiert — der PDF-Export ist der eigentliche Archivierungsschritt.
      </>
    ),
  },
  {
    q: 'Was kostet das, und unter welchen Bedingungen dürfen wir es nutzen?',
    a: (
      <>
        Es kostet nichts, es gibt keine Lizenzschlüssel und keine Nutzerzahlbegrenzung. Der
        Quellcode liegt offen auf GitHub; eine Bereitschaft kann ihn nehmen, hosten und für sich
        anpassen. Zur konkreten Lizenz und zu Fragen der Weitergabe am besten kurz im Repository
        nachsehen oder ein Issue aufmachen.
      </>
    ),
  },
  {
    q: 'Wir hätten gern eine Änderung. Geht das?',
    a: (
      <>
        Das Projekt ist aus dem Bedarf einer einzelnen Einheit entstanden — Rückmeldungen aus
        anderen Bereitschaften sind deshalb besonders nützlich. Wünsche, Fehler und Erfahrungen
        gehören in die{' '}
        <a href={site.issuesUrl} target="_blank" rel="noreferrer" className="link-underline text-ink">
          Issues
        </a>
        . Wer selbst entwickelt, kann direkt einen Pull Request schicken.
      </>
    ),
  },
]

export default function Faq() {
  return (
    <section id="fragen" className="border-b border-line py-20 sm:py-28">
      <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
        <SectionHead
          index="06"
          kicker="Häufige Fragen"
          title={<>Was andere Bereitschaften zuerst fragen.</>}
        />

        <div className="border-t border-line">
          {faq.map((item) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-start gap-5 py-6 transition-colors hover:text-signal">
                <TbPlus
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-signal transition-transform duration-200 group-open:rotate-45"
                />
                <h3 className="display max-w-[46ch] text-lg sm:text-xl">{item.q}</h3>
              </summary>
              <div className="max-w-[68ch] pt-0 pb-7 pl-9 text-[0.95rem] leading-relaxed text-muted">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
