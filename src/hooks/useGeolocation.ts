import { useState, useEffect, useCallback } from 'react'

const BASE_STORAGE_KEY = 'uav-manual-location'

function storageKey(missionId?: string): string {
  return missionId ? `${BASE_STORAGE_KEY}:${missionId}` : BASE_STORAGE_KEY
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

function loadManualLocation(missionId?: string): ManualLocation | null {
  try {
    const raw = localStorage.getItem(storageKey(missionId))
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

export function useGeolocation(missionId?: string): GeolocationState {
  const saved = loadManualLocation(missionId)

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

  // GPS fallback — only runs when no manual location is set
  useEffect(() => {
    if (loadManualLocation(missionId)) return

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
  }, [missionId])

  const setManualLocation = useCallback((location: ManualLocation) => {
    localStorage.setItem(storageKey(missionId), JSON.stringify(location))
    setState({
      latitude: location.latitude,
      longitude: location.longitude,
      error: null,
      loading: false,
      isManual: true,
      manualName: location.name,
      needsManualLocation: false,
    })
  }, [missionId])

  const clearManualLocation = useCallback(() => {
    localStorage.removeItem(storageKey(missionId))
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
  }, [missionId])

  return { ...state, setManualLocation, clearManualLocation }
}
