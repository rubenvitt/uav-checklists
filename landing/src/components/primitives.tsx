import { useEffect, useRef, useState, type ReactNode } from 'react'
import { site } from '../site.config'

/* ── Einblenden beim Scrollen ─────────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'section'
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Beim Einhängen bereits sichtbare (oder schon überscrollte) Elemente sofort
    // zeigen. Ohne diese Prüfung bleibt ein Block unsichtbar, wenn der Observer
    // beim schnellen Scrollen oder beim Laden mit Anker keinen Eintrag liefert.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.95) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    )
    observer.observe(el)

    // Rückfallebene: Sollte der Observer nie auslösen (etwa weil das Element in
    // einem Container ohne Layout sitzt), wird der Inhalt trotzdem sichtbar.
    const fallback = window.setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) setShown(true)
    }, 1200)

    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])

  return (
    <Tag
      // @ts-expect-error — generischer Ref über mehrere Tag-Namen hinweg
      ref={ref}
      className={`reveal ${className}`}
      data-shown={shown || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

/* ── Abschnittskopf mit laufender Nummer ──────────────────── */

export function SectionHead({
  index,
  kicker,
  title,
  lead,
  tone = 'light',
}: {
  index: string
  kicker: string
  title: ReactNode
  lead?: ReactNode
  tone?: 'light' | 'dark'
}) {
  const line = tone === 'dark' ? 'border-line-dark' : 'border-line'
  const muted = tone === 'dark' ? 'text-paper-3/70' : 'text-muted'

  return (
    <header className="mb-12 sm:mb-16">
      <div className={`flex items-center gap-4 border-t pt-3 ${line}`}>
        <span className={`label ${tone === 'dark' ? 'text-signal-2' : 'text-signal'}`}>{index}</span>
        <span className={`label ${muted}`}>{kicker}</span>
      </div>
      <h2 className="display mt-6 max-w-[22ch] text-[length:var(--text-section)]">{title}</h2>
      {lead ? <p className={`mt-5 max-w-[62ch] text-lg leading-relaxed ${muted}`}>{lead}</p> : null}
    </header>
  )
}

/* ── Knöpfe ───────────────────────────────────────────────── */

export function ButtonLink({
  href,
  children,
  variant = 'solid',
  icon,
  external = true,
}: {
  href: string
  children: ReactNode
  variant?: 'solid' | 'outline' | 'ghost-dark'
  icon?: ReactNode
  external?: boolean
}) {
  const base =
    'group inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold tracking-tight transition-colors duration-150'
  const styles = {
    solid: 'bg-ink text-paper hover:bg-signal',
    outline: 'border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-paper',
    'ghost-dark': 'border border-paper/25 text-paper hover:border-paper hover:bg-paper hover:text-ink',
  }[variant]

  return (
    <a
      href={href}
      className={`${base} ${styles}`}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {children}
      {icon ? <span className="transition-transform duration-150 group-hover:translate-x-0.5">{icon}</span> : null}
    </a>
  )
}

/* ── Passermarken wie auf einem Druckbogen ────────────────── */

export function CropMarks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const color = tone === 'dark' ? 'border-paper/30' : 'border-ink/25'
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className={`absolute top-0 left-0 size-3 border-t border-l ${color}`} />
      <span className={`absolute top-0 right-0 size-3 border-t border-r ${color}`} />
      <span className={`absolute bottom-0 left-0 size-3 border-b border-l ${color}`} />
      <span className={`absolute right-0 bottom-0 size-3 border-r border-b ${color}`} />
    </div>
  )
}

/* ── Geräterahmen für Screenshots ─────────────────────────── */

export function PhoneFrame({
  src,
  alt,
  caption,
  className = '',
  priority = false,
}: {
  src: string
  alt: string
  caption?: string
  className?: string
  priority?: boolean
}) {
  return (
    <figure className={className}>
      <div className="relative rounded-[2rem] border border-ink/15 bg-ink p-2 shadow-[0_26px_60px_-30px_rgba(16,22,28,0.55)]">
        <div className="overflow-hidden rounded-[1.6rem] bg-paper">
          <img
            src={src}
            alt={alt}
            width={430}
            height={932}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="block h-auto w-full"
          />
        </div>
      </div>
      {caption ? (
        <figcaption className="mt-3 flex items-baseline gap-2 font-mono text-[0.7rem] text-muted">
          <span className="text-signal">▸</span>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

/**
 * Browserfenster für die Desktop-Aufnahmen (`*-desktop.webp`, 1024 × 700).
 * Schlicht gehalten: Titelleiste mit drei Punkten und Adresszeile.
 */
export function BrowserFrame({
  src,
  alt,
  caption,
  className = '',
  priority = false,
}: {
  src: string
  alt: string
  caption?: string
  className?: string
  priority?: boolean
}) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-lg border border-ink/15 bg-paper shadow-[0_26px_60px_-30px_rgba(16,22,28,0.55)]">
        <div aria-hidden className="flex items-center gap-3 border-b border-ink/10 bg-paper-2 px-3 py-2">
          <span className="flex gap-1.5">
            <span className="size-2 rounded-full bg-ink/20" />
            <span className="size-2 rounded-full bg-ink/20" />
            <span className="size-2 rounded-full bg-ink/20" />
          </span>
          <span className="flex-1 truncate rounded bg-paper px-2.5 py-0.5 text-center font-mono text-[0.65rem] text-muted">
            {site.appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </span>
          <span className="w-[2.6rem]" />
        </div>
        <img
          src={src}
          alt={alt}
          width={1024}
          height={700}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 flex items-baseline gap-2 font-mono text-[0.7rem] text-muted">
          <span className="text-signal">▸</span>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

/**
 * Screenshot passend zum Bildschirm des Betrachters: bis `lg` im Handyrahmen,
 * darüber die Desktop-Aufnahme im Browserfenster. Ausgeblendete Bilder mit
 * `loading="lazy"` lädt der Browser nicht.
 */
export function DeviceShot({
  shot,
  alt,
  caption,
  phoneClassName = '',
  browserClassName = '',
}: {
  shot: string
  alt: string
  caption?: string
  phoneClassName?: string
  browserClassName?: string
}) {
  return (
    <>
      <PhoneFrame src={`./screenshots/${shot}.webp`} alt={alt} caption={caption} className={`lg:hidden ${phoneClassName}`} />
      <BrowserFrame
        src={`./screenshots/${shot}-desktop.webp`}
        alt={alt}
        caption={caption}
        className={`hidden lg:block ${browserClassName}`}
      />
    </>
  )
}
