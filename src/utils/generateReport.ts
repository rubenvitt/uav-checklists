import { jsPDF } from 'jspdf'
import type { ArcClass } from '../components/ArcDetermination'
import type { DroneSpec } from '../types/drone'
import type { NearbyCategory } from '../services/overpassApi'
import type { AssessmentResult, MetricStatus } from '../types/assessment'

const ARC_LABELS: Record<ArcClass, string> = {
  a: 'ARC-a',
  b: 'ARC-b',
  'c-star': 'ARC-c*',
  cd: 'ARC-c/d',
}

const STATUS_LABELS: Record<MetricStatus, string> = {
  good: 'Gut',
  caution: 'Achtung',
  warning: 'Warnung',
}

const MANUAL_CHECK_LABELS: Record<string, string> = {
  wlan: 'WLAN-Netze',
  other_uav: 'Andere UAV',
  radio: 'Funkanlagen',
  gps_jammer: 'GPS-Störsender',
  magnetic: 'Magnetfelder',
  bos_active: 'BOS-Einsatzstelle',
  verfassungsorgane: 'Verfassungsorgane',
  residential: 'Wohngrundstücke',
}

export interface ReportData {
  location: string
  drone: DroneSpec
  maxAltitude: number
  categories: NearbyCategory[]
  manualChecks: Record<string, boolean>
  grc: number | null
  arc: ArcClass | null
  sail: number | null
  assessment: AssessmentResult | null
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${meters} m`
}

export function generateReport(data: ReportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  function checkPageBreak(needed: number) {
    const pageHeight = doc.internal.pageSize.getHeight()
    if (y + needed > pageHeight - 20) {
      doc.addPage()
      y = margin
    }
  }

  function drawSectionTitle(title: string) {
    checkPageBreak(12)
    y += 4
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, y)
    y += 2
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, margin + contentWidth, y)
    y += 6
  }

  function drawKeyValue(key: string, value: string) {
    checkPageBreak(7)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(key, margin, y)
    doc.setTextColor(30, 30, 30)
    doc.text(value, margin + 60, y)
    y += 5.5
  }

  // === HEADER ===
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('UAV Vorflugkontrolle', margin, y)
  y += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`${dateStr}  ${timeStr}`, margin, y)
  y += 10

  // === RAHMENANGABEN ===
  drawSectionTitle('Rahmenangaben')
  drawKeyValue('Standort', data.location)
  drawKeyValue('Drohne', data.drone.name)
  drawKeyValue('Max. Flughoehe', `${data.maxAltitude} m`)
  drawKeyValue('IP-Schutzklasse', data.drone.ipRating ?? 'Keine')
  drawKeyValue('Gewicht', `${data.drone.weight} g`)

  // === UMGEBUNGSPRUEFUNG ===
  drawSectionTitle('Umgebungspruefung')

  if (data.categories.length === 0) {
    checkPageBreak(7)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text('Keine relevanten Objekte im Umkreis von 1,5 km gefunden.', margin, y)
    y += 6
  } else {
    for (const cat of data.categories) {
      checkPageBreak(10)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text(`${cat.label} (${cat.items.length})`, margin, y)
      y += 5

      for (const item of cat.items) {
        checkPageBreak(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        const distStr = item.distance !== null && item.direction
          ? `${formatDistance(item.distance)} ${item.direction}`
          : 'im Suchradius'
        doc.text(`  ${item.name}`, margin + 2, y)
        doc.text(distStr, margin + contentWidth - doc.getTextWidth(distStr), y)
        y += 4.5
      }
      y += 2
    }
  }

  // Manual checks
  checkPageBreak(10)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Manuelle Pruefungen', margin, y)
  y += 5

  for (const [key, label] of Object.entries(MANUAL_CHECK_LABELS)) {
    checkPageBreak(6)
    const isChecked = data.manualChecks[key] ?? false
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    const symbol = isChecked ? '[X]' : '[ ]'
    doc.text(`${symbol}  ${label}`, margin + 2, y)
    y += 4.5
  }

  // === SORA RISIKOKLASSIFIZIERUNG ===
  drawSectionTitle('SORA Risikoklassifizierung')

  if (data.grc !== null) {
    drawKeyValue('Ground Risk Class (GRC)', String(data.grc))
  } else {
    drawKeyValue('Ground Risk Class (GRC)', 'Nicht bestimmt')
  }

  if (data.arc !== null) {
    drawKeyValue('Air Risk Class (ARC)', ARC_LABELS[data.arc])
  } else {
    drawKeyValue('Air Risk Class (ARC)', 'Nicht bestimmt')
  }

  if (data.sail !== null) {
    const sailLabels = ['I', 'II', 'III', 'IV']
    drawKeyValue('SAIL', `SAIL ${sailLabels[data.sail - 1]}`)
  } else {
    drawKeyValue('SAIL', 'Nicht bestimmt')
  }

  // === WETTERBEWERTUNG ===
  drawSectionTitle('Wetterbewertung')

  if (data.assessment) {
    drawKeyValue('Gesamtbewertung', STATUS_LABELS[data.assessment.overall])
    y += 2

    for (const metric of data.assessment.metrics) {
      checkPageBreak(6)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(metric.label, margin, y)

      const valStr = `${metric.value} ${metric.unit}`.trim()
      doc.setTextColor(30, 30, 30)
      doc.text(valStr, margin + 50, y)

      const statusStr = STATUS_LABELS[metric.status]
      const statusColor: Record<MetricStatus, [number, number, number]> = {
        good: [34, 139, 34],
        caution: [200, 150, 0],
        warning: [200, 50, 50],
      }
      const [r, g, b] = statusColor[metric.status]
      doc.setTextColor(r, g, b)
      doc.text(statusStr, margin + 90, y)

      if (metric.detail) {
        doc.setTextColor(150, 150, 150)
        doc.text(`(${metric.detail})`, margin + 115, y)
      }

      doc.setTextColor(30, 30, 30)
      y += 5.5
    }

    // Recommendations
    if (data.assessment.recommendations.length > 0) {
      y += 3
      checkPageBreak(10)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('Empfehlungen', margin, y)
      y += 5

      for (const rec of data.assessment.recommendations) {
        checkPageBreak(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        const lines = doc.splitTextToSize(`- ${rec}`, contentWidth - 4)
        doc.text(lines, margin + 2, y)
        y += lines.length * 4.5
      }
    }
  } else {
    checkPageBreak(7)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text('Wetterdaten nicht verfuegbar.', margin, y)
    y += 6
  }

  // === FOOTER (Seitenzahlen) ===
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.text(
      `Seite ${i} / ${totalPages}`,
      margin,
      pageHeight - 10,
    )
    doc.text(
      `Generiert: ${dateStr} ${timeStr}`,
      margin + contentWidth - doc.getTextWidth(`Generiert: ${dateStr} ${timeStr}`),
      pageHeight - 10,
    )
  }

  doc.save(`UAV_Vorflugkontrolle_${dateStr.replace(/\./g, '-')}.pdf`)
}
