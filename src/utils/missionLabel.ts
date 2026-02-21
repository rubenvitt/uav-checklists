const ANLASS_LABELS: Record<string, string> = {
  einsatz: 'Einsatz',
  uebung: 'Übung',
  ausbildung: 'Ausbildung',
  testflug: 'Testflug',
}

const TEMPLATE_LABELS: Record<string, string> = {
  personensuche: 'Personensuche',
  erkundung: 'Erkundung',
  transport: 'Transport',
  ueberwachung: 'Überwachung',
}

export function buildMissionLabel(opts: {
  anlass: string
  stichwort: string
  template: string
  location: string
  flightCount: number
  createdAt: number
}): string {
  const parts: string[] = []
  parts.push(ANLASS_LABELS[opts.anlass] ?? 'Einsatz')

  if (opts.stichwort) {
    parts.push(opts.stichwort)
  } else if (opts.template && opts.template !== 'custom' && TEMPLATE_LABELS[opts.template]) {
    parts.push(TEMPLATE_LABELS[opts.template])
  }

  if (opts.location) {
    parts.push(opts.location)
  }

  // Fallback: show date+time when no descriptive data is available yet
  if (parts.length === 1) {
    const date = new Date(opts.createdAt)
    const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
    const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    parts.push(`${dateStr} ${timeStr}`)
  }

  if (opts.flightCount > 0) {
    parts.push(`${opts.flightCount} ${opts.flightCount === 1 ? 'Flug' : 'Flüge'}`)
  }

  return parts.join(' \u00b7 ')
}

export function readManualLocationName(missionId: string): string {
  try {
    const raw = localStorage.getItem(`uav-manual-location:${missionId}`)
    if (raw) {
      const loc = JSON.parse(raw)
      if (loc.name) {
        return loc.name.split(',')[0].trim()
      }
    }
  } catch { /* ignore */ }
  return ''
}
