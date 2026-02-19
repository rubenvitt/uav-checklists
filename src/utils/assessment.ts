import type { WeatherData } from '../types/weather'
import type { DroneSpec } from '../types/drone'
import type { AssessmentResult, MetricAssessment, MetricStatus } from '../types/assessment'
import {
  evaluateWind,
  evaluateGusts,
  evaluateKIndex,
  evaluateTemperature,
  evaluatePrecipitation,
  evaluateVisibility,
  evaluateHumidity,
  evaluatePressure,
  evaluateDewPoint,
} from '../data/thresholds'
import { generateRecommendations } from './recommendations'
import {
  formatWind,
  formatTemperature,
  formatKIndex,
  formatPercent,
  formatVisibility,
  formatVisibilityUnit,
  formatPressure,
  formatDewPoint,
} from './formatting'

export function computeAssessment(
  weather: WeatherData,
  kIndex: number,
  drone: DroneSpec,
): AssessmentResult {
  const metrics: MetricAssessment[] = [
    {
      key: 'wind',
      label: 'Wind',
      value: formatWind(weather.windSpeed),
      unit: 'km/h',
      status: evaluateWind(weather.windSpeed, drone.maxWindSpeed),
      icon: '💨',
    },
    {
      key: 'gusts',
      label: 'Böen',
      value: formatWind(weather.windGusts),
      unit: 'km/h',
      status: evaluateGusts(weather.windGusts, drone.maxWindSpeed),
      icon: '🌊',
    },
    {
      key: 'kIndex',
      label: 'K-Index',
      value: formatKIndex(kIndex),
      unit: '',
      status: evaluateKIndex(kIndex),
      icon: '🧲',
    },
    {
      key: 'temperature',
      label: 'Temperatur',
      value: formatTemperature(weather.temperature),
      unit: '°C',
      status: evaluateTemperature(weather.temperature, drone.minTemp, drone.maxTemp),
      icon: '🌡️',
    },
    {
      key: 'precipitation',
      label: 'Niederschlag',
      value: formatPercent(weather.precipitationProbability),
      unit: '%',
      status: evaluatePrecipitation(
        weather.precipitationProbability,
        weather.precipitation,
        drone.ipRating !== null,
      ),
      icon: '🌧️',
    },
    {
      key: 'visibility',
      label: 'Sichtweite',
      value: formatVisibility(weather.visibility / 1000),
      unit: formatVisibilityUnit(weather.visibility / 1000),
      status: evaluateVisibility(weather.visibility / 1000),
      icon: '👁️',
    },
    {
      key: 'humidity',
      label: 'Luftfeuchtigkeit',
      value: formatPercent(weather.humidity),
      unit: '%',
      status: evaluateHumidity(weather.humidity),
      icon: '💧',
    },
    {
      key: 'pressure',
      label: 'Luftdruck',
      value: formatPressure(weather.pressure),
      unit: 'hPa',
      status: evaluatePressure(weather.pressure),
      icon: '🔽',
    },
    {
      key: 'dewPoint',
      label: 'Taupunkt',
      value: formatDewPoint(weather.dewPoint),
      unit: '°C',
      status: evaluateDewPoint(weather.temperature, weather.dewPoint),
      icon: '🌫️',
    },
  ]

  const statusPriority: Record<MetricStatus, number> = {
    good: 0,
    caution: 1,
    warning: 2,
  }

  const overall = metrics.reduce<MetricStatus>((worst, metric) => {
    return statusPriority[metric.status] > statusPriority[worst] ? metric.status : worst
  }, 'good')

  const recommendations = generateRecommendations(metrics, drone)

  return { overall, metrics, recommendations }
}
