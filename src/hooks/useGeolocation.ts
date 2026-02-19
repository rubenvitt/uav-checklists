import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'uav-manual-location'

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
  setManualLocation: (location: ManualLocation) => void
  clearManualLocation: () => void
}

function loadManualLocation(): ManualLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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

export function useGeolocation(): GeolocationState {
  const saved = loadManualLocation()

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
        }
      : {
          latitude: null,
          longitude: null,
          error: null,
          loading: true,
          isManual: false,
          manualName: null,
        }
  )

  // GPS fallback — only runs when no manual location is set
  useEffect(() => {
    if (loadManualLocation()) return

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation wird von diesem Browser nicht unterstützt',
        loading: false,
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
        })
      },
      (error) => {
        let message: string
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Standortzugriff wurde verweigert'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Standort ist nicht verfügbar'
            break
          case error.TIMEOUT:
            message = 'Standortabfrage hat zu lange gedauert'
            break
          default:
            message = 'Unbekannter Fehler bei der Standortabfrage'
        }
        setState({
          latitude: null,
          longitude: null,
          error: message,
          loading: false,
          isManual: false,
          manualName: null,
        })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const setManualLocation = useCallback((location: ManualLocation) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
    setState({
      latitude: location.latitude,
      longitude: location.longitude,
      error: null,
      loading: false,
      isManual: true,
      manualName: location.name,
    })
  }, [])

  const clearManualLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({
      latitude: null,
      longitude: null,
      error: null,
      loading: true,
      isManual: false,
      manualName: null,
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
          })
        },
        (error) => {
          let message: string
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Standortzugriff wurde verweigert'
              break
            case error.POSITION_UNAVAILABLE:
              message = 'Standort ist nicht verfügbar'
              break
            case error.TIMEOUT:
              message = 'Standortabfrage hat zu lange gedauert'
              break
            default:
              message = 'Unbekannter Fehler bei der Standortabfrage'
          }
          setState({
            latitude: null,
            longitude: null,
            error: message,
            loading: false,
            isManual: false,
            manualName: null,
          })
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  return { ...state, setManualLocation, clearManualLocation }
}
