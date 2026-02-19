import type { MetricStatus } from '../types/assessment'

export function evaluateWind(speed: number, droneMax: number): MetricStatus {
  const ratio = speed / droneMax
  if (ratio > 1) return 'warning'
  if (ratio >= 0.7) return 'caution'
  return 'good'
}

export function evaluateGusts(gusts: number, droneMax: number): MetricStatus {
  const ratio = gusts / droneMax
  if (ratio > 1) return 'warning'
  if (ratio >= 0.7) return 'caution'
  return 'good'
}

export function evaluateKIndex(kp: number): MetricStatus {
  if (kp >= 6) return 'warning'
  if (kp >= 4) return 'caution'
  return 'good'
}

export function evaluateTemperature(temp: number, min: number, max: number): MetricStatus {
  if (temp < min || temp > max) return 'warning'
  if (temp < min + 5 || temp > max - 5) return 'caution'
  return 'good'
}

export function evaluatePrecipitation(
  probability: number,
  amount: number,
  hasIpRating: boolean,
): MetricStatus {
  if (probability === 0 && amount === 0) return 'good'
  if (!hasIpRating && amount > 0) return 'warning'
  if (probability > 30) return 'warning'
  if (probability >= 1) return 'caution'
  return 'good'
}

export function evaluateVisibility(km: number): MetricStatus {
  if (km < 1) return 'warning'
  if (km < 5) return 'caution'
  return 'good'
}

export function evaluateHumidity(percent: number): MetricStatus {
  if (percent > 90) return 'warning'
  if (percent >= 80) return 'caution'
  return 'good'
}

export function evaluatePressure(hPa: number): MetricStatus {
  if (hPa < 950 || hPa > 1070) return 'warning'
  if (hPa < 980 || hPa > 1050) return 'caution'
  return 'good'
}

export function evaluateDewPoint(temp: number, dewPoint: number): MetricStatus {
  const spread = temp - dewPoint
  if (spread < 2) return 'warning'
  if (spread <= 4) return 'caution'
  return 'good'
}
