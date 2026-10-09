import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { PiMonitor, PiSun, PiMoon, PiArrowsClockwise, PiFilePdf, PiArrowLeft, PiShareNetwork, PiSignIn, PiSignOut } from 'react-icons/pi'
import type { ThemeSetting } from '../hooks/useTheme'
import { useAuth } from '../context/useAuth'
import { useMissionDisplayLabel } from '../hooks/useMissionDisplayLabel'
import Bildmarke from './Bildmarke'

interface OverviewHeaderProps {
  mode: 'overview'
  themeSetting: ThemeSetting
  onCycleTheme: () => void
}

interface MissionHeaderProps {
  mode: 'mission'
  missionId: string
  missionCreatedAt: number
  missionLabel: string
  isCompleted: boolean
  themeSetting: ThemeSetting
  onCycleTheme: () => void
  onRefresh?: () => void
  onExportPdf?: () => void
  onSharePdf?: () => void
}

type HeaderProps = OverviewHeaderProps | MissionHeaderProps

const themeIcon: Record<ThemeSetting, ReactNode> = {
  system: <PiMonitor />,
  light: <PiSun />,
  dark: <PiMoon />,
}

const themeLabel: Record<ThemeSetting, string> = {
  system: 'Design: automatisch (Sonnenstand)',
  light: 'Design: hell',
  dark: 'Design: Nachtbetrieb',
}

/** Bedienziel in der Kopfleiste: 44 px, dunkler Rahmen in beiden Modi. */
const rahmenBtnClass =
  'flex h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 text-lg text-rahmen-gedaempft transition-colors hover:bg-rahmen-aktiv hover:text-rahmen-text'

/** Sekundäraktion im Seitenkopf: umrandet, 44 px (Handschuh-tauglich). */
const actionBtnClass =
  'flex h-11 w-11 shrink-0 items-center justify-center border border-line-strong bg-surface text-lg text-text-muted transition-colors hover:border-control-border hover:text-text active:bg-surface-alt'

function Uhr() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(id)
  }, [])
  const hhmm = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return (
    <span className="num px-2 text-sm text-rahmen-text" aria-label={`Uhrzeit ${hhmm}`}>
      {hhmm}
    </span>
  )
}

/**
 * Optional PocketID login affordance. Renders nothing unless the signature
 * backend AND OIDC client are configured (graceful degradation), so the
 * public no-backend deployment is unchanged.
 */
function LoginAffordance() {
  const { configured, isAuthenticated, displayName, login, logout } = useAuth()

  if (!configured) return null

  if (isAuthenticated) {
    const initials = (displayName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('')
    return (
      <button onClick={logout} className={rahmenBtnClass} aria-label={`Abmelden (${displayName})`} title={`${displayName} · Abmelden`}>
        <span className="num flex h-7 w-7 items-center justify-center bg-rahmen-feld text-[11px] font-medium text-rahmen-text">
          {initials || '?'}
        </span>
        <PiSignOut className="text-base" />
      </button>
    )
  }

  return (
    <button onClick={login} className={`${rahmenBtnClass} text-sm`} title="Anmelden">
      <PiSignIn className="text-base" />
      <span>Anmelden</span>
    </button>
  )
}

/**
 * Kopfleiste nach Lifeline Hub: 52 px, in beiden Modi dunkel, Markenzelle links,
 * Wortmarke Mono, rechts Uhr, Anmeldung und Design-Umschalter.
 */
function Kopfleiste({ themeSetting, onCycleTheme }: { themeSetting: ThemeSetting; onCycleTheme: () => void }) {
  return (
    <div className="sticky top-0 z-40 border-b border-rahmen-linie bg-rahmen text-rahmen-text">
      <div className="mx-auto flex h-13 max-w-3xl items-center">
        <Link
          to="/"
          className="flex h-13 items-center gap-2.5 pr-3 pl-4 text-rahmen-text"
          aria-label="Flugmappe – Übersicht"
        >
          <Bildmarke />
          <span className="font-mono text-xs tracking-wide text-rahmen-gedaempft">flugmappe</span>
        </Link>
        <div className="ml-auto flex items-center pr-2">
          <Uhr />
          <LoginAffordance />
          <button
            onClick={onCycleTheme}
            className={rahmenBtnClass}
            aria-label={themeLabel[themeSetting]}
            title={themeLabel[themeSetting]}
          >
            {themeIcon[themeSetting]}
          </button>
        </div>
      </div>
    </div>
  )
}

function MissionSeitenkopf(props: MissionHeaderProps) {
  const navigate = useNavigate()
  const displayLabel = useMissionDisplayLabel(props.missionId, props.missionCreatedAt)

  return (
    <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-4">
      <button
        onClick={() => navigate('/')}
        className={actionBtnClass}
        aria-label="Zurück zur Übersicht"
        title="Zurück zur Übersicht"
      >
        <PiArrowLeft />
      </button>
      <div className="min-w-0 flex-1">
        <p className="eyebrow truncate">
          {props.isCompleted ? 'Einsatz · abgeschlossen' : 'Einsatz'}
        </p>
        <h1 className="truncate text-[15px] leading-5 font-semibold text-text" title={displayLabel}>
          {displayLabel}
        </h1>
        {displayLabel !== props.missionLabel && (
          <p className="num truncate text-[11px] leading-4 text-text-muted">{props.missionLabel}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {props.onExportPdf && (
          <button onClick={props.onExportPdf} className={actionBtnClass} aria-label="PDF herunterladen" title="PDF herunterladen">
            <PiFilePdf />
          </button>
        )}
        {props.onSharePdf && (
          <button onClick={props.onSharePdf} className={actionBtnClass} aria-label="PDF teilen" title="PDF teilen">
            <PiShareNetwork />
          </button>
        )}
        {props.onRefresh && (
          <button
            onClick={props.onRefresh}
            className={actionBtnClass}
            aria-label="Umgebungsdaten neu laden"
            title="Umgebungsdaten neu laden"
          >
            <PiArrowsClockwise />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Header(props: HeaderProps) {
  return (
    <>
      <Kopfleiste themeSetting={props.themeSetting} onCycleTheme={props.onCycleTheme} />
      {props.mode === 'mission' && <MissionSeitenkopf {...props} />}
    </>
  )
}
