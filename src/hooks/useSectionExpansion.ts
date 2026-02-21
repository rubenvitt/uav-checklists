import { useState, useEffect, useRef } from 'react'
import { useMissionPersistedState } from './useMissionPersistedState'
import type { MetricStatus } from '../types/assessment'

interface SectionExpansionOptions {
  defaultOpen?: boolean
  badge?: { status: MetricStatus }
  locked?: boolean
}

/**
 * Manages section expansion state with persistence and smart behavior.
 *
 * Rules (priority order):
 * 1. Locked sections are always closed
 * 2. Persisted user override (from manual toggle) takes priority
 * 3. Auto-expand when badge changes to 'warning' (reactive)
 * 4. Falls back to defaultOpen prop
 *
 * When sectionId is provided, state is persisted per mission in localStorage.
 * When sectionId is undefined, falls back to local React state (backward compat).
 */
export function useSectionExpansion(
  sectionId: string | undefined,
  { defaultOpen = false, badge, locked = false }: SectionExpansionOptions,
): { isOpen: boolean; toggle: () => void } {
  // Persisted state — always called (React hook rules) but only used when sectionId provided.
  // null = no user override → use defaultOpen
  const [persistedState, setPersistedState] = useMissionPersistedState<boolean | null>(
    sectionId ? `section:${sectionId}` : '__section_noop',
    null,
  )

  // Local state fallback for sections without sectionId
  const [localOpen, setLocalOpen] = useState(defaultOpen)

  // Track previous badge status for reactive auto-expand
  const prevBadgeRef = useRef<MetricStatus | undefined>(badge?.status)

  // Auto-expand when badge changes TO 'warning' (from a non-warning state)
  useEffect(() => {
    const prev = prevBadgeRef.current
    const curr = badge?.status
    prevBadgeRef.current = curr

    if (sectionId && curr === 'warning' && prev !== undefined && prev !== 'warning') {
      setPersistedState(true)
    }
  }, [badge?.status, sectionId, setPersistedState])

  // Compute current open state
  let isOpen: boolean
  if (locked) {
    isOpen = false
  } else if (sectionId) {
    // Persisted mode: user override → defaultOpen fallback
    isOpen = persistedState ?? defaultOpen
  } else {
    // Local mode: simple toggle state
    isOpen = localOpen
  }

  // Toggle uses functional update to read current state without stale closures.
  // React Compiler handles memoization, so no manual useCallback needed.
  const toggle = () => {
    if (locked) return
    if (sectionId) {
      // Functional update reads current persisted value; defaultOpen is stable
      // per render and captured correctly by the React Compiler.
      setPersistedState((prev: boolean | null) => !(prev ?? defaultOpen))
    } else {
      setLocalOpen((o) => !o)
    }
  }

  return { isOpen, toggle }
}
