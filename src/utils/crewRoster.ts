const KEY = 'uav-crew-roster'
const MAX = 30

interface StoredRoster {
  names: string[]
}

function persist(names: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ names } satisfies StoredRoster))
  } catch {
    // Quota exceeded or storage unavailable — roster is a convenience, ignore
  }
}

export function loadCrewRoster(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredRoster>
    if (!Array.isArray(parsed.names)) return []
    return parsed.names.filter((n): n is string => typeof n === 'string' && n.trim() !== '')
  } catch {
    return []
  }
}

export function addToCrewRoster(name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return loadCrewRoster()
  const lower = trimmed.toLowerCase()
  const rest = loadCrewRoster().filter((n) => n.toLowerCase() !== lower)
  const next = [trimmed, ...rest].slice(0, MAX)
  persist(next)
  return next
}

export function removeFromCrewRoster(name: string): string[] {
  const lower = name.trim().toLowerCase()
  const next = loadCrewRoster().filter((n) => n.toLowerCase() !== lower)
  persist(next)
  return next
}
