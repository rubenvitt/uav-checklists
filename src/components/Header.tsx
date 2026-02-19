import type { ReactNode } from 'react'
import { PiMonitor, PiSun, PiMoon, PiArrowsClockwise, PiFilePdf } from 'react-icons/pi'
import type { ThemeSetting } from '../hooks/useTheme'

interface HeaderProps {
  onRefresh: () => void
  lastUpdated: Date | null
  themeSetting: ThemeSetting
  onCycleTheme: () => void
  onExportPdf: () => void
}

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

export default function Header({ onRefresh, lastUpdated, themeSetting, onCycleTheme, onExportPdf }: HeaderProps) {
  const timeString = lastUpdated
    ? lastUpdated.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header className="flex items-center justify-between py-4">
      <div>
        <h1 className="text-2xl font-bold text-text">UAV Vorflugkontrolle</h1>
        {timeString && (
          <p className="text-xs text-text-muted mt-1">
            Zuletzt aktualisiert: {timeString}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onExportPdf}
          className="rounded-lg bg-surface p-2.5 text-lg text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-95"
          aria-label="Als PDF exportieren"
          title="Als PDF exportieren"
        >
          <PiFilePdf />
        </button>
        <button
          onClick={onCycleTheme}
          className="rounded-lg bg-surface p-2.5 text-lg text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-95"
          aria-label={themeLabel[themeSetting]}
          title={themeLabel[themeSetting]}
        >
          {themeIcon[themeSetting]}
        </button>
        <button
          onClick={onRefresh}
          className="rounded-lg bg-surface p-2.5 text-lg text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-95"
          aria-label="Aktualisieren"
        >
          <PiArrowsClockwise />
        </button>
      </div>
    </header>
  )
}
