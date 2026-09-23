import { TbArrowUpRight, TbBrandGithub } from 'react-icons/tb'
import { site } from '../site.config'
import { ButtonLink, CropMarks } from './primitives'
import { Mark } from './Nav'

export default function Footer() {
  return (
    <>
      <section className="relative overflow-hidden bg-ink py-20 text-paper sm:py-28">
        <div aria-hidden className="grid-paper-dark absolute inset-0" />
        <div className="relative mx-auto max-w-[84rem] px-5 sm:px-8">
          <div className="relative py-10">
            <CropMarks tone="dark" />
            <p className="label text-signal-2">Ausprobieren</p>
            <h2 className="display mt-6 max-w-[18ch] text-[length:var(--text-section)]">
              Legt einen Übungseinsatz an und schaut, ob es passt.
            </h2>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-paper-3/70">
              Es braucht keine Anmeldung und keine Absprache. Ein Einsatz ist in zehn Sekunden
              angelegt, und wenn er nicht gebraucht wird, löscht er sich von selbst.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink
                href={site.appUrl}
                variant="ghost-dark"
                icon={<TbArrowUpRight className="size-4" />}
              >
                Anwendung öffnen
              </ButtonLink>
              <ButtonLink
                href={site.repoUrl}
                variant="ghost-dark"
                icon={<TbBrandGithub className="size-4" />}
              >
                Quellcode ansehen
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line-dark bg-ink pb-14 text-paper">
        <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
          <div className="grid gap-10 border-t border-line-dark pt-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
            <div>
              <div className="flex items-center gap-2.5 text-paper">
                <Mark />
                <span className="leading-none">
                  <span className="display block text-base">{site.name}</span>
                  <span className="mt-1 block font-mono text-[0.6rem] tracking-[0.12em] text-paper-3/50 uppercase">
                    {site.tagline}
                  </span>
                </span>
              </div>
              <p className="mt-5 max-w-[52ch] text-sm leading-relaxed text-paper-3/60">
                Ein Werkzeug für die Einsatzdokumentation von Drohnenflügen im Katastrophenschutz.
                Entstanden im ehrenamtlichen Betrieb, quelloffen weitergegeben.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <span className="label text-paper-3/40">Projekt</span>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a href={site.repoUrl} target="_blank" rel="noreferrer" className="link-underline">
                      Repository
                    </a>
                  </li>
                  <li>
                    <a href={site.issuesUrl} target="_blank" rel="noreferrer" className="link-underline">
                      Fehler und Wünsche
                    </a>
                  </li>
                  <li>
                    <a
                      href={`${site.repoUrl}/tree/main/server`}
                      target="_blank"
                      rel="noreferrer"
                      className="link-underline"
                    >
                      Signaturdienst
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <span className="label text-paper-3/40">Seite</span>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li><a href="#ablauf" className="link-underline">Ablauf</a></li>
                  <li><a href="#funktionen" className="link-underline">Funktionen</a></li>
                  <li><a href="#daten" className="link-underline">Datenhaltung</a></li>
                  <li><a href="#installation" className="link-underline">Installation</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-line-dark pt-6">
            <p className="max-w-[80ch] font-mono text-[0.7rem] leading-relaxed text-paper-3/45">
              Hinweis: Kein amtliches Produkt, keine Zulassung, keine Gewähr für Vollständigkeit
              oder Richtigkeit der angezeigten Wetter-, Luftraum- und Umgebungsdaten. Die
              Verantwortung für die Flugdurchführung bleibt vollständig bei der verantwortlichen
              Person. Kartendaten © OpenStreetMap-Mitwirkende, Wetterdaten Open-Meteo und
              Deutscher Wetterdienst (über Bright Sky, CC BY 4.0), K-Index NOAA SWPC,
              Flugverkehr adsb.lol (ODbL) und adsb.fi.
            </p>
            <p className="mt-5 font-mono text-[0.7rem] text-paper-3/35">
              Stand {site.revision} · Diese Seite lädt keine Skripte oder Schriften von fremden
              Servern und setzt keine Cookies.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
