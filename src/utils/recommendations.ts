import type { MetricAssessment } from '../types/assessment'
import type { DroneSpec } from '../types/drone'

export function generateRecommendations(
  metrics: MetricAssessment[],
  drone: DroneSpec,
): string[] {
  const recommendations: string[] = []

  for (const metric of metrics) {
    if (metric.status === 'good') continue

    const isWarning = metric.status === 'warning'

    switch (metric.key) {
      case 'wind':
        recommendations.push(
          isWarning
            ? `Windgeschwindigkeit überschreitet das Limit der ${drone.name}. Flug nicht empfohlen.`
            : `Windgeschwindigkeit nähert sich dem Limit der ${drone.name}. Vorsicht beim Fliegen.`,
        )
        break
      case 'gusts':
        recommendations.push(
          isWarning
            ? `Böen überschreiten das Limit der ${drone.name}. Flug nicht empfohlen.`
            : `Starke Böen erwartet. Flugstabilität der ${drone.name} kann beeinträchtigt sein.`,
        )
        break
      case 'kIndex':
        recommendations.push(
          isWarning
            ? `Hohe geomagnetische Aktivität (${metric.value}). GPS-Störungen wahrscheinlich – Flug vermeiden.`
            : `Erhöhte geomagnetische Aktivität (${metric.value}). GPS-Genauigkeit könnte beeinträchtigt sein.`,
        )
        break
      case 'temperature': {
        const temp = parseFloat(metric.value)
        if (isWarning) {
          recommendations.push(
            `Temperatur liegt außerhalb des Betriebsbereichs der ${drone.name}. Flug nicht empfohlen.`,
          )
        } else {
          recommendations.push(
            temp <= drone.minTemp + 5
              ? `Temperatur nähert sich dem unteren Betriebslimit. Akkuleistung ist bei Kälte deutlich reduziert – Akkus warmhalten und Flugzeit verkürzen.`
              : `Temperatur nähert sich dem oberen Betriebslimit. Überhitzungsgefahr für Elektronik und Akkus.`,
          )
        }
        break
      }
      case 'precipitation':
        if (drone.ipRating === null) {
          recommendations.push(
            isWarning
              ? `Niederschlag erwartet. Drohne ohne IP-Schutz nicht fliegen lassen.`
              : `Leichte Niederschlagswahrscheinlichkeit. ${drone.name} hat keinen IP-Schutz – Vorsicht.`,
          )
        } else {
          recommendations.push(
            isWarning
              ? `Starker Niederschlag erwartet. Trotz ${drone.ipRating}-Schutz Vorsicht geboten.`
              : `Leichter Niederschlag möglich. ${drone.name} ist ${drone.ipRating}-geschützt.`,
          )
        }
        break
      case 'visibility':
        recommendations.push(
          isWarning
            ? `Sichtweite unter 1 km. Sichtflug nicht möglich – Flug nicht empfohlen.`
            : `Eingeschränkte Sichtweite. Sichtkontakt zur Drohne sicherstellen.`,
        )
        break
      case 'humidity':
        recommendations.push(
          isWarning
            ? `Sehr hohe Luftfeuchtigkeit. Kondensationsgefahr an der Elektronik.`
            : `Erhöhte Luftfeuchtigkeit. Drohne nach dem Flug trocknen lassen.`,
        )
        break
      case 'pressure':
        recommendations.push(
          isWarning
            ? `Extremer Luftdruck. Flugverhalten kann stark beeinträchtigt sein.`
            : `Ungewöhnlicher Luftdruck. Flugeigenschaften können leicht abweichen.`,
        )
        break
      case 'dewPoint':
        recommendations.push(
          isWarning
            ? `Taupunkt sehr nah an der Lufttemperatur. Nebelbildung und Kondensation wahrscheinlich.`
            : `Taupunkt nähert sich der Lufttemperatur. Kondensationsrisiko beachten.`,
        )
        break
    }
  }

  // Zusätzliche Akkuwarnung bei niedrigen Temperaturen (auch im grünen Bereich)
  const tempMetric = metrics.find((m) => m.key === 'temperature')
  if (tempMetric && tempMetric.status === 'good') {
    const temp = parseFloat(tempMetric.value)
    if (temp < 10) {
      recommendations.push(
        'Niedrige Temperaturen können die Akkulaufzeit verkürzen. Akkus warmhalten und Ladestand häufiger prüfen.',
      )
    }
  }

  return recommendations
}
