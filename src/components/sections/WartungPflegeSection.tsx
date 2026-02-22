import { useState } from 'react'
import { useStore } from '@tanstack/react-store'
import { PiWrench, PiX, PiPlus, PiArrowCounterClockwise } from 'react-icons/pi'
import { useQueryClient } from '@tanstack/react-query'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import { useMissionId } from '../../context/MissionContext'
import { getMissionAtom } from '../../stores/missionFormStore'
import { readStorage } from '../../hooks/usePersistedState'
import { computeFollowupSuggestions, type FollowupContext, type FollowupSuggestion } from '../../utils/followupSuggestions'
import { computeAssessment } from '../../utils/assessment'
import { getDroneById } from '../../data/drones'
import { useMissionSegment } from '../../hooks/useMissionSegment'
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

function useFollowupContext(): FollowupContext {
  const missionId = useMissionId()
  const queryClient = useQueryClient()
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

  // Read weather data for assessment (segment-aware)
  const { segments } = useMissionSegment()
  const segmentIds = segments.length > 0 ? segments.map(s => s.id) : [null]

  let weatherCurrent: FollowupContext['weatherCurrent'] = null
  let humidityStatus: MetricStatus | null = null

  const persistedKIndex = readStorage<{ kIndex: number } | null>('env:kindex', null, missionId)

  // Find weather data from segment-prefixed storage
  let persistedWeather: WeatherResponse | null = null
  for (const segId of segmentIds) {
    const prefix = segId ? `seg:${segId}:` : ''
    persistedWeather = readStorage<WeatherResponse | null>(`${prefix}env:weather`, null, missionId)
    if (persistedWeather) break
  }

  if (persistedWeather?.current) {
    weatherCurrent = {
      precipitation: persistedWeather.current.precipitation,
      temperature: persistedWeather.current.temperature,
      humidity: persistedWeather.current.humidity,
    }

    if (persistedKIndex?.kIndex != null) {
      const assessment = computeAssessment(persistedWeather.current, persistedKIndex.kIndex, drone, persistedWeather.windByAltitude ?? undefined, maxAltitude)
      const humidityMetric = assessment.metrics.find((m: MetricAssessment) => m.key === 'humidity')
      if (humidityMetric) humidityStatus = humidityMetric.status
    }
  } else {
    // Fallback: try React Query cache (legacy missions)
    try {
      const raw = localStorage.getItem(`uav-manual-location:${missionId}`)
      if (raw) {
        const loc = JSON.parse(raw)
        if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
          const lat = Math.round(loc.latitude * 1000) / 1000
          const lon = Math.round(loc.longitude * 1000) / 1000
          const weatherData = queryClient.getQueryData<WeatherResponse>(['weather', lat, lon, maxAltitude])
          const kIndexData = queryClient.getQueryData<{ kIndex: number }>(['kindex'])

          if (weatherData?.current) {
            weatherCurrent = {
              precipitation: weatherData.current.precipitation,
              temperature: weatherData.current.temperature,
              humidity: weatherData.current.humidity,
            }
            if (kIndexData?.kIndex != null) {
              const assessment = computeAssessment(weatherData.current, kIndexData.kIndex, drone, weatherData.windByAltitude ?? undefined, maxAltitude)
              const humidityMetric = assessment.metrics.find((m: MetricAssessment) => m.key === 'humidity')
              if (humidityMetric) humidityStatus = humidityMetric.status
            }
          }
        }
      }
    } catch { /* ignore cache misses */ }
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
