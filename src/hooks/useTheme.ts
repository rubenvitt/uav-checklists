import { useState, useEffect } from 'react'

export type ThemeSetting = 'light' | 'dark' | 'system'

interface SunTimes {
  sunrise: string // "HH:MM"
  sunset: string  // "HH:MM"
}

function isNight(sun: SunTimes | null): boolean | null {
  if (!sun) return null
  const now = new Date()
  const hhmm = now.getHours() * 60 + now.getMinutes()
  const [rH, rM] = sun.sunrise.split(':').map(Number)
  const [sH, sM] = sun.sunset.split(':').map(Number)
  return hhmm < rH * 60 + rM || hhmm >= sH * 60 + sM
}

function getAutoTheme(sun: SunTimes | null): 'light' | 'dark' {
  const night = isNight(sun)
  if (night !== null) return night ? 'dark' : 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    resolved === 'dark' ? '#0f172a' : '#f8fafc',
  )
}

export function useTheme(sun: SunTimes | null = null) {
  const [setting, setSetting] = useState<ThemeSetting>(() => {
    const stored = localStorage.getItem('theme') as ThemeSetting | null
    return stored ?? 'system'
  })

  const resolved = setting === 'system' ? getAutoTheme(sun) : setting

  useEffect(() => {
    apply(resolved)
    if (setting === 'system') {
      localStorage.removeItem('theme')
    } else {
      localStorage.setItem('theme', setting)
    }
  }, [setting, resolved])

  // Re-check every minute when in system mode (for sunrise/sunset transitions)
  useEffect(() => {
    if (setting !== 'system' || !sun) return
    const id = setInterval(() => apply(getAutoTheme(sun)), 60_000)
    return () => clearInterval(id)
  }, [setting, sun])

  // Also listen to OS preference changes as fallback
  useEffect(() => {
    if (setting !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => apply(getAutoTheme(sun))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setting, sun])

  const cycle = () =>
    setSetting(s => {
      if (s === 'system') return 'light'
      if (s === 'light') return 'dark'
      return 'system'
    })

  return { setting, resolved, cycle }
}
