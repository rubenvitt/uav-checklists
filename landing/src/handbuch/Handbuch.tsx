import { useEffect, useState } from 'react'
import { TbArrowUpRight, TbPrinter } from 'react-icons/tb'
import { kapitel } from 'virtual:handbuch'
import Nav, { type NavLink } from '../components/Nav'
import Footer from '../components/Footer'
import { site } from '../site.config'

const navLinks: NavLink[] = [
  { href: '../#ablauf', label: 'Ablauf' },
  { href: '../#funktionen', label: 'Funktionen' },
  { href: '../#installation', label: 'Installation' },
  { href: '../#fragen', label: 'Fragen' },
]

/** Hebt im Inhaltsverzeichnis das Kapitel hervor, das gerade gelesen wird. */
function useAktivesKapitel(): string | undefined {
  const [aktiv, setAktiv] = useState<string>()

  useEffect(() => {
    const sections = kapitel
      .map((k) => document.getElementById(k.slug))
      .filter((el): el is HTMLElement => el !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        const sichtbar = entries.filter((e) => e.isIntersecting)
        if (sichtbar.length) setAktiv(sichtbar[sichtbar.length - 1].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return aktiv
}

/**
 * Der Browser springt beim Laden vor dem Rendern zum Anker — danach nachholen,
 * und noch einmal, wenn Schriften und Seite geladen sind (der Text bricht dann
 * anders um und das Ziel verrutscht).
 */
function useAnkerBeimLaden() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const springen = () => document.getElementById(id)?.scrollIntoView()
    springen()
    void document.fonts?.ready.then(springen)
    if (document.readyState !== 'complete') window.addEventListener('load', springen, { once: true })
    return () => window.removeEventListener('load', springen)
  }, [])
}

function Inhalt({ aktiv, onNavigate }: { aktiv?: string; onNavigate?: () => void }) {
  return (
    <ol className="space-y-1">
      {kapitel.map((k) => (
        <li key={k.slug}>
          <a
            href={`#${k.slug}`}
            onClick={onNavigate}
            aria-current={aktiv === k.slug ? 'location' : undefined}
            className="flex gap-3 border-l-2 border-transparent py-1.5 pl-3 text-[0.92rem] leading-snug text-muted transition-colors hover:text-ink aria-[current=location]:border-signal aria-[current=location]:text-ink"
          >
            <span className="num w-5 shrink-0 font-mono text-[0.75rem] text-signal">{k.nummer}</span>
            <span>{k.titel}</span>
          </a>
          {aktiv === k.slug && k.abschnitte.length > 0 ? (
            <ol className="mt-1 mb-2 ml-11 space-y-1 border-l border-line pl-3">
              {k.abschnitte.map((a) => (
                <li key={a.id}>
                  <a
                    href={`#${a.id}`}
                    onClick={onNavigate}
                    className="block py-0.5 text-[0.82rem] leading-snug text-muted hover:text-ink"
                  >
                    {a.titel}
                  </a>
                </li>
              ))}
            </ol>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export default function Handbuch() {
  const aktiv = useAktivesKapitel()
  const [mobilOffen, setMobilOffen] = useState(false)
  useAnkerBeimLaden()

  return (
    <>
      <a
        href="#kapitel"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Zum Inhalt springen
      </a>
      <Nav links={navLinks} home="../" handbuch="" />

      <main>
        <header className="border-b border-line">
          <div className="mx-auto max-w-[84rem] px-5 pt-14 pb-12 sm:px-8 sm:pt-20 sm:pb-16">
            <div className="flex items-center gap-4 border-t border-line pt-3">
              <span className="label text-signal">Handbuch</span>
              <span className="label text-muted">Stand {site.revision}</span>
            </div>
            <h1 className="display mt-6 max-w-[20ch] text-[length:var(--text-section)]">
              Die Flugmappe im Einsatz — Schritt für Schritt.
            </h1>
            <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">
              Für Fernpiloten, Luftraumbeobachter, Truppführer und Bildauswerter. Ihr braucht kein
              Technikwissen: Jedes Kapitel folgt dem Ablauf an der Einsatzstelle und zeigt mit
              Bildern, wo ihr tippt und was die Anzeigen bedeuten.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 print:hidden">
              <a
                href={site.appUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 bg-bedien px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-bedien-hover"
              >
                App öffnen <TbArrowUpRight className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2.5 border border-ink/30 px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-bedien hover:text-bedien"
              >
                <TbPrinter className="size-4" /> Drucken oder als PDF sichern
              </button>
            </div>

            <ol className="fugen mt-12 grid sm:grid-cols-2 lg:grid-cols-5 print:hidden">
              {kapitel.map((k) => (
                <li key={k.slug} className="bg-paper-2">
                  <a href={`#${k.slug}`} className="group block h-full p-5 transition-colors hover:bg-white">
                    <span className="num font-mono text-[0.75rem] text-signal">{k.nummer}</span>
                    <span className="mt-2 block font-semibold leading-snug group-hover:text-bedien">
                      {k.titel}
                    </span>
                    {k.kurz ? (
                      <span className="mt-1.5 block text-[0.86rem] leading-snug text-muted">{k.kurz}</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </header>

        <div className="mx-auto max-w-[84rem] px-5 sm:px-8 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
          {/* Handy/Tablet hochkant: aufklappbares Inhaltsverzeichnis, das mitläuft.
              Steht außerhalb von <aside>, damit es über die ganze Seite klebt. */}
          <div className="sticky top-16 z-40 -mx-5 border-b border-line bg-paper/95 px-5 backdrop-blur-md sm:-mx-8 sm:px-8 lg:hidden print:hidden">
            <button
              type="button"
              aria-expanded={mobilOffen}
              onClick={() => setMobilOffen((o) => !o)}
              className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
            >
              <span className="label text-muted">Inhalt</span>
              <span className="truncate text-sm font-semibold">
                {kapitel.find((k) => k.slug === aktiv)?.titel ?? 'Kapitel wählen'}
              </span>
            </button>
            {mobilOffen ? (
              <nav aria-label="Inhaltsverzeichnis" className="max-h-[65vh] overflow-y-auto pb-4">
                <Inhalt aktiv={aktiv} onNavigate={() => setMobilOffen(false)} />
              </nav>
            ) : null}
          </div>
          <aside className="hidden print:hidden lg:block">
            <nav aria-label="Inhaltsverzeichnis" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto py-12">
              <p className="label mb-4 text-muted">Inhalt</p>
              <Inhalt aktiv={aktiv} />
            </nav>
          </aside>

          <div id="kapitel" className="min-w-0 py-6 lg:py-12">
            {kapitel.map((k) => (
              <section key={k.slug} id={k.slug} className="hb-kapitel scroll-mt-28 border-b border-line py-10 last:border-b-0 sm:py-14">
                <div className="flex items-center gap-4 border-t border-line pt-3">
                  <span className="label text-signal">Kapitel {k.nummer}</span>
                </div>
                <h2 className="display mt-5 text-[clamp(1.7rem,3.4vw,2.5rem)]">{k.titel}</h2>
                {k.kurz ? <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-muted">{k.kurz}</p> : null}
                <div className="hb-inhalt mt-8" dangerouslySetInnerHTML={{ __html: k.html }} />
              </section>
            ))}
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer base="../" />
      </div>
    </>
  )
}
