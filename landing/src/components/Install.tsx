import { useState } from 'react'
import { TbBrandAndroid, TbBrandApple, TbCheck, TbCopy, TbDeviceLaptop, TbServer2 } from 'react-icons/tb'
import type { IconType } from 'react-icons'
import { site } from '../site.config'
import { ButtonLink, Reveal, SectionHead } from './primitives'

const platforms: Array<{ icon: IconType; name: string; steps: string[] }> = [
  {
    icon: TbBrandApple,
    name: 'iPhone / iPad',
    steps: [
      'Die Adresse in Safari öffnen — nicht in Chrome, dort fehlt der Menüpunkt.',
      'Auf das Teilen-Symbol tippen.',
      '„Zum Home-Bildschirm“ wählen und bestätigen.',
    ],
  },
  {
    icon: TbBrandAndroid,
    name: 'Android',
    steps: [
      'Die Adresse in Chrome öffnen.',
      'Menü (drei Punkte) antippen.',
      '„App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.',
    ],
  },
  {
    icon: TbDeviceLaptop,
    name: 'Notebook im FüKw',
    steps: [
      'Die Adresse in Chrome oder Edge öffnen.',
      'Auf das Installationssymbol rechts in der Adressleiste klicken.',
      'Die App startet danach in einem eigenen Fenster, auch offline.',
    ],
  },
]

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Zwischenablage nicht verfügbar (z. B. ohne HTTPS) — der Text lässt sich
      // weiterhin von Hand markieren.
    }
  }

  return (
    <div className="min-w-0 border border-line-dark bg-ink">
      <div className="flex items-center justify-between border-b border-line-dark px-4 py-2.5">
        <span className="label text-paper-3/50">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 font-mono text-[0.7rem] text-paper-3/60 transition-colors hover:text-paper"
        >
          {copied ? <TbCheck className="size-3.5 text-verify" /> : <TbCopy className="size-3.5" />}
          {copied ? 'kopiert' : 'kopieren'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.78rem] leading-relaxed text-paper-3/85">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const selfHost = `git clone ${site.repoUrl}.git
cd uav-checklists
pnpm install
pnpm build

# dist/ enthält die fertige App — auf einen beliebigen
# Webserver legen (nginx, Caddy, Apache, S3, Pages …).
# Wichtig: alle unbekannten Pfade auf /index.html
# umleiten, sonst brechen die Einsatz-URLs beim Neuladen.`

export default function Install() {
  return (
    <section id="installation" className="border-b border-line py-20 sm:py-28">
      <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
        <SectionHead
          index="04"
          kicker="Inbetriebnahme"
          title={<>Aufrufen reicht. Installieren geht trotzdem.</>}
          lead={
            <>
              Es gibt nichts aus einem App-Store zu laden und nichts freizugeben. Die Adresse im
              Browser öffnen genügt — wer die App dauerhaft auf dem Einsatztablet will, legt sie in
              drei Schritten auf den Homescreen.
            </>
          }
        />

        {/* Variante A */}
        <div className="grid items-center gap-6 border border-line bg-paper-2/60 p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div>
            <span className="label text-muted">Variante A — nichts tun</span>
            <h3 className="display mt-4 text-2xl sm:text-3xl">Einfach im Browser öffnen</h3>
            <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-muted">
              Funktioniert auf Tablet, Handy und Notebook. Beim ersten Aufruf lädt die App sich
              selbst in den Zwischenspeicher und ist danach auch ohne Netz startklar.
            </p>
          </div>
          <div className="shrink-0">
            <ButtonLink href={site.appUrl}>{site.appUrl.replace(/^https?:\/\//, '')}</ButtonLink>
          </div>
        </div>

        {/* Variante B */}
        <div className="mt-16">
          <span className="label text-muted">Variante B — auf den Homescreen</span>
          <ul className="mt-6 grid border-t border-l border-line md:grid-cols-3">
            {platforms.map((p) => {
              const Icon = p.icon
              return (
                <li key={p.name} className="border-r border-b border-line p-7">
                  <div className="flex items-center gap-3">
                    <Icon className="size-5 text-signal" />
                    <h4 className="display text-lg">{p.name}</h4>
                  </div>
                  <ol className="mt-5 space-y-3">
                    {p.steps.map((step, n) => (
                      <li key={step} className="flex gap-3 text-sm leading-snug text-muted">
                        <span className="font-mono text-xs text-ink-3">{n + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Variante C */}
        <div className="mt-16 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <TbServer2 className="size-5 text-signal" />
              <span className="label text-muted">Variante C — selbst hosten</span>
            </div>
            <h3 className="display mt-4 text-2xl sm:text-3xl">Eigene Instanz, eigene Domain</h3>
            <p className="mt-4 max-w-[54ch] text-sm leading-relaxed text-muted">
              Die App ist ein statischer Build ohne Laufzeitabhängigkeiten. Wer sie im eigenen Netz
              oder unter der Domain der Bereitschaft betreiben will, braucht nur einen Webserver,
              der Dateien ausliefert.
            </p>

            <div className="mt-7 border-l-2 border-signal bg-paper-2/70 p-5">
              <p className="text-sm leading-relaxed text-ink-3">
                <strong className="font-semibold">Drohnenprofile anpassen:</strong> Die Grenzwerte
                stecken in <code className="font-mono text-[0.82em]">src/data/drones.ts</code>. Wer
                eine andere Plattform fliegt, ergänzt dort ein Profil mit Windgrenze,
                Temperaturbereich, IP-Schutzart, Dienstgipfelhöhe und Abflugmasse — die gesamte
                Wetterbewertung richtet sich danach.
              </p>
            </div>

            <p className="mt-7 max-w-[54ch] text-sm leading-relaxed text-muted">
              Fragen zur Inbetriebnahme gehen am besten über die{' '}
              <a href={site.issuesUrl} target="_blank" rel="noreferrer" className="link-underline text-ink">
                Issues im Repository
              </a>{' '}
              — dann haben andere Bereitschaften die Antwort gleich mit.
            </p>
          </div>

          <Reveal className="min-w-0 lg:pt-1">
            <CodeBlock label="Terminal" code={selfHost} />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
