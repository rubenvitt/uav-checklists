import { Reveal } from './primitives'

const groups = [
  {
    for: 'Bereitschaften mit UAV-Trupp',
    body: 'Ihr fliegt für Erkundung, Personensuche oder Lagebilder und führt die Dokumentation bisher auf Papier, in einer Tabelle oder gar nicht einheitlich. Die App gibt dem Ganzen eine feste Reihenfolge, ohne dass jemand ein System lernen muss.',
  },
  {
    for: 'Fernpiloten und Luftraumbeobachter',
    body: 'Ihr braucht an der Einsatzstelle schnell belastbare Zahlen — Böen auf Flughöhe, K-Index, was in 1,5 km Umkreis liegt — und danach ein Flugbuch, das ohne Abtippen entsteht.',
  },
  {
    for: 'Interessierte von außen',
    body: 'Ihr wollt sehen, wie eine Vorflugkontrolle im Katastrophenschutz tatsächlich abläuft, was SORA in der Praxis bedeutet und wie sich so etwas ohne Cloud lösen lässt. Der komplette Quellcode liegt offen.',
  },
]

export default function Audience() {
  return (
    <section className="border-b border-line py-20 sm:py-24">
      <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div>
            <span className="label text-muted">Wofür das gedacht ist</span>
            <p className="display mt-6 text-[clamp(1.6rem,3vw,2.35rem)] leading-[1.12]">
              Ein Drohneneinsatz erzeugt mehr Papier als Flugzeit. Die App nimmt genau diesen Teil
              ab — und zwar dort, wo er anfällt.
            </p>
            <p className="mt-6 max-w-[52ch] leading-relaxed text-muted">
              Entstanden ist sie nicht am Reißbrett, sondern aus dem laufenden Betrieb einer
              ehrenamtlichen Einheit: Was im Einsatz sowieso abgefragt, entschieden und
              aufgeschrieben wird, steht in der gleichen Reihenfolge in der App.
            </p>
          </div>

          <ul className="border-t border-line">
            {groups.map((g, i) => (
              <Reveal as="li" key={g.for} delay={i * 80} className="border-b border-line py-7">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-signal">0{i + 1}</span>
                  <h3 className="display text-xl">{g.for}</h3>
                </div>
                <p className="mt-3 max-w-[58ch] pl-9 text-sm leading-relaxed text-muted">{g.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
