import { useState } from 'react'
import { useStore } from '@tanstack/react-store'
import { PiWrench, PiX, PiPlus, PiArrowCounterClockwise } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { useMissionId } from '../../context/MissionContext'
import { getMissionAtom } from '../../stores/missionFormStore'
import { readStorage } from '../../hooks/usePersistedState'
import { getSegments } from '../../utils/missionStorage'
import { computeFollowupSuggestions, type FollowupContext, type FollowupSuggestion } from '../../utils/followupSuggestions'
import { computeAssessment } from '../../utils/assessment'
import { getDroneById } from '../../data/drones'
import type { DroneId } from '../../types/drone'
import type { FlightLogEntry } from '../../types/flightLog'
import type { MetricStatus, MetricAssessment } from '../../types/assessment'
import type { WeatherResponse } from '../../types/weather'
import ChecklistSection from '../ChecklistSection'

/* ── Custom item type ────────────────────────────────────── */

interface CustomItem {
  id: string
  label: string
  isCustom: true
}

/* ── Hook: build followup context from mission data ──────── */

/** Read a segment-scoped field with legacy fallback for the first segment */
function readSegmentField<T>(missionId: string, segmentId: string | null, key: string, fallback: T, legacyFallback: boolean): T {
  if (segmentId) {
    const segValue = readStorage<T>(`seg:${segmentId}:${key}`, undefined as unknown as T, missionId)
    if (segValue !== undefined) return segValue
    if (!legacyFallback) return fallback
  }
  return readStorage<T>(key, fallback, missionId)
}

function useFollowupContext(): FollowupContext {
  const missionId = useMissionId()
  const atom = getMissionAtom(missionId)

  // Reactive subscriptions for keys that change during Nachbereitung
  const postflightNotes = useStore(atom, (s: Record<string, unknown>) => (s['postflight:notes'] ?? {}) as Record<string, string>)
  const disruptionCategories = useStore(atom, (s: Record<string, unknown>) => (s['disruptions:categories'] ?? []) as string[])
  const disruptionsNone = useStore(atom, (s: Record<string, unknown>) => (s['disruptions:none'] ?? false) as boolean)

  // Stable from earlier phases — one-time read is fine
  const flightEntries = readStorage<FlightLogEntry[]>('flightlog:entries', [], missionId)
  const selectedDrone = readStorage<DroneId>('selectedDrone', 'matrice-350-rtk', missionId)
  const maxAltitude = readStorage<number>('maxAltitude', 120, missionId)
  const drone = getDroneById(selectedDrone)
  const persistedKIndex = readStorage<{ kIndex: number } | null>('env:kindex', null, missionId)

  // Read weather data across ALL segments — use worst-case values
  let weatherCurrent: FollowupContext['weatherCurrent'] = null
  let humidityStatus: MetricStatus | null = null

  const segments = getSegments(missionId)
  const segmentIds = segments.length > 0 ? segments.map(s => s.id) : [null]

  for (let i = 0; i < segmentIds.length; i++) {
    const segId = segmentIds[i]
    const isFirst = i === 0
    const weather = readSegmentField<WeatherResponse | null>(missionId, segId, 'env:weather', null, isFirst)

    if (weather?.current) {
      // Use worst-case: highest precipitation, lowest temperature, highest humidity
      if (!weatherCurrent) {
        weatherCurrent = {
          precipitation: weather.current.precipitation,
          temperature: weather.current.temperature,
          humidity: weather.current.humidity,
        }
      } else {
        weatherCurrent = {
          precipitation: Math.max(weatherCurrent.precipitation, weather.current.precipitation),
          temperature: Math.min(weatherCurrent.temperature, weather.current.temperature),
          humidity: Math.max(weatherCurrent.humidity, weather.current.humidity),
        }
      }

      if (persistedKIndex?.kIndex != null) {
        const assessment = computeAssessment(weather.current, persistedKIndex.kIndex, drone, weather.windByAltitude ?? undefined, maxAltitude)
        const humidityMetric = assessment.metrics.find((m: MetricAssessment) => m.key === 'humidity')
        if (humidityMetric) {
          if (!humidityStatus || humidityMetric.status === 'warning' || (humidityMetric.status === 'caution' && humidityStatus === 'good')) {
            humidityStatus = humidityMetric.status
          }
        }
      }
    }
  }

  return {
    postflightNotes,
    weatherCurrent,
    humidityStatus,
    droneIpRating: drone.ipRating,
    droneName: drone.name,
    flightEntries,
    disruptionCategories,
    disruptionsNone,
  }
}

/* ── Component ────────────────────────────────────────────── */

export default function WartungPflegeSection({ open, onToggle, isComplete, onContinue, continueLabel, isPhaseComplete }: { open?: boolean; onToggle?: () => void; isComplete?: boolean; onContinue?: () => void; continueLabel?: string; isPhaseComplete?: boolean }) {
  const ctx = useFollowupContext()
  const suggestions = computeFollowupSuggestions(ctx)

  const [dismissed, setDismissed] = useMissionPersistedState<string[]>('followup:dismissed', [])
  const [customItems, setCustomItems] = useMissionPersistedState<CustomItem[]>('followup:custom', [])
  const [newItemText, setNewItemText] = useState('')

  const visibleSuggestions = suggestions.filter(s => !dismissed.includes(s.id))
  const totalCount = visibleSuggestions.length + customItems.length

  const badge: { label: string; status: MetricStatus } = totalCount > 0
    ? { label: `${totalCount} ${totalCount === 1 ? 'Aufgabe' : 'Aufgaben'}`, status: 'caution' }
    : { label: 'Keine', status: 'good' }

  function dismissSuggestion(id: string) {
    setDismissed(prev => [...prev, id])
  }

  function resetDismissed() {
    setDismissed([])
  }

  function addCustomItem() {
    const text = newItemText.trim()
    if (!text) return
    const item: CustomItem = {
      id: `custom_${Date.now()}`,
      label: text,
      isCustom: true,
    }
    setCustomItems(prev => [...prev, item])
    setNewItemText('')
  }

  function removeCustomItem(id: string) {
    setCustomItems(prev => prev.filter(i => i.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomItem()
    }
  }

  const hasDismissed = dismissed.length > 0

  return (
    <ChecklistSection
      title="Wartung & Pflege"
      icon={<PiWrench />}
      badge={badge}
      open={open}
      onToggle={onToggle}
      isComplete={isComplete}
      onContinue={onContinue}
      continueLabel={continueLabel}
      isPhaseComplete={isPhaseComplete}
    >
      {/* Info text */}
      <p className="text-xs text-text-muted">
        Aufgaben nach dem Einsatz — werden nicht vor Ort erledigt.
      </p>

      {/* Suggested items */}
      {visibleSuggestions.length > 0 && (
        <div className="space-y-2">
          {visibleSuggestions.map(suggestion => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              onDismiss={() => dismissSuggestion(suggestion.id)}
            />
          ))}
        </div>
      )}

      {/* Custom items */}
      {customItems.length > 0 && (
        <div className="space-y-2">
          {customItems.map(item => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl bg-surface-alt px-4 py-3"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-text-muted/40" />
              <p className="flex-1 text-sm text-text">{item.label}</p>
              <button
                onClick={() => removeCustomItem(item.id)}
                className="shrink-0 rounded-lg p-1 text-text-muted/60 transition-colors hover:text-warning hover:bg-warning-bg"
                title="Entfernen"
              >
                <PiX className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom item */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Eigene Aufgabe hinzufügen..."
          className="flex-1 rounded-lg bg-surface-alt px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none focus:ring-1 focus:ring-text-muted/40"
          data-1p-ignore
          autoComplete="off"
        />
        <button
          onClick={addCustomItem}
          disabled={!newItemText.trim()}
          className="shrink-0 rounded-lg bg-surface-alt p-2.5 text-text-muted transition-colors hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
          title="Hinzufügen"
        >
          <PiPlus className="text-sm" />
        </button>
      </div>

      {/* Reset dismissed */}
      {hasDismissed && (
        <button
          onClick={resetDismissed}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
        >
          <PiArrowCounterClockwise className="text-xs" />
          {dismissed.length} ausgeblendete {dismissed.length === 1 ? 'Vorschlag' : 'Vorschläge'} zurücksetzen
        </button>
      )}
    </ChecklistSection>
  )
}

/* ── Suggestion item ─────────────────────────────────────── */

function SuggestionItem({
  suggestion,
  onDismiss,
}: {
  suggestion: FollowupSuggestion
  onDismiss: () => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-alt px-4 py-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-caution" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text">{suggestion.label}</p>
        <p className="mt-0.5 text-[10px] text-text-muted">
          {suggestion.source.sourcePhase}: {suggestion.source.label}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-text-muted/60 transition-colors hover:text-warning hover:bg-warning-bg"
        title="Ausblenden"
      >
        <PiX className="text-sm" />
      </button>
    </div>
  )
}
