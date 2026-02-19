import { PiCheckCircle } from 'react-icons/pi'

export default function NachbereitungPhase() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-surface py-16 text-center">
      <PiCheckCircle className="text-4xl text-text-muted" />
      <div>
        <p className="text-sm font-medium text-text">Nachbereitung</p>
        <p className="mt-1 text-xs text-text-muted">
          Hier wird zukünftig die Nachbereitung des Einsatzes dokumentiert.
        </p>
      </div>
    </div>
  )
}
