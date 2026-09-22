import { useEffect, useState } from 'react'
import { TbBrandGithub } from 'react-icons/tb'
import { site } from '../site.config'

const links = [
  { href: '#ablauf', label: 'Ablauf' },
  { href: '#funktionen', label: 'Funktionen' },
  { href: '#daten', label: 'Daten' },
  { href: '#installation', label: 'Installation' },
  { href: '#signatur', label: 'Signatur' },
  { href: '#fragen', label: 'Fragen' },
]

export function Mark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="7" fill="var(--color-ink)" />
      <g stroke="var(--color-paper)" strokeWidth="4.5" strokeLinecap="round">
        <path d="M32 32 19 19M32 32 45 19M32 32 19 45M32 32 45 45" />
      </g>
      <g fill="none" stroke="var(--color-signal)" strokeWidth="3.5">
        <circle cx="17.5" cy="17.5" r="6.5" />
        <circle cx="46.5" cy="17.5" r="6.5" />
        <circle cx="17.5" cy="46.5" r="6.5" />
        <circle cx="46.5" cy="46.5" r="6.5" />
      </g>
      <rect x="26.5" y="26.5" width="11" height="11" rx="1.5" fill="var(--color-paper)" />
    </svg>
  )
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled ? 'border-line bg-paper/92 backdrop-blur-md' : 'border-transparent bg-paper'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[84rem] items-center gap-3 px-5 sm:gap-6 sm:px-8">
        <a href="#top" className="flex shrink-0 items-center gap-2.5 text-ink">
          <Mark />
          <span className="display text-[0.95rem] leading-none tracking-tight sm:text-[1.05rem]">
            UAV&nbsp;Einsatzverwaltung
          </span>
        </a>

        <ul className="ml-auto hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-mono text-[0.72rem] tracking-[0.1em] text-muted uppercase transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <a
            href={site.repoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Quellcode auf GitHub"
            className="hidden size-10 place-items-center border border-transparent text-ink transition-colors hover:border-line hover:bg-paper-2 sm:grid"
          >
            <TbBrandGithub className="size-5" />
          </a>
          <a
            href={site.appUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-ink px-3.5 py-2.5 text-[0.82rem] font-semibold tracking-tight whitespace-nowrap text-paper transition-colors hover:bg-signal sm:px-4 sm:text-sm"
          >
            App öffnen
          </a>
        </div>
      </nav>
    </header>
  )
}
