import { PiPolygon, PiMapPin, PiTrash, PiCheck, PiArrowCounterClockwise } from 'react-icons/pi'
import type { ShapeType } from '../../types/mapData'
import { SHAPE_LABELS, SHAPE_COLORS } from '../../types/mapData'

interface MapToolbarProps {
  activeShape: ShapeType | null
  onSelectShape: (shape: ShapeType | null) => void
  onClear: () => void
  featureCount: number
  /** Abschließen und Zurücknehmen der Fläche; ohne Tastatur (Telefon) der einzige Weg. `null`: keine Knöpfe. */
  onFinish: (() => void) | null
  canFinish: boolean
  onUndo: () => void
  canUndo: boolean
}

// Touch-Ziele ≥ 44 px (h-11/w-11), siehe CLAUDE.md.
const BUTTON = 'flex h-11 w-11 items-center justify-center border border-line-strong text-lg transition-colors'

const SHAPES: { type: ShapeType; icon: React.ReactNode }[] = [
  { type: 'einsatzgebiet', icon: <PiPolygon /> },
  { type: 'standort', icon: <PiMapPin /> },
]

export default function MapToolbar({ activeShape, onSelectShape, onClear, featureCount, onFinish, canFinish, onUndo, canUndo }: MapToolbarProps) {
  return (
    <div className="map-toolbar absolute right-2 top-2 z-[1000] flex flex-col gap-1">
      {SHAPES.map(({ type, icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelectShape(activeShape === type ? null : type)}
          title={SHAPE_LABELS[type]}
          className={`${BUTTON} bg-surface hover:bg-surface-alt`}
          style={activeShape === type ? { backgroundColor: SHAPE_COLORS[type], color: '#fff' } : undefined}
        >
          {icon}
        </button>
      ))}
      {onFinish && (
        <>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Letzten Punkt entfernen"
            className={`${BUTTON} bg-surface hover:bg-surface-alt disabled:opacity-40`}
          >
            <PiArrowCounterClockwise />
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={!canFinish}
            title="Fertig"
            className={`${BUTTON} bg-accent text-on-accent disabled:opacity-40`}
          >
            <PiCheck />
          </button>
        </>
      )}
      {featureCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          title="Alle löschen"
          className={`${BUTTON} mt-1 bg-surface text-warning hover:bg-warning-bg`}
        >
          <PiTrash />
        </button>
      )}
    </div>
  )
}
