import { PiCamera, PiThermometerSimple, PiFlashlight, PiCheck, PiWarning } from 'react-icons/pi'
import type { DroneSpec } from '../types/drone'
import type { PayloadId, PayloadType } from '../types/payload'
import {
  getPayloadsForDrone,
  togglePayload,
  computeWeightSummary,
  formatWeight,
  PAYLOAD_TYPE_LABELS,
} from '../data/payloads'

const TYPE_ICONS: Record<PayloadType, React.ReactNode> = {
  kamera: <PiCamera />,
  thermal: <PiThermometerSimple />,
  scheinwerfer: <PiFlashlight />,
}

interface PayloadSelectorProps {
  drone: DroneSpec
  value: PayloadId[]
  onChange: (ids: PayloadId[]) => void
  label?: string
  size?: 'normal' | 'compact'
}

export default function PayloadSelector({ drone, value, onChange, label = 'Nutzlast (Payload)', size = 'normal' }: PayloadSelectorProps) {
  const options = getPayloadsForDrone(drone.id)
  const slotsFull = drone.payloadSlots > 1 && value.length >= drone.payloadSlots
  const isCompact = size === 'compact'

  return (
    <div className={isCompact ? '' : 'px-4 py-3'}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-text-muted`}>{label}</p>
        <p className="text-[10px] text-text-muted/70">
          {drone.payloadSlots === 1
            ? '1 Slot – genau eine Nutzlast'
            : `${value.length}/${drone.payloadSlots} Slots belegt`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((p) => {
          const selected = value.includes(p.id)
          const disabled = !selected && slotsFull
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(togglePayload(drone, value, p.id))}
              disabled={disabled}
              aria-pressed={selected}
              title={disabled ? 'Alle Gimbal-Slots belegt' : `${PAYLOAD_TYPE_LABELS[p.type]}: ${p.description}`}
              className={`flex items-center gap-1.5 rounded-lg ${isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} font-medium transition-colors ${
                selected
                  ? 'bg-text text-base'
                  : disabled
                    ? 'cursor-not-allowed bg-surface-alt text-text-muted/40'
                    : 'bg-surface-alt text-text-muted hover:text-text'
              }`}
            >
              <span className="text-[0.9em]">{selected ? <PiCheck /> : TYPE_ICONS[p.type]}</span>
              {p.name}
              <span className={`font-normal ${selected ? 'opacity-70' : 'opacity-60'}`}>{formatWeight(p.weight)}</span>
            </button>
          )
        })}
      </div>
      <WeightSummaryLine drone={drone} value={value} compact={isCompact} />
    </div>
  )
}

export function WeightSummaryLine({ drone, value, compact }: { drone: DroneSpec; value: PayloadId[]; compact?: boolean }) {
  const w = computeWeightSummary(drone, value)
  return (
    <div className={`mt-2 space-y-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <p className="text-text-muted">
        Leergewicht {formatWeight(w.emptyWeight)} + Nutzlast{' '}
        <span className={w.overweight ? 'font-medium text-warning' : ''}>
          {formatWeight(w.payloadWeight)}
        </span>{' '}
        <span className="text-text-muted/60">(max. {formatWeight(w.maxPayload)})</span>
        {' = '}
        <span className="font-semibold text-text">{formatWeight(w.totalWeight)}</span>
      </p>
      {w.overweight && (
        <p className="flex items-center gap-1 font-medium text-warning">
          <PiWarning className="shrink-0" />
          Max. Nutzlast um {formatWeight(w.payloadWeight - w.maxPayload)} überschritten
        </p>
      )}
    </div>
  )
}
