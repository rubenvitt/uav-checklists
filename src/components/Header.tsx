import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { PiMonitor, PiSun, PiMoon, PiArrowsClockwise, PiFilePdf, PiArrowLeft } from 'react-icons/pi'
import type { ThemeSetting } from '../hooks/useTheme'

interface OverviewHeaderProps {
  mode: 'overview'
  themeSetting: ThemeSetting
  onCycleTheme: () => void
  onRefresh?: undefined
  onExportPdf?: undefined
  missionLabel?: undefined
}

interface MissionHeaderProps {
  mode: 'mission'
  missionLabel: string
  themeSetting: ThemeSetting
  onCycleTheme: () => void
  onRefresh?: () => void
  onExportPdf?: () => void
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

export default function Header(props: HeaderProps) {
  const navigate = useNavigate()

  if (props.mode === 'overview') {
    return (
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold text-text">UAV Einsatzverwaltung</h1>
        <button
          onClick={props.onCycleTheme}
          className={iconBtnClass}
          aria-label={themeLabel[props.themeSetting]}
          title={themeLabel[props.themeSetting]}
        >
          {themeIcon[props.themeSetting]}
        </button>
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
            aria-label="Als PDF exportieren"
            title="Als PDF exportieren"
          >
            <PiFilePdf />
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
