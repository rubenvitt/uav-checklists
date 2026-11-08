import { PiInfo } from 'react-icons/pi'
import type { SuchlageRemoteState } from '../../utils/suchlageStore'

const TEXT: Record<SuchlageRemoteState, string> = {
  closed: 'Der Einsatz ist in Suchlage abgeschlossen.',
  gone: 'Der Einsatz ist in Suchlage nicht mehr vorhanden.',
  released: 'Die Verknüpfung wurde in Suchlage gelöst.',
}

/** Hinweis, wenn der verknüpfte Einsatz in Suchlage endete; die Flugmappe arbeitet normal weiter. */
export default function SuchlageRemoteNotice({ state, context }: { state: SuchlageRemoteState | undefined; context: 'fluege' | 'karte' | 'einsatz' }) {
  if (!state) return null
  const follow = context === 'fluege'
    ? state === 'released'
      ? 'Bestätigte Flüge bleiben im Flugbuch. Neue Einträge gehen erst nach erneutem Verknüpfen (Einsatzdaten) an Suchlage.'
      : 'Bestätigte Flüge bleiben im Flugbuch, neue werden nicht mehr vorgeschlagen.'
    : context === 'karte'
      ? 'Die Karte zeigt den zuletzt geladenen Stand.'
      : state === 'released'
        ? 'Die Flugmappe arbeitet ohne Suchlage weiter. Erneut verknüpfen holt Wartendes nach.'
        : 'Die Flugmappe arbeitet ohne Suchlage weiter.'
  return (
    <div className="flex items-start gap-3 border border-line bg-surface px-4 py-3">
      <PiInfo className="mt-0.5 shrink-0 text-lg text-text-muted" />
      <p className="text-xs text-text-muted">
        <span className="font-medium text-text">{TEXT[state]}</span> {follow}
      </p>
    </div>
  )
}
