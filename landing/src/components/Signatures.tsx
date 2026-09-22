import { TbChevronRight, TbCircleCheck, TbCircleX } from 'react-icons/tb'
import { site } from '../site.config'
import { SectionHead } from './primitives'

const chain = [
  { step: '01', title: 'PDF erzeugen', body: 'Der Einsatzbericht entsteht wie immer im Browser.' },
  { step: '02', title: 'SHA-256 bilden', body: 'Der Dienst hasht das fertige Dokument — die Bytes bleiben unverändert.' },
  { step: '03', title: 'Ed25519 signieren', body: 'Signiert wird der Hash zusammen mit der Kennung der angemeldeten Person.' },
  { step: '04', title: 'Kette fortschreiben', body: 'Jeder Eintrag hängt am Hash des vorherigen. Nachträgliches Ändern bricht die Kette.' },
  { step: '05', title: 'Prüfen', body: 'Wer das PDF hat, kann es ohne Login gegen die Registry prüfen lassen.' },
]

const does = [
  'Bindet kryptografisch, wer unterschrieben hat — die Kennung steckt in der signierten Nutzlast.',
  'Führt ein fortlaufendes, hash-verkettetes Protokoll; jede Manipulation daran ist feststellbar.',
  'Erlaubt jedem mit dem Dokument eine Prüfung, ohne Zugang zum System.',
  'Legt geprüfte Berichte auf Wunsch in einem Archiv ab; optional mit Virenprüfung beim Upload.',
]

const doesNot = [
  'Erzeugt keine eIDAS-konforme oder PAdES-Signatur.',
  'Verändert die PDF-Datei nicht — Adobe Reader zeigt keine eingebettete Signatur an.',
  'Ersetzt keine rechtliche Beratung zur Beweiskraft im Einzelfall.',
]

export default function Signatures() {
  return (
    <section id="signatur" className="border-b border-line bg-paper-2/40 py-20 sm:py-28">
      <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
        <SectionHead
          index="05"
          kicker="Optionaler Zusatz"
          title={<>Signierte Berichte — wenn ihr sie braucht.</>}
          lead={
            <>
              Manche Bereitschaften müssen belegen können, dass ein Bericht nach der Unterschrift
              nicht mehr angefasst wurde. Dafür gibt es einen kleinen, eigenständigen Dienst. Er ist
              vollständig optional: Ohne ihn erscheint in der App kein Anmelde- und kein
              Signaturbereich, und alles andere funktioniert unverändert.
            </>
          }
        />

        <div className="border-2 border-dashed border-line bg-paper p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-signal px-2.5 py-1 font-mono text-[0.68rem] font-medium tracking-[0.16em] text-paper uppercase">
              Optional
            </span>
            <span className="label text-muted">Eigener Dienst · eigener Betrieb · eigener Aufwand</span>
          </div>

          <ol className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {chain.map((c, i) => (
              <li key={c.step} className="relative bg-paper p-5">
                <span className="font-mono text-[0.7rem] tracking-widest text-signal">{c.step}</span>
                <h3 className="display mt-3 text-base">{c.title}</h3>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">{c.body}</p>
                {i < chain.length - 1 ? (
                  <TbChevronRight
                    aria-hidden
                    className="absolute top-1/2 -right-[9px] z-10 hidden size-4 -translate-y-1/2 bg-paper text-line lg:block"
                  />
                ) : null}
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="flex items-center gap-2.5 text-base font-semibold">
                <TbCircleCheck className="size-5 text-verify" />
                Was der Dienst leistet
              </h3>
              <ul className="mt-5 space-y-3">
                {does.map((d) => (
                  <li key={d} className="flex gap-3 text-sm leading-relaxed text-ink-3">
                    <span aria-hidden className="mt-[0.5rem] size-1 shrink-0 bg-verify" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="flex items-center gap-2.5 text-base font-semibold">
                <TbCircleX className="size-5 text-signal" />
                Was er ausdrücklich nicht leistet
              </h3>
              <ul className="mt-5 space-y-3">
                {doesNot.map((d) => (
                  <li key={d} className="flex gap-3 text-sm leading-relaxed text-ink-3">
                    <span aria-hidden className="mt-[0.5rem] size-1 shrink-0 bg-signal" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
            <div>
              <span className="label text-muted">Betrieb</span>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">
                Node-Dienst mit SQLite-Datei; Container-Abbild wird aus dem Repository gebaut.
              </p>
            </div>
            <div>
              <span className="label text-muted">Anmeldung</span>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">
                OpenID Connect über PocketID — öffentlicher Client mit PKCE, kein Geheimnis in der App.
              </p>
            </div>
            <div>
              <span className="label text-muted">Schlüssel</span>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">
                Ed25519-Schlüsselpaar liegt als Datei neben dem Dienst — sichern, sonst sind alte
                Signaturen nicht mehr prüfbar.
              </p>
            </div>
          </div>

          <p className="mt-8 text-sm text-muted">
            Die vollständige Beschreibung steht im Repository unter{' '}
            <a
              href={`${site.repoUrl}/tree/main/server`}
              target="_blank"
              rel="noreferrer"
              className="link-underline text-ink"
            >
              server/
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
