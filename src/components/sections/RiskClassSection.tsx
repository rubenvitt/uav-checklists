import { useState, useCallback, useEffect } from 'react'
import { PiScales } from 'react-icons/pi'
import type { MetricStatus } from '../../types/assessment'
import { useMissionId } from '../../context/MissionContext'
import { clearMissionFormStorageByPrefix } from '../../hooks/useMissionPersistedState'
import ChecklistSection from '../ChecklistSection'
import GrcDetermination from '../GrcDetermination'
import ArcDetermination, { type ArcClass } from '../ArcDetermination'
import SailDetermination from '../SailDetermination'

function computeSail(grc: number, arc: ArcClass): number {
  const isArcA = arc === 'a'
  if (grc < 3) return isArcA ? 1 : 2
  if (grc === 3) return 2
  if (grc === 4) return 3
  return 4
}

function getSailBadge(sail: number): { label: string; status: MetricStatus } {
  const labels = ['SAIL I', 'SAIL II', 'SAIL III', 'SAIL IV']
  const statuses: MetricStatus[] = ['good', 'caution', 'warning', 'warning']
  return { label: labels[sail - 1], status: statuses[sail - 1] }
}

interface RiskClassSectionProps {
  locked?: boolean
  onSoraChange?: (data: { grc: number | null; arc: ArcClass | null; sail: number | null }) => void
  open?: boolean
  onToggle?: () => void
  isComplete?: boolean
  onContinue?: () => void
  continueLabel?: string
  isPhaseComplete?: boolean
}

export default function RiskClassSection({ locked, onSoraChange, open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: RiskClassSectionProps) {
  const missionId = useMissionId()
  const [finalGrc, setFinalGrc] = useState<number | null>(null)
  const [arcClass, setArcClass] = useState<ArcClass | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const handleGrcChange = useCallback((grc: number | null) => setFinalGrc(grc), [])
  const handleArcChange = useCallback((arc: ArcClass | null) => setArcClass(arc), [])

  const handleReset = () => {
    clearMissionFormStorageByPrefix('grc:', missionId)
    clearMissionFormStorageByPrefix('arc:', missionId)
    setResetKey((k) => k + 1)
    setFinalGrc(null)
    setArcClass(null)
  }

  const sail =
    finalGrc !== null && arcClass !== null ? computeSail(finalGrc, arcClass) : null
  const badge = sail !== null ? getSailBadge(sail) : undefined

  useEffect(() => {
    onSoraChange?.({ grc: finalGrc, arc: arcClass, sail })
  }, [finalGrc, arcClass, sail, onSoraChange])

  return (
    <ChecklistSection title="SORA Risikoklassifizierung" icon={<PiScales />} badge={badge} locked={locked} open={open} onToggle={onToggle} isComplete={isComplete} onContinue={onContinue} continueLabel={continueLabel} isPhaseComplete={isPhaseComplete}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            Zurücksetzen
          </button>
        </div>

        {/* GRC */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">Ground Risk Class (GRC)</h3>
          <GrcDetermination key={`grc-${resetKey}`} onGrcChange={handleGrcChange} />
        </div>

        {/* ARC */}
        <div className="border-t border-surface-alt pt-4">
          <h3 className="mb-3 text-sm font-semibold text-text">Air Risk Class (ARC)</h3>
          <ArcDetermination key={`arc-${resetKey}`} onArcChange={handleArcChange} />
        </div>

        {/* SAIL */}
        <div className="border-t border-surface-alt pt-4">
          <h3 className="mb-3 text-sm font-semibold text-text">SAIL-Bestimmung</h3>
          <SailDetermination grc={finalGrc} arc={arcClass} />
        </div>
      </div>
    </ChecklistSection>
  )
}
