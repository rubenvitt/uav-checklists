import { TbArrowUpRight, TbBrandGithub } from 'react-icons/tb'
import { site, keyFigures } from '../site.config'
import { BrowserFrame, ButtonLink, CropMarks, PhoneFrame } from './primitives'

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-line">
      <div aria-hidden className="grid-paper absolute inset-0 opacity-55" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-paper/10 via-paper/70 to-paper"
      />

      <div className="relative mx-auto max-w-[84rem] px-5 sm:px-8">
        <div className="relative grid gap-14 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-28">
          <CropMarks />

          <div className="max-w-2xl">
            <div className="label flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
              <span className="text-signal">◆</span>
              <span>Katastrophenschutz</span>
              <span className="text-line">/</span>
              <span>UAV-Betrieb</span>
              <span className="text-line">/</span>
              <span>Stand {site.revision}</span>
            </div>

            <h1 className="display mt-7 text-[length:var(--text-hero)]">
              Die Flugmappe
              <br />
              hat alles
              <br />
              <span className="text-signal">auf dem Schirm.</span>
            </h1>

            <p className="mt-8 max-w-[56ch] text-lg leading-relaxed text-ink-3 sm:text-xl">
              Eine Web-App, die einen Drohneneinsatz von der Alarmierung bis zum unterschriebenen
              Bericht führt: Einsatzdaten, Wetter- und Risikobewertung, Flugtagebuch, Nachbereitung.
              Gebaut für Bereitschaften, die im Gelände dokumentieren müssen — auf dem Tablet neben
              dem Fernpiloten, nicht am Schreibtisch danach.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <ButtonLink href={site.appUrl} icon={<TbArrowUpRight className="size-4" />}>
                Anwendung öffnen
              </ButtonLink>
              <ButtonLink href={site.repoUrl} variant="outline" icon={<TbBrandGithub className="size-4" />}>
                Quellcode ansehen
              </ButtonLink>
            </div>

            <p className="mt-6 max-w-[48ch] font-mono text-xs leading-relaxed text-muted">
              Läuft im Browser. Keine Installation nötig — auf Wunsch als App auf dem Homescreen.
              Kostenlos und quelloffen.
            </p>
          </div>

          <div className="relative lg:pl-4">
            {/* Handy: nur das Flugtagebuch */}
            <PhoneFrame
              src="./screenshots/flugbuch.webp"
              alt="Flugphase in der Flugmappe mit Luftraumüberwachung, Ereignisprotokoll und Flugtagebuch"
              className="mx-auto max-w-[17rem] sm:max-w-[18rem] lg:hidden"
              priority
            />
            {/* Desktop: Laptop-Browser, davor das Handy mit der Meldung der Luftraumüberwachung */}
            <div className="relative hidden pb-24 lg:block">
              <BrowserFrame
                src="./screenshots/flugbuch-desktop.webp"
                alt="Flugphase am Laptop: Luftraumüberwachung, Ereignisprotokoll und Flugtagebuch"
                className="lg:ml-10"
              />
              <PhoneFrame
                src="./screenshots/luftraum.webp"
                alt="Meldung der Luftraumüberwachung auf dem Handy: Hubschrauber im Tiefflug in der Nähe"
                className="absolute bottom-0 -left-2 w-[10.5rem] xl:w-[11.5rem]"
              />
            </div>
            <div className="mt-5 hidden items-start gap-3 lg:flex lg:pl-[12.5rem] xl:pl-[13.5rem]">
              <span aria-hidden className="mt-2 h-px w-8 shrink-0 bg-signal" />
              <p className="max-w-[34ch] font-mono text-[0.7rem] leading-relaxed text-muted">
                Abb. 01 — Flugphase am Laptop, auf dem Handy die Meldung der Luftraumüberwachung:
                neuer Hubschrauber im Tiefflug, automatisch im Ereignisprotokoll.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-line bg-paper-2/60">
        <dl className="mx-auto grid max-w-[84rem] grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          {keyFigures.map((fig) => (
            <div key={fig.unit} className="border-t border-line px-5 py-7 sm:border-t-0 sm:px-8">
              <dt className="flex items-baseline gap-2">
                <span className="display text-4xl whitespace-nowrap sm:text-5xl">{fig.value}</span>
                <span className="label text-muted">{fig.unit}</span>
              </dt>
              <dd className="mt-2 text-sm leading-snug text-muted">{fig.note}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
