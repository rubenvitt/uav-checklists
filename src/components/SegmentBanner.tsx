import { useState } from 'react'
import { PiCaretDown, PiCheck, PiAirplaneTakeoff, PiMapPinArea } from 'react-icons/pi'
import type { MissionSegment } from '../types/mission'

interface SegmentBannerProps {
  segments: MissionSegment[]
  activeSegment: MissionSegment | null
  /** Optional map of segmentId -> completed flight count */
  segmentFlightCounts?: Record<string, number>
  variant?: 'full' | 'compact'
  onRelocate?: () => void
}

export default function SegmentBanner({ segments, activeSegment, segmentFlightCounts, variant = 'full', onRelocate }: SegmentBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (segments.length <= 1) return null

  const completedSegments = segments.filter(s => s.status === 'completed')
  const activeIndex = segments.findIndex(s => s.id === activeSegment?.id) + 1

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-surface px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-caution-bg text-xs font-semibold text-caution">
          {activeIndex || segments.length}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">
          {activeSegment?.label ?? 'Standort'}
          {activeSegment?.locationName && (
            <span className="ml-1 font-normal text-text-muted">
              — {activeSegment.locationName}
            </span>
          )}
          <span className="ml-2 text-xs font-normal text-text-muted">
            Standort {activeIndex} von {segments.length}
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface">
      <div className="flex items-center">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 text-left"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-caution-bg text-xs font-semibold text-caution">
            {activeIndex || segments.length}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text">
              {activeSegment?.label ?? 'Standort'}
              {activeSegment?.locationName && (
                <span className="ml-1 font-normal text-text-muted">
                  — {activeSegment.locationName}
                </span>
              )}
            </p>
            <p className="text-xs text-text-muted">
              Standort {activeIndex} von {segments.length}
            </p>
          </div>
          <PiCaretDown className={`shrink-0 text-sm text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {onRelocate && (
          <button
            onClick={onRelocate}
            className="mr-3 flex shrink-0 items-center gap-1.5 rounded-lg bg-caution-bg px-3 py-1.5 text-xs font-medium text-caution transition-colors hover:bg-caution/20"
          >
            <PiMapPinArea className="text-sm" />
            Verlegen
          </button>
        )}
      </div>

      {expanded && completedSegments.length > 0 && (
        <div className="border-t border-surface-alt px-4 pb-3 pt-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Bisherige Standorte
          </p>
          <div className="space-y-1.5">
            {completedSegments.map((seg, i) => {
              const flightCount = segmentFlightCounts?.[seg.id]
              return (
                <div key={seg.id} className="flex items-center gap-2 text-xs text-text-muted">
                  <PiCheck className="shrink-0 text-good" />
                  <span className="font-medium">{i + 1}.</span>
                  <span>{seg.locationName || seg.label}</span>
                  {flightCount !== undefined && flightCount > 0 && (
                    <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-[10px] text-text-muted">
                      <PiAirplaneTakeoff className="text-xs" />
                      {flightCount} {flightCount === 1 ? 'Flug' : 'Flüge'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
