import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { PiMonitor, PiSun, PiMoon, PiArrowsClockwise, PiFilePdf, PiArrowLeft, PiShareNetwork, PiSignIn, PiSignOut, PiUserCircle } from 'react-icons/pi'
import type { ThemeSetting } from '../hooks/useTheme'
import { useAuth } from '../context/useAuth'

interface OverviewHeaderProps {
  mode: 'overview'
  themeSetting: ThemeSetting
  onCycleTheme: () => void
  onRefresh?: undefined
  onExportPdf?: undefined
  onSharePdf?: undefined
  missionLabel?: undefined
}

interface MissionHeaderProps {
  mode: 'mission'
  missionLabel: string
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
  system: 'Systemeinstellung',
  light: 'Helles Design',
  dark: 'Dunkles Design',
}

const iconBtnClass = 'rounded-lg bg-surface p-2.5 text-lg text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-95'

/**
 * Optional PocketID login affordance. Renders nothing unless the signature
 * backend AND OIDC client are configured (graceful degradation), so the
 * public no-backend deployment is unchanged.
 */
function LoginAffordance() {
  const { configured, isAuthenticated, displayName, login, logout } = useAuth()

  if (!configured) return null

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 max-w-[10rem] truncate text-sm text-text-muted" title={displayName}>
          <PiUserCircle className="shrink-0" />
          <span className="truncate">{displayName}</span>
        </span>
        <button
          onClick={logout}
          className={iconBtnClass}
          aria-label="Abmelden"
          title="Abmelden"
        >
          <PiSignOut />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={login}
      className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-95"
      title="Anmelden"
    >
      <PiSignIn />
      Anmelden
    </button>
  )
}

export default function Header(props: HeaderProps) {
  const navigate = useNavigate()

  if (props.mode === 'overview') {
    return (
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold text-text">UAV Einsatzverwaltung</h1>
        <div className="flex items-center gap-2">
          <LoginAffordance />
          <button
            onClick={props.onCycleTheme}
            className={iconBtnClass}
            aria-label={themeLabel[props.themeSetting]}
            title={themeLabel[props.themeSetting]}
          >
            {themeIcon[props.themeSetting]}
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate('/')}
          className={iconBtnClass}
          aria-label="Zurück zur Übersicht"
          title="Zurück zur Übersicht"
        >
          <PiArrowLeft />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-text truncate">{props.missionLabel}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {props.onExportPdf && (
          <button
            onClick={props.onExportPdf}
            className={iconBtnClass}
            aria-label="PDF herunterladen"
            title="PDF herunterladen"
          >
            <PiFilePdf />
          </button>
        )}
        {props.onSharePdf && (
          <button
            onClick={props.onSharePdf}
            className={iconBtnClass}
            aria-label="PDF teilen"
            title="PDF teilen"
          >
            <PiShareNetwork />
          </button>
        )}
        <button
          onClick={props.onCycleTheme}
          className={iconBtnClass}
          aria-label={themeLabel[props.themeSetting]}
          title={themeLabel[props.themeSetting]}
        >
          {themeIcon[props.themeSetting]}
        </button>
        {props.onRefresh && (
          <button
            onClick={props.onRefresh}
            className={iconBtnClass}
            aria-label="Aktualisieren"
          >
            <PiArrowsClockwise />
          </button>
        )}
      </div>
    </header>
  )
}
