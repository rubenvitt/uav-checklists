import type { MetricStatus } from '../types/assessment'
import type { FlightLogEntry } from '../types/flightLog'

export interface FollowupContext {
  postflightNotes: Record<string, string>
  weatherCurrent: { precipitation: number; temperature: number; humidity: number } | null
  humidityStatus: MetricStatus | null
  droneIpRating: string | null
  droneName: string
  flightEntries: FlightLogEntry[]
  disruptionCategories: string[]
  disruptionsNone: boolean
}

export interface FollowupSuggestion {
  id: string
  label: string
  source: { label: string; sourcePhase: string }
}

const POST_FLIGHT_LABELS: Record<string, string> = {
  motoren: 'Motoren',
  uav_beschaedigung: 'UAV-Zustand',
  ueberwarmung: 'Überwärmung',
  akkus: 'Akkus',
  rotoren: 'Rotoren',
  payload: 'Payload',
  fernbedienung: 'Fernbedienungen',
  kabel: 'Verbindungskabel',
}

export function computeFollowupSuggestions(ctx: FollowupContext): FollowupSuggestion[] {
  const suggestions: FollowupSuggestion[] = []

  // 1. Immer: Flugstunden aktualisieren
  suggestions.push({
    id: 'flugstunden',
    label: 'Flugstunden in UAV- und persönlichen Flugbüchern nachtragen',
    source: { label: 'Allgemein', sourcePhase: 'allgemein' },
  })

  // 2. Regen / hohe Feuchte
  const hasRain = (ctx.weatherCurrent?.precipitation ?? 0) > 0
  const highHumidity = ctx.humidityStatus === 'caution' || ctx.humidityStatus === 'warning'

  if (hasRain || highHumidity) {
    suggestions.push({
      id: 'trocknen',
      label: 'UAV und Payload trocknen',
      source: { label: hasRain ? 'Regenbetrieb erkannt' : 'Hohe Luftfeuchtigkeit', sourcePhase: 'Wetter' },
    })
    suggestions.push({
      id: 'kontakte_reinigen',
      label: 'Kontakte und Steckverbindungen reinigen',
      source: { label: hasRain ? 'Regenbetrieb erkannt' : 'Hohe Luftfeuchtigkeit', sourcePhase: 'Wetter' },
    })
  }

  // 3. Regen + kein IP-Schutz
  if (hasRain && !ctx.droneIpRating) {
    suggestions.push({
      id: 'reinigung_kein_ip',
      label: `Gründliche Reinigung — ${ctx.droneName} hat keinen IP-Schutz`,
      source: { label: 'Regen ohne IP-Schutz', sourcePhase: 'Wetter' },
    })
  }

  // 4. Kälte (<5°C)
  if (ctx.weatherCurrent && ctx.weatherCurrent.temperature < 5) {
    suggestions.push({
      id: 'akkus_kaelte',
      label: 'Akkus bei Raumtemperatur lagern und prüfen',
      source: { label: `${ctx.weatherCurrent.temperature}°C — Kältebetrieb`, sourcePhase: 'Wetter' },
    })
  }

  // 5. Störung Technik
  if (ctx.disruptionCategories.includes('technik')) {
    suggestions.push({
      id: 'technik_pruefung',
      label: 'Technische Prüfung durchführen',
      source: { label: 'Technische Störung gemeldet', sourcePhase: 'Störungen' },
    })
  }

  // 6. Störung Funk
  if (ctx.disruptionCategories.includes('funk')) {
    suggestions.push({
      id: 'funk_pruefung',
      label: 'Funkausrüstung prüfen',
      source: { label: 'Funkstörung gemeldet', sourcePhase: 'Störungen' },
    })
  }

  // 7. Störung GPS
  if (ctx.disruptionCategories.includes('gps')) {
    suggestions.push({
      id: 'gps_pruefung',
      label: 'GPS-Module prüfen',
      source: { label: 'GPS-Störung gemeldet', sourcePhase: 'Störungen' },
    })
  }

  // 8. >3 Flüge
  if (ctx.flightEntries.length > 3) {
    suggestions.push({
      id: 'rotoren_verschleiss',
      label: 'Rotoren auf Verschleiß prüfen',
      source: { label: `${ctx.flightEntries.length} Flüge durchgeführt`, sourcePhase: 'Flugtagebuch' },
    })
  }

  // 9. Auffällige Landungen
  const abnormalLandings = ctx.flightEntries.filter(e => e.landungStatus !== 'ok')
  if (abnormalLandings.length > 0) {
    suggestions.push({
      id: 'beschaedigung_check',
      label: 'UAV auf Beschädigungen untersuchen',
      source: {
        label: `${abnormalLandings.length} auffällige ${abnormalLandings.length === 1 ? 'Landung' : 'Landungen'}`,
        sourcePhase: 'Flugtagebuch',
      },
    })
  }

  // 10. Nachflugkontrolle-Notizen
  for (const [key, note] of Object.entries(ctx.postflightNotes)) {
    if (note.trim()) {
      const itemLabel = POST_FLIGHT_LABELS[key] || key
      suggestions.push({
        id: `postflight_${key}`,
        label: `${itemLabel}: "${note.trim()}" — nachverfolgen`,
        source: { label: `Notiz bei ${itemLabel}`, sourcePhase: 'Nachflugkontrolle' },
      })
    }
  }

  return suggestions
}
