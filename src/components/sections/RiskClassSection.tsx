import { useState, useCallback, useEffect, useId } from 'react'
import { PiScales } from 'react-icons/pi'
import type { MetricStatus } from '../../types/assessment'
import { useMissionId } from '../../context/useMissionId'
import { useSegmentId } from '../../context/useSegmentId'
import { clearMissionFormStorageByPrefix } from '../../hooks/useMissionPersistedState'
import { useSegmentPersistedState } from '../../hooks/useSegmentPersistedState'
import type { SoraAnnexId } from '../../types/sora'
import ChecklistSection from '../ChecklistSection'
import GrcDetermination from '../GrcDetermination'
import ArcDetermination, { type ArcClass } from '../ArcDetermination'
import SailDetermination from '../SailDetermination'
import SoraAnnexes, { SoraAnnexLink } from '../SoraAnnexes'
import { soraAnnexElementId } from '../../data/sora'

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
  const segmentId = useSegmentId()
  const [finalGrc, setFinalGrc] = useState<number | null>(null)
  const [arcClass, setArcClass] = useState<ArcClass | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [openAnnex, setOpenAnnex] = useState<SoraAnnexId | null>(null)
  const [flightType] = useSegmentPersistedState<'vlos' | 'bvlos' | null>('grc:flightType', null)
  const annexIdPrefix = useId()

  const handleGrcChange = useCallback((grc: number | null) => setFinalGrc(grc), [])
  const handleArcChange = useCallback((arc: ArcClass | null) => setArcClass(arc), [])

  const handleReset = () => {
    const prefix = segmentId ? `seg:${segmentId}:` : ''
    clearMissionFormStorageByPrefix(`${prefix}grc:`, missionId)
    clearMissionFormStorageByPrefix(`${prefix}arc:`, missionId)
    setResetKey((k) => k + 1)
    setFinalGrc(null)
    setArcClass(null)
  }

  const toggleAnnex = (annex: SoraAnnexId) => setOpenAnnex((current) => (current === annex ? null : annex))

  const showAnnex = (annex: SoraAnnexId) => {
    setOpenAnnex(annex)
    requestAnimationFrame(() => {
      document.getElementById(soraAnnexElementId(annexIdPrefix, annex))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-sm font-semibold text-text">Ground Risk Class (GRC)</h3>
            <SoraAnnexLink annex="bodenrisiko" onOpen={showAnnex} />
          </div>
          <GrcDetermination key={`grc-${resetKey}`} onGrcChange={handleGrcChange} />
        </div>

        {/* ARC */}
        <div className="border-t border-surface-alt pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-sm font-semibold text-text">Air Risk Class (ARC)</h3>
            <div className="flex flex-wrap gap-1">
              <SoraAnnexLink annex="luftrisiko" onOpen={showAnnex} />
              <SoraAnnexLink annex="tmpr" onOpen={showAnnex} />
            </div>
          </div>
          <ArcDetermination key={`arc-${resetKey}`} onArcChange={handleArcChange} />
        </div>

        {/* SAIL */}
        <div className="border-t border-surface-alt pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-sm font-semibold text-text">SAIL-Bestimmung</h3>
            <div className="flex flex-wrap gap-1">
              <SoraAnnexLink annex="oso" onOpen={showAnnex} />
              <SoraAnnexLink annex="pdra" onOpen={showAnnex} />
            </div>
          </div>
          <SailDetermination grc={finalGrc} arc={arcClass} />
        </div>

        {/* SORA-Anhänge */}
        <div className="border-t border-surface-alt pt-4">
          <h3 className="mb-3 text-sm font-semibold text-text">SORA-Anhänge</h3>
          <SoraAnnexes
            idPrefix={annexIdPrefix}
            openAnnex={openAnnex}
            onToggle={toggleAnnex}
            sail={sail}
            arc={arcClass}
            flightType={flightType}
          />
        </div>
      </div>
    </ChecklistSection>
  )
}
