export function formatTemperature(value: number): string {
  return value.toFixed(1)
}

export function formatWind(value: number): string {
  return value.toFixed(1)
}

export function formatPressure(value: number): string {
  return `${Math.round(value)}`
}

export function formatVisibility(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}`
  }
  return km.toFixed(1)
}

export function formatVisibilityUnit(km: number): string {
  return km < 1 ? 'm' : 'km'
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}`
}

export function formatKIndex(value: number): string {
  return `Kp ${Math.round(value)}`
}

export function formatDewPoint(value: number): string {
  return value.toFixed(1)
}
