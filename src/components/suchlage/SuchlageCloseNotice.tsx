import { PiInfo } from 'react-icons/pi'
import { openPeers, type SuchlageLink } from '../../utils/suchlageStore'

function names(link: SuchlageLink): string {
  return openPeers(link).map((p) => p.aircraftLabel).join(', ')
}

/**
 * Hinweis zum Abschluss bei mehreren Flugmappen am selben Suchlage-Einsatz:
 * Der Abschluss meldet nur den Teil dieser Flugmappe als fertig. Bleibt der
 * Suchlage-Einsatz offen, weil andere Trupps noch arbeiten, ist das kein Fehler.
 */
export default function SuchlageCloseNotice({ link, when }: { link: SuchlageLink | null; when: 'before' | 'after' }) {
  if (!link || link.remoteState) return null
  const others = names(link)
  let text: string | null = null
  if (when === 'before' && others) {
    text = `In Suchlage arbeiten an diesem Einsatz noch andere Flugmappen (${others}). Der Abschluss meldet nur den Teil dieser Flugmappe als fertig; der Suchlage-Einsatz bleibt offen, bis alle fertig sind.`
  } else if (when === 'after' && link.doneAt !== undefined) {
    text = others
      ? `In Suchlage ist der Teil dieser Flugmappe abgeschlossen. Der Suchlage-Einsatz bleibt offen, weil noch andere Trupps arbeiten (${others}).`
      : 'In Suchlage ist der Teil dieser Flugmappe abgeschlossen. Der Suchlage-Einsatz bleibt offen, bis er dort geschlossen wird.'
  }
  if (!text) return null
  return (
    <div role="status" className="flex items-start gap-3 border border-line bg-surface px-4 py-3">
      <PiInfo className="mt-0.5 shrink-0 text-lg text-text-muted" aria-hidden="true" />
      <p className="text-xs text-text-muted">{text}</p>
    </div>
  )
}
