import { PiInfo, PiX } from 'react-icons/pi'

export interface LogbookNoticeItem {
  key: string
  text: string
}

/** Hinweise zum Flugbuch bei verknüpftem Einsatz (z. B. Flug von einem anderen Trupp bestätigt), wegtippbar. */
export default function SuchlageLogbookNotices({ notices, onDismiss }: { notices: LogbookNoticeItem[]; onDismiss: (key: string) => void }) {
  if (notices.length === 0) return null
  return (
    <div className="space-y-2" role="status">
      {notices.map((n) => (
        <div key={n.key} className="flex items-start gap-3 border border-caution/40 bg-caution-bg py-1 pl-4">
          <PiInfo className="mt-2.5 shrink-0 text-lg text-caution" aria-hidden="true" />
          <p className="flex-1 py-2 text-xs text-caution">{n.text}</p>
          <button
            type="button"
            onClick={() => onDismiss(n.key)}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-caution"
            aria-label="Hinweis schließen"
          >
            <PiX />
          </button>
        </div>
      ))}
    </div>
  )
}
