import { PiPolygon, PiMapPin, PiTrash } from 'react-icons/pi'
import type { ShapeType } from '../../types/mapData'
import { SHAPE_LABELS, SHAPE_COLORS } from '../../types/mapData'

interface MapToolbarProps {
  activeShape: ShapeType | null
  onSelectShape: (shape: ShapeType | null) => void
  onClear: () => void
  featureCount: number
}

const SHAPES: { type: ShapeType; icon: React.ReactNode }[] = [
  { type: 'einsatzgebiet', icon: <PiPolygon /> },
  { type: 'standort', icon: <PiMapPin /> },
]

export default function MapToolbar({ activeShape, onSelectShape, onClear, featureCount }: MapToolbarProps) {
  return (
    <div className="map-toolbar absolute right-2 top-2 z-[1000] flex flex-col gap-1">
      {SHAPES.map(({ type, icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelectShape(activeShape === type ? null : type)}
          title={SHAPE_LABELS[type]}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-sm shadow-md transition-colors hover:bg-surface-alt"
          style={activeShape === type ? { backgroundColor: SHAPE_COLORS[type], color: '#fff' } : undefined}
        >
          {icon}
        </button>
      ))}
      {featureCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          title="Alle löschen"
          className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-sm text-warning shadow-md transition-colors hover:bg-warning-bg"
        >
          <PiTrash />
        </button>
      )}
    </div>
  )
}
