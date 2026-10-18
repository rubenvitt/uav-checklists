import { PiWifiSlash } from 'react-icons/pi'

/** Dezente Zeile bei verknüpftem Einsatz und Netzfehler zu Suchlage. */
export default function SuchlageStatusLine({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p role="status" className="eyebrow flex items-center gap-2 border border-caution/40 bg-caution-bg px-3 py-2 text-caution">
      <PiWifiSlash className="shrink-0 text-sm" aria-hidden="true" />
      Suchlage nicht erreichbar – Flugbuch funktioniert weiter
    </p>
  )
}
