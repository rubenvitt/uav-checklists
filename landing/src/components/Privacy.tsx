import { TbCloudOff, TbDatabaseOff, TbEyeOff, TbTrash } from 'react-icons/tb'
import { Reveal, SectionHead } from './primitives'

const pillars = [
  {
    icon: TbCloudOff,
    title: 'Kein Backend',
    body: 'Die Anwendung ist eine statische Web-App. Es gibt keinen Server, der Einsatzdaten entgegennimmt, und damit auch keinen, der sie verlieren könnte.',
  },
  {
    icon: TbDatabaseOff,
    title: 'Kein Konto',
    body: 'Keine Registrierung, kein Login, keine Benutzerverwaltung. Wer den Link öffnet, kann sofort einen Einsatz anlegen.',
  },
  {
    icon: TbEyeOff,
    title: 'Kein Tracking',
    body: 'Keine Analytics, keine Werbe-Skripte, keine eingebetteten Drittanbieter-Schriften. Auch diese Seite hier lädt nichts von fremden Servern nach.',
  },
  {
    icon: TbTrash,
    title: 'Selbstlöschend',
    body: 'Ein laufender Einsatz verfällt nach 56 Stunden, ein abgeschlossener nach 24. Wer den Bericht behalten will, exportiert vorher das PDF.',
  },
]

const requests = [
  ['Open-Meteo', 'Wetter und Vorhersage', 'Koordinaten'],
  ['NOAA SWPC', 'Geomagnetischer K-Index', 'keine'],
  ['Overpass / OpenStreetMap', 'Umgebungsprüfung', 'Koordinaten'],
  ['Nominatim', 'Ortsname zum Standort', 'Koordinaten'],
  ['OpenStreetMap-Kacheln', 'Kartendarstellung', 'Kartenausschnitt'],
]

export default function Privacy() {
  return (
    <section id="daten" className="relative overflow-hidden border-b border-line-dark bg-ink py-20 text-paper sm:py-28">
      <div aria-hidden className="grid-paper-dark absolute inset-0" />

      <div className="relative mx-auto max-w-[84rem] px-5 sm:px-8">
        <SectionHead
          index="03"
          kicker="Datenhaltung"
          tone="dark"
          title={
            <span className="text-paper">
              Einsatzdaten verlassen das Gerät nicht.
            </span>
          }
          lead={
            <>
              Alles, was erfasst wird — Stichwort, Namen, Koordinaten, Flugzeiten, Unterschriften —
              liegt im <code className="font-mono text-paper">localStorage</code> des Browsers, auf
              dem gerade dokumentiert wird. Es gibt keine Synchronisierung und keinen Abgleich.
            </>
          }
        />

        <ul className="grid gap-px border border-line-dark bg-line-dark sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal as="li" key={p.title} delay={i * 70} className="bg-ink p-7">
                <Icon className="size-6 text-signal-2" />
                <h3 className="display mt-5 text-lg text-paper">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-paper-3/65">{p.body}</p>
              </Reveal>
            )
          })}
        </ul>

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h3 className="display text-2xl text-paper">Was doch nach draußen geht</h3>
            <p className="mt-4 text-sm leading-relaxed text-paper-3/65">
              Wetter, Umgebung und Kartenkacheln kommen von öffentlichen Diensten. Dafür wird der
              Einsatzort übertragen — sonst nichts. Keine Namen, keine Einsatzdaten, keine
              Kennungen, keine API-Schlüssel. Offline greift der Zwischenspeicher, dann werden gar
              keine Abfragen gestellt.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-paper-3/65">
              Wem auch das zu viel ist: Die Anwendung lässt sich selbst hosten und die Dienste
              gegen eigene Instanzen tauschen.
            </p>
          </div>

          <div className="border border-line-dark">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Externe Dienste und übertragene Daten</caption>
              <thead>
                <tr className="border-b border-line-dark">
                  <th scope="col" className="label px-4 py-3 text-paper-3/50">Dienst</th>
                  <th scope="col" className="label px-4 py-3 text-paper-3/50">Zweck</th>
                  <th scope="col" className="label px-4 py-3 text-paper-3/50">Übertragen</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(([service, purpose, sent]) => (
                  <tr key={service} className="border-b border-line-dark last:border-b-0">
                    <td className="px-4 py-3.5 font-mono text-xs text-paper">{service}</td>
                    <td className="px-4 py-3.5 text-sm text-paper-3/65">{purpose}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-signal-2">{sent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
