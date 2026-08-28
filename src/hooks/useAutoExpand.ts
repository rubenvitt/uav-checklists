import { useState, useEffect, useRef } from 'react'
import { useMissionPersistedState } from './useMissionPersistedState'

export interface SectionConfig {
  id: string
  locked?: boolean
  isComplete: boolean
  hasWarning?: boolean
  firstVisitOpen?: boolean
}

/**
 * Compute the initial open state once on mount based on rules:
 * - Locked → closed
 * - Warning → open (max 1)
 * - First incomplete → open
 * - First-visit defaults → open
 * - Everything else → closed
 */
function computeInitialState(
  sections: SectionConfig[],
  isFirstVisit: boolean,
): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  let warningOpened = false
  let firstIncompleteOpened = false

  for (const section of sections) {
    if (section.locked) {
      result[section.id] = false
      continue
    }
    if (section.hasWarning && !warningOpened) {
      result[section.id] = true
      warningOpened = true
      continue
    }
    if (!section.isComplete && !firstIncompleteOpened) {
      result[section.id] = true
      firstIncompleteOpened = true
      continue
    }
    if (isFirstVisit && section.firstVisitOpen) {
      result[section.id] = true
      continue
    }
    result[section.id] = false
  }

  return result
}

/**
 * Close locked sections and register unknown section IDs (closed).
 * Returns `prev` unchanged if nothing needed adjusting.
 */
function reconcileOpenState(
  prev: Record<string, boolean>,
  sections: SectionConfig[],
): Record<string, boolean> {
  let changed = false
  const next = { ...prev }
  for (const s of sections) {
    if (s.locked && next[s.id]) {
      next[s.id] = false
      changed = true
    }
    if (!(s.id in next)) {
      next[s.id] = false
      changed = true
    }
  }
  return changed ? next : prev
}

export function useAutoExpand(sections: SectionConfig[], phaseKey: string): {
  openState: Record<string, boolean>
  toggle: (sectionId: string) => void
  continueToNext: (sectionId: string) => void
  isComplete: Record<string, boolean>
  allSectionsComplete: boolean
} {
  const [visited, setVisited] = useMissionPersistedState<boolean>(`autoexpand:visited:${phaseKey}`, false)
  const isFirstVisit = !visited
  // Latest sections for continueToNext — synced after commit, read only in the handler
  const sectionsRef = useRef(sections)
  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  // openState is real state — sections only close via explicit user action
  const [openState, setOpenState] = useState<Record<string, boolean>>(() =>
    computeInitialState(sections, isFirstVisit),
  )

  // Keep locked sections closed & init new section IDs.
  // Adjust state during render when `sections` changes (instead of a setState-in-effect),
  // so the corrected state is available in the same render pass.
  const [prevSections, setPrevSections] = useState(sections)
  if (sections !== prevSections) {
    setPrevSections(sections)
    const next = reconcileOpenState(openState, sections)
    if (next !== openState) setOpenState(next)
  }

  // Mark as visited on mount
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      if (!visited) setVisited(true)
    }
  }, [visited, setVisited])

  const toggle = (sectionId: string) => {
    setOpenState(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  // Close current section, open the next one in order
  const continueToNext = (sectionId: string) => {
    setOpenState(prev => {
      const next = { ...prev, [sectionId]: false }
      const current = sectionsRef.current
      const idx = current.findIndex(s => s.id === sectionId)

      for (let i = idx + 1; i < current.length; i++) {
        if (!current[i].locked) {
          next[current[i].id] = true
          break
        }
      }

      return next
    })
  }

  const isComplete: Record<string, boolean> = {}
  let allSectionsComplete = true
  for (const s of sections) {
    isComplete[s.id] = s.isComplete
    if (!s.isComplete && !s.locked) allSectionsComplete = false
  }

  return { openState, toggle, continueToNext, isComplete, allSectionsComplete }
}
