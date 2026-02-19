import { PiWind, PiMagnet, PiEye } from 'react-icons/pi'
import { WiStrongWind, WiThermometer, WiRain, WiHumidity, WiBarometer, WiFog } from 'react-icons/wi'
import type { WeatherData, WindAtAltitude } from '../types/weather'
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

function findMaxWind(windByAltitude: WindAtAltitude[], maxAltitude: number) {
  const relevant = windByAltitude.filter((w) => w.altitude <= maxAltitude)
  if (relevant.length === 0) return { speed: 0, gusts: 0, speedAlt: 0, gustsAlt: 0 }

  let maxSpeed = relevant[0]
  let maxGusts = relevant[0]
  for (const w of relevant) {
    if (w.windSpeed > maxSpeed.windSpeed) maxSpeed = w
    if (w.windGusts > maxGusts.windGusts) maxGusts = w
  }
  return {
    speed: maxSpeed.windSpeed,
    gusts: maxGusts.windGusts,
    speedAlt: maxSpeed.altitude,
    gustsAlt: maxGusts.altitude,
  }
}

export function computeAssessment(
  weather: WeatherData,
  kIndex: number,
  drone: DroneSpec,
  windByAltitude?: WindAtAltitude[],
  maxAltitude?: number,
): AssessmentResult {
  const hasAltitudeData = windByAltitude && windByAltitude.length > 0 && maxAltitude != null
  const maxWind = hasAltitudeData ? findMaxWind(windByAltitude, maxAltitude) : null

  const windSpeed = maxWind ? maxWind.speed : weather.windSpeed
  const windGusts = maxWind ? maxWind.gusts : weather.windGusts
  const windDetail = maxWind && maxWind.speedAlt > 10 ? `max. bei ${maxWind.speedAlt} m` : undefined
  const gustsDetail = maxWind && maxWind.gustsAlt > 10 ? `max. bei ${maxWind.gustsAlt} m` : undefined

  const metrics: MetricAssessment[] = [
    {
      key: 'wind',
      label: 'Wind',
      value: formatWind(windSpeed),
      unit: 'km/h',
      status: evaluateWind(windSpeed, drone.maxWindSpeed),
      icon: <WiStrongWind />,
      detail: windDetail,
    },
    {
      key: 'gusts',
      label: 'Böen',
      value: formatWind(windGusts),
      unit: 'km/h',
      status: evaluateGusts(windGusts, drone.maxWindSpeed),
      icon: <PiWind />,
      detail: gustsDetail,
    },
    {
      key: 'kIndex',
      label: 'K-Index',
      value: formatKIndex(kIndex),
      unit: '',
      status: evaluateKIndex(kIndex),
      icon: <PiMagnet />,
    },
    {
      key: 'temperature',
      label: 'Temperatur',
      value: formatTemperature(weather.temperature),
      unit: '°C',
      status: evaluateTemperature(weather.temperature, drone.minTemp, drone.maxTemp),
      icon: <WiThermometer />,
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
      icon: <WiRain />,
    },
    {
      key: 'visibility',
      label: 'Sichtweite',
      value: formatVisibility(weather.visibility / 1000),
      unit: formatVisibilityUnit(weather.visibility / 1000),
      status: evaluateVisibility(weather.visibility / 1000),
      icon: <PiEye />,
    },
    {
      key: 'humidity',
      label: 'Luftfeuchtigkeit',
      value: formatPercent(weather.humidity),
      unit: '%',
      status: evaluateHumidity(weather.humidity),
      icon: <WiHumidity />,
    },
    {
      key: 'pressure',
      label: 'Luftdruck',
      value: formatPressure(weather.pressure),
      unit: 'hPa',
      status: evaluatePressure(weather.pressure),
      icon: <WiBarometer />,
    },
    {
      key: 'dewPoint',
      label: 'Taupunkt',
      value: formatDewPoint(weather.dewPoint),
      unit: '°C',
      status: evaluateDewPoint(weather.temperature, weather.dewPoint),
      icon: <WiFog />,
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
