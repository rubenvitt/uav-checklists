import { useState, useEffect, useCallback } from 'react'

const BASE_STORAGE_KEY = 'uav-manual-location'

function storageKey(missionId?: string, segmentId?: string | null): string {
  if (missionId && segmentId) return `${BASE_STORAGE_KEY}:${missionId}:seg:${segmentId}`
  if (missionId) return `${BASE_STORAGE_KEY}:${missionId}`
  return BASE_STORAGE_KEY
}

interface ManualLocation {
  latitude: number
  longitude: number
  name: string
}

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
  isManual: boolean
  manualName: string | null
  needsManualLocation: boolean
  setManualLocation: (location: ManualLocation) => void
  clearManualLocation: () => void
}

function loadManualLocation(missionId?: string, segmentId?: string | null, allowLegacyFallback: boolean = true): ManualLocation | null {
  // Try segment-specific key first, then conditionally fallback to legacy key
  if (missionId && segmentId) {
    const segResult = tryLoadManualLocation(storageKey(missionId, segmentId))
    if (segResult) return segResult
    // Fallback: read legacy key ONLY for the first segment (pre-existing data)
    if (allowLegacyFallback) {
      return tryLoadManualLocation(storageKey(missionId))
    }
    return null
  }
  return tryLoadManualLocation(storageKey(missionId))
}

function tryLoadManualLocation(key: string): ManualLocation | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      typeof parsed.name === 'string'
    ) {
      return parsed
    }
  } catch {
    // ignore corrupt data
  }
  return null
}

export function useGeolocation(missionId?: string, segmentId?: string | null, isFirstSegment?: boolean): GeolocationState {
  const allowLegacyFallback = isFirstSegment !== false
  const saved = loadManualLocation(missionId, segmentId, allowLegacyFallback)

  const [state, setState] = useState<
    Omit<GeolocationState, 'setManualLocation' | 'clearManualLocation'>
  >(() =>
    saved
      ? {
          latitude: saved.latitude,
          longitude: saved.longitude,
          error: null,
          loading: false,
          isManual: true,
          manualName: saved.name,
          needsManualLocation: false,
        }
      : {
          latitude: null,
          longitude: null,
          error: null,
          loading: true,
          isManual: false,
          manualName: null,
          needsManualLocation: false,
        }
  )

  // Re-initialize state when segmentId changes (e.g. after relocation)
  useEffect(() => {
    const current = loadManualLocation(missionId, segmentId, allowLegacyFallback)
    if (current) {
      setState({
        latitude: current.latitude,
        longitude: current.longitude,
        error: null,
        loading: false,
        isManual: true,
        manualName: current.name,
        needsManualLocation: false,
      })
    } else {
      setState({
        latitude: null,
        longitude: null,
        error: null,
        loading: true,
        isManual: false,
        manualName: null,
        needsManualLocation: false,
      })
    }
  }, [missionId, segmentId, allowLegacyFallback])

  // GPS fallback — only runs when loading and no manual location
  useEffect(() => {
    if (!state.loading || state.isManual) return

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: null,
        loading: false,
        needsManualLocation: true,
      }))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          isManual: false,
          manualName: null,
          needsManualLocation: false,
        })
      },
      () => {
        setState({
          latitude: null,
          longitude: null,
          error: null,
          loading: false,
          isManual: false,
          manualName: null,
          needsManualLocation: true,
        })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [state.loading, state.isManual])

  const setManualLocation = useCallback((location: ManualLocation) => {
    localStorage.setItem(storageKey(missionId, segmentId), JSON.stringify(location))
    setState({
      latitude: location.latitude,
      longitude: location.longitude,
      error: null,
      loading: false,
      isManual: true,
      manualName: location.name,
      needsManualLocation: false,
    })
  }, [missionId, segmentId])

  const clearManualLocation = useCallback(() => {
    localStorage.removeItem(storageKey(missionId, segmentId))
    setState({
      latitude: null,
      longitude: null,
      error: null,
      loading: true,
      isManual: false,
      manualName: null,
      needsManualLocation: false,
    })

    // Re-fetch GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
            isManual: false,
            manualName: null,
            needsManualLocation: false,
          })
        },
        () => {
          setState({
            latitude: null,
            longitude: null,
            error: null,
            loading: false,
            isManual: false,
            manualName: null,
            needsManualLocation: true,
          })
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [missionId, segmentId])

  return { ...state, setManualLocation, clearManualLocation }
}
