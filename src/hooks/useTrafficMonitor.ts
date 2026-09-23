import { useEffect, useRef, useState } from 'react'
import { useSegmentId } from '../context/useSegmentId'
import { useMissionPersistedState } from './useMissionPersistedState'
import { useSegmentPersistedState } from './useSegmentPersistedState'
import { useFlightTraffic, type FlightTrafficErrorKind } from './useFlightTraffic'
import { assessTraffic } from '../utils/trafficAssessment'
import {
  EMPTY_TRAFFIC_MONITOR_STATE, detectTrafficAlert, formatTrafficAlertEvent, formatTrafficAlertLine, trafficAlertTitle,
} from '../utils/trafficMonitor'
import { TRAFFIC_SEARCH_RADIUS_KM } from '../data/thresholds'
import type { EventNote } from '../types/flightLog'
import type { FlightTrafficSnapshot, TrafficAlert, TrafficAssessment, TrafficMonitorState } from '../types/traffic'
import type { WeatherResponse } from '../types/weather'

/**
 * Abfrageintervalle. adsb.fi erlaubt 1 Anfrage/s je IP, adsb.lol drosselt
 * dynamisch nach Last; der Backend-Proxy cacht je Standort 15 s. Während eines
 * Flugs alle 30 s (≈ Aktualisierungsrate der Live-Karten, 2 Anfragen/min je
 * Gerät), zwischen den Flügen jede Minute.
 */
const FLIGHT_REFETCH_MS = 30_000
const IDLE_REFETCH_MS = 60_000
/** Ältere Snapshots (z. B. aus dem Query-Cache) nicht mehr als „neu“ melden */
const MAX_SNAPSHOT_AGE_MS = 2 * 60_000

type NotificationPermissionState = NotificationPermission | 'unsupported'

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11)
}

function readPermission(): NotificationPermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/**
 * Systembenachrichtigung, solange die App im Hintergrund ist. Über den Service
 * Worker, weil `new Notification()` auf Android nicht erlaubt ist.
 */
async function showSystemNotification(alert: TrafficAlert): Promise<void> {
  if (readPermission() !== 'granted') return
  const title = `Flugverkehr: ${trafficAlertTitle(alert)}`
  const options: NotificationOptions = {
    body: alert.items.map((i) => formatTrafficAlertLine(i, alert.heightIsAgl)).join('\n'),
    tag: 'flugmappe-traffic',
    icon: '/pwa-192x192.png',
  }
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.showNotification(title, options)
      return
    }
  } catch {
    // Fallback unten
  }
  try {
    new Notification(title, options)
  } catch {
    // Nicht unterstützt — die Meldung in der App bleibt
  }
}

interface UseTrafficMonitorOptions {
  latitude: number | null
  longitude: number | null
  /** Ein Flug ist gerade aktiv (kürzeres Intervall, auch im Hintergrund) */
  flightActive: boolean
}

export interface UseTrafficMonitorResult {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  snapshot: FlightTrafficSnapshot | null
  assessment: TrafficAssessment | null
  isLive: boolean
  configured: boolean
  hasLocation: boolean
  fetching: boolean
  error: string | null
  errorKind: FlightTrafficErrorKind | null
  refresh: () => void
  /** Letzte Meldung, bis sie bestätigt wurde */
  pendingAlert: TrafficAlert | null
  acknowledge: () => void
  notificationPermission: NotificationPermissionState
  requestNotifications: () => void
}

/**
 * ADS-B-Überwachung während der Flugphase: fragt den Flugverkehr periodisch ab,
 * meldet neu auftauchende bzw. näher kommende Tiefflieger in der App (und als
 * Systembenachrichtigung, wenn die App im Hintergrund ist) und legt dafür
 * automatisch ein Ereignis an — das landet so auch im Einsatzbericht.
 */
export function useTrafficMonitor({ latitude, longitude, flightActive }: UseTrafficMonitorOptions): UseTrafficMonitorResult {
  const segmentId = useSegmentId()
  const [enabled, setEnabled] = useMissionPersistedState<boolean>('traffic:monitor:enabled', true)
  const [monitorState, setMonitorState] = useSegmentPersistedState<TrafficMonitorState>('traffic:monitor', EMPTY_TRAFFIC_MONITOR_STATE)
  const [pendingAlert, setPendingAlert] = useSegmentPersistedState<TrafficAlert | null>('traffic:monitor:alert', null)
  const [, setEventNotes] = useMissionPersistedState<EventNote[]>('flightlog:events', [])
  const [persistedWeather] = useSegmentPersistedState<WeatherResponse | null>('env:weather', null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(readPermission)

  // Schutz gegen doppelte Auswertung (StrictMode führt Effekte zweimal aus)
  const processedRef = useRef<string | null>(null)

  const traffic = useFlightTraffic(
    enabled ? latitude : null,
    enabled ? longitude : null,
    TRAFFIC_SEARCH_RADIUS_KM,
    {
      refetchMs: flightActive ? FLIGHT_REFETCH_MS : IDLE_REFETCH_MS,
      refetchInBackground: flightActive,
      // Der Stand der Vorflugkontrolle bleibt der Snapshot des Abschnitts (PDF 2.3)
      persist: false,
    },
  )

  const elevation = persistedWeather?.elevation ?? null
  const assessment = traffic.snapshot ? assessTraffic(traffic.snapshot, elevation) : null
  const liveSnapshot = enabled && traffic.isLive ? traffic.snapshot : null
  const liveAssessment = liveSnapshot ? assessment : null

  useEffect(() => {
    if (!liveSnapshot || !liveAssessment) return
    const { fetchedAt } = liveSnapshot
    if (processedRef.current === fetchedAt) return
    if (monitorState.lastProcessedAt && fetchedAt <= monitorState.lastProcessedAt) return
    processedRef.current = fetchedAt
    if (Date.now() - new Date(fetchedAt).getTime() > MAX_SNAPSHOT_AGE_MS) return

    const { state, alert } = detectTrafficAlert(monitorState, liveAssessment, fetchedAt, generateId())
    setMonitorState(state)
    if (!alert) return

    setPendingAlert(alert)
    setEventNotes((prev) => [
      ...prev,
      {
        id: alert.id,
        timestamp: alert.at,
        text: formatTrafficAlertEvent(alert, flightActive),
        segmentId: segmentId ?? undefined,
        source: 'adsb',
      },
    ])

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      void showSystemNotification(alert)
    } else if (alert.status === 'warning') {
      navigator.vibrate?.([200, 100, 200])
    }
  }, [liveSnapshot, liveAssessment, monitorState, flightActive, segmentId, setMonitorState, setPendingAlert, setEventNotes])

  const requestNotifications = () => {
    if (typeof Notification === 'undefined') return
    void Notification.requestPermission().then(setNotificationPermission)
  }

  return {
    enabled,
    setEnabled,
    snapshot: traffic.snapshot,
    assessment,
    isLive: traffic.isLive,
    configured: traffic.configured,
    hasLocation: latitude !== null && longitude !== null,
    fetching: traffic.fetching,
    error: traffic.error,
    errorKind: traffic.errorKind,
    refresh: traffic.refresh,
    pendingAlert,
    acknowledge: () => setPendingAlert(null),
    notificationPermission,
    requestNotifications,
  }
}
