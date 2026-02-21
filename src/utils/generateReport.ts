import { jsPDF } from 'jspdf'
import type { ArcClass } from '../components/ArcDetermination'
import type { DroneSpec } from '../types/drone'
import type { NearbyCategory } from '../services/overpassApi'
import type { AssessmentResult, MetricStatus } from '../types/assessment'
import type { FlightLogEntry, EventNote } from '../types/flightLog'

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

export interface EinsatzdetailsData {
  flugAnlass: string
  einsatzstichwort: string
  alarmzeit: string
  alarmierungDurch: string
  anforderndeStelle: string
  einsatzleiter: string
  abschnittsleiter: string
}

export interface TruppstaerkeData {
  members: Array<{ role: string; name: string }>
  summary: string
}

export interface EinsatzauftragData {
  template: string
  details: Array<{ label: string; value: string }>
  freitext: string
}

export interface AnmeldungItem {
  label: string
  detail: string
  checked: boolean
}

export interface ChecklistGroupData {
  title: string
  items: Array<{ label: string; checked: boolean }>
}

export interface PostFlightInspectionItem {
  label: string
  checked: boolean
  note?: string
}

export interface PostFlightInspectionData {
  items: PostFlightInspectionItem[]
  remarks: string
}

export interface DisruptionsData {
  noDisruptions: boolean
  categories: Array<{ key: string; label: string; note: string }>
}

export interface MissionResultData {
  outcome: 'erfolgreich' | 'erfolglos' | 'abgebrochen'
  abortReason?: string
  abortNotes?: string
}

export interface EinsatzabschlussItem {
  label: string
  checked: boolean
  note?: string
}

export interface EinsatzabschlussData {
  abmeldungen: EinsatzabschlussItem[]
  dokumentation: EinsatzabschlussItem[]
  rueckbau: EinsatzabschlussItem[]
  feedback: string
}

export interface WartungPflegeItem {
  label: string
  source?: string
  isCustom: boolean
}

export interface WartungPflegeData {
  items: WartungPflegeItem[]
}

export interface ReportData {
  missionLabel?: string
  einsatzdetails?: EinsatzdetailsData
  truppstaerke?: TruppstaerkeData
  einsatzauftrag?: EinsatzauftragData
  anmeldungen?: AnmeldungItem[]
  mapImage?: string
  location: string
  drone: DroneSpec
  maxAltitude: number
  categories: NearbyCategory[]
  manualChecks: Record<string, boolean>
  grc: number | null
  arc: ArcClass | null
  sail: number | null
  assessment: AssessmentResult | null
  checklistGroups?: ChecklistGroupData[]
  flugfreigabe?: string | null
  flightLog?: FlightLogEntry[]
  eventNotes?: EventNote[]
  disruptions?: DisruptionsData
  postFlightInspection?: PostFlightInspectionData
  einsatzabschluss?: EinsatzabschlussData
  wartungPflege?: WartungPflegeData
  missionResult?: MissionResultData
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
  if (data.missionLabel) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(data.missionLabel, margin, y)
    y += 6
  }
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`${dateStr}  ${timeStr}`, margin, y)
  y += 10

  // === EINSATZDETAILS ===
  if (data.einsatzdetails) {
    const d = data.einsatzdetails
    drawSectionTitle('Einsatzdetails')
    if (d.flugAnlass) drawKeyValue('Anlass des Fluges', d.flugAnlass)
    if (d.einsatzstichwort) drawKeyValue('Einsatzstichwort', d.einsatzstichwort)
    if (d.alarmzeit) drawKeyValue('Alarmzeit', d.alarmzeit)
    if (d.alarmierungDurch) drawKeyValue('Alarmierung durch', d.alarmierungDurch)
    if (d.anforderndeStelle) drawKeyValue('Anfordernde Stelle', d.anforderndeStelle)
    if (d.einsatzleiter) drawKeyValue('Einsatzleiter', d.einsatzleiter)
    if (d.abschnittsleiter) drawKeyValue('Abschnittsleiter', d.abschnittsleiter)
  }

  // === TRUPPSTAERKE ===
  if (data.truppstaerke && data.truppstaerke.members.length > 0) {
    drawSectionTitle('Truppstärke')
    for (const member of data.truppstaerke.members) {
      drawKeyValue(member.role, member.name)
    }
    checkPageBreak(7)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('Gesamt', margin, y)
    doc.setTextColor(30, 30, 30)
    doc.text(data.truppstaerke.summary, margin + 60, y)
    y += 5.5
  }

  // === EINSATZAUFTRAG ===
  if (data.einsatzauftrag) {
    drawSectionTitle('Einsatzauftrag')
    drawKeyValue('Art', data.einsatzauftrag.template)
    for (const detail of data.einsatzauftrag.details) {
      drawKeyValue(detail.label, detail.value)
    }
    if (data.einsatzauftrag.freitext) {
      checkPageBreak(15)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('Weitere Informationen', margin, y)
      y += 4
      doc.setTextColor(30, 30, 30)
      const lines = doc.splitTextToSize(data.einsatzauftrag.freitext, contentWidth - 4)
      doc.text(lines, margin, y)
      y += lines.length * 4.5
    }
  }

  // === FLUGANMELDUNGEN ===
  if (data.anmeldungen && data.anmeldungen.length > 0) {
    drawSectionTitle('Fluganmeldungen')
    for (const item of data.anmeldungen) {
      checkPageBreak(6)
      const symbol = item.checked ? '[X]' : '[ ]'
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`${symbol}  ${item.label}`, margin + 2, y)
      if (item.detail) {
        doc.setTextColor(150, 150, 150)
        doc.text(item.detail, margin + 80, y)
      }
      y += 5
    }
  }

  // === EINSATZKARTE ===
  if (data.mapImage) {
    drawSectionTitle('Einsatzkarte')
    const imgWidth = contentWidth
    const imgHeight = imgWidth * 0.6
    checkPageBreak(imgHeight + 5)
    try {
      doc.addImage(data.mapImage, 'JPEG', margin, y, imgWidth, imgHeight)
      y += imgHeight + 5
    } catch {
      // Image could not be added
    }
  }

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

  // === TECHNISCHE VORFLUGKONTROLLE ===
  if (data.checklistGroups && data.checklistGroups.length > 0) {
    for (const group of data.checklistGroups) {
      drawSectionTitle(group.title)
      const groupChecked = group.items.filter((i) => i.checked).length
      const groupTotal = group.items.length
      checkPageBreak(7)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`${groupChecked} von ${groupTotal} bestätigt`, margin, y)
      y += 5

      for (const item of group.items) {
        checkPageBreak(5.5)
        const symbol = item.checked ? '[X]' : '[ ]'
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(`${symbol}  ${item.label}`, margin + 2, y)
        y += 4.5
      }
    }
  }

  // === FLUGFREIGABE ===
  if (data.flugfreigabe !== undefined) {
    drawSectionTitle('Flugfreigabe')
    if (data.flugfreigabe) {
      const freigabeDate = new Date(data.flugfreigabe)
      const freigabeTime = freigabeDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      const freigabeDateStr = freigabeDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(34, 139, 34)
      doc.text('Flug freigegeben', margin, y)
      y += 5
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Freigabe erteilt: ${freigabeDateStr} ${freigabeTime} Uhr`, margin, y)
      y += 6
    } else {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(200, 50, 50)
      doc.text('Flug NICHT freigegeben', margin, y)
      y += 6
    }
  }

  // === FLUGTAGEBUCH ===
  if (data.flightLog && data.flightLog.length > 0) {
    drawSectionTitle('Flugtagebuch')

    // Reminder
    checkPageBreak(10)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(150, 150, 150)
    doc.text('Hinweis: Jeden Start und jede Landung an FüKw oder Abschnittsleiter melden.', margin, y)
    y += 6

    for (let i = 0; i < data.flightLog.length; i++) {
      const flight = data.flightLog[i]
      checkPageBreak(30)

      // Flight number
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text(`Flug ${i + 1}`, margin, y)
      y += 5

      // Block Off
      const offDate = new Date(flight.blockOff)
      const offStr = offDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        + ' (' + offDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ')'
      drawKeyValue('Block Off (Start)', offStr)

      // Block On
      if (flight.blockOn) {
        const onDate = new Date(flight.blockOn)
        const onStr = onDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          + ' (' + onDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ')'
        drawKeyValue('Block On (Landung)', onStr)

        // Duration
        const diff = onDate.getTime() - offDate.getTime()
        if (diff >= 0) {
          const mins = Math.floor(diff / 60000)
          const durStr = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${(mins % 60).toString().padStart(2, '0')}min`
          drawKeyValue('Flugdauer', durStr)
        }
      } else {
        drawKeyValue('Block On (Landung)', 'In der Luft')
      }

      drawKeyValue('Fernpilot', flight.fernpilot || '—')
      drawKeyValue('Luftraumbeobachter', flight.lrb || '—')

      // Landing status
      if (flight.blockOn) {
        const landungLabels: Record<string, string> = { ok: 'In Ordnung', auffaellig: 'Mit Auffälligkeiten', notfall: 'Notfall' }
        const landungColors: Record<string, [number, number, number]> = { ok: [34, 139, 34], auffaellig: [200, 150, 0], notfall: [200, 50, 50] }
        const status = flight.landungStatus ?? 'ok'
        const statusStr = landungLabels[status] ?? 'In Ordnung'
        const [r, g, b] = landungColors[status] ?? [34, 139, 34]
        checkPageBreak(6)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text('Landung', margin, y)
        doc.setTextColor(r, g, b)
        doc.text(statusStr, margin + 60, y)
        doc.setTextColor(30, 30, 30)
        y += 5.5
      }

      if (flight.bemerkung) {
        drawKeyValue('Bemerkung', flight.bemerkung)
      }

      y += 3
    }

    // Summary
    checkPageBreak(10)
    const totalFlights = data.flightLog.length
    const completedFlights = data.flightLog.filter(f => f.blockOn !== null).length
    const totalMinutes = data.flightLog.reduce((acc, f) => {
      if (f.blockOn) {
        const diff = new Date(f.blockOn).getTime() - new Date(f.blockOff).getTime()
        return acc + (diff > 0 ? Math.floor(diff / 60000) : 0)
      }
      return acc
    }, 0)
    const summaryStr = totalMinutes < 60
      ? `${totalMinutes} min`
      : `${Math.floor(totalMinutes / 60)}h ${(totalMinutes % 60).toString().padStart(2, '0')}min`

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('Zusammenfassung', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(`${completedFlights} von ${totalFlights} Flügen abgeschlossen — Gesamtflugzeit: ${summaryStr}`, margin, y)
    y += 6
  }

  // === EREIGNISSE ===
  if (data.eventNotes && data.eventNotes.length > 0) {
    drawSectionTitle('Ereignisse')

    for (let i = 0; i < data.eventNotes.length; i++) {
      const note = data.eventNotes[i]
      checkPageBreak(15)

      // Timestamp
      const noteDate = new Date(note.timestamp)
      const noteTime = noteDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      const noteDateStr = noteDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text(`${noteTime} (${noteDateStr})`, margin, y)
      y += 4.5

      // Text
      if (note.text) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 30, 30)
        const lines = doc.splitTextToSize(note.text, contentWidth - 4)
        checkPageBreak(lines.length * 4.5)
        doc.text(lines, margin + 2, y)
        y += lines.length * 4.5
      }
      y += 2
    }
  }

  // === STÖRUNGEN & VORFÄLLE ===
  if (data.disruptions) {
    drawSectionTitle('Störungen & Vorfälle')

    if (data.disruptions.noDisruptions) {
      checkPageBreak(7)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(34, 139, 34)
      doc.text('Keine Störungen oder Vorfälle', margin, y)
      y += 6
    } else if (data.disruptions.categories.length > 0) {
      for (const cat of data.disruptions.categories) {
        checkPageBreak(15)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(200, 150, 0)
        doc.text(cat.label, margin, y)
        y += 5

        if (cat.note) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(30, 30, 30)
          const lines = doc.splitTextToSize(cat.note, contentWidth - 4)
          checkPageBreak(lines.length * 4.5)
          doc.text(lines, margin + 2, y)
          y += lines.length * 4.5
        }
        y += 2
      }
    }
  }

  // === NACHFLUGKONTROLLE ===
  if (data.postFlightInspection) {
    const pfi = data.postFlightInspection
    drawSectionTitle('Nachflugkontrolle')

    const pfiChecked = pfi.items.filter(i => i.checked).length
    const pfiTotal = pfi.items.length
    checkPageBreak(7)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`${pfiChecked} von ${pfiTotal} bestätigt`, margin, y)
    y += 5

    for (const item of pfi.items) {
      checkPageBreak(item.note ? 10 : 5.5)
      const symbol = item.checked ? '[X]' : '[ ]'
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`${symbol}  ${item.label}`, margin + 2, y)
      y += 4.5

      if (item.note) {
        checkPageBreak(5)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        const noteLines = doc.splitTextToSize(`→ ${item.note}`, contentWidth - 12)
        doc.text(noteLines, margin + 8, y)
        y += noteLines.length * 4
      }
    }

    if (pfi.remarks) {
      y += 3
      checkPageBreak(15)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('Allgemeine Bemerkungen', margin, y)
      y += 4.5
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      const remarkLines = doc.splitTextToSize(pfi.remarks, contentWidth - 4)
      checkPageBreak(remarkLines.length * 4.5)
      doc.text(remarkLines, margin + 2, y)
      y += remarkLines.length * 4.5
    }
  }

  // === EINSATZABSCHLUSS ===
  if (data.einsatzabschluss) {
    const ea = data.einsatzabschluss

    drawSectionTitle('Einsatzabschluss')

    // Abmeldungen
    if (ea.abmeldungen.length > 0) {
      checkPageBreak(7)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('Abmeldungen', margin, y)
      y += 5

      for (const item of ea.abmeldungen) {
        checkPageBreak(item.note ? 10 : 5.5)
        const symbol = item.checked ? '[X]' : '[ ]'
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(`${symbol}  ${item.label}`, margin + 2, y)
        y += 4.5

        if (item.note) {
          checkPageBreak(5)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(150, 150, 150)
          const noteLines = doc.splitTextToSize(`→ ${item.note}`, contentWidth - 12)
          doc.text(noteLines, margin + 8, y)
          y += noteLines.length * 4
        }
      }
      y += 2
    }

    // Dokumentation & Meldungen
    if (ea.dokumentation.length > 0) {
      checkPageBreak(7)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('Dokumentation & Meldungen', margin, y)
      y += 5

      for (const item of ea.dokumentation) {
        checkPageBreak(5.5)
        const symbol = item.checked ? '[X]' : '[ ]'
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(`${symbol}  ${item.label}`, margin + 2, y)
        y += 4.5
      }
      y += 2
    }

    // Rückbau
    if (ea.rueckbau.length > 0) {
      checkPageBreak(7)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('Rückbau', margin, y)
      y += 5

      for (const item of ea.rueckbau) {
        checkPageBreak(5.5)
        const symbol = item.checked ? '[X]' : '[ ]'
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(`${symbol}  ${item.label}`, margin + 2, y)
        y += 4.5
      }
      y += 2
    }

    // Feedback
    if (ea.feedback) {
      checkPageBreak(15)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('Team-Feedback', margin, y)
      y += 4.5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      const fbLines = doc.splitTextToSize(ea.feedback, contentWidth - 4)
      checkPageBreak(fbLines.length * 4.5)
      doc.text(fbLines, margin + 2, y)
      y += fbLines.length * 4.5
    }
  }

  // === WARTUNG & PFLEGE ===
  if (data.wartungPflege && data.wartungPflege.items.length > 0) {
    drawSectionTitle('Wartung & Pflege')

    for (const item of data.wartungPflege.items) {
      checkPageBreak(item.source ? 10 : 6)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      doc.text(`•  ${item.label}`, margin + 2, y)
      y += 4.5

      if (item.source) {
        checkPageBreak(4)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text(item.source, margin + 8, y)
        y += 4
      }
    }
  }

  // === ERGEBNIS ===
  if (data.missionResult) {
    const mr = data.missionResult
    drawSectionTitle('Ergebnis')

    const outcomeLabels: Record<string, string> = {
      erfolgreich: 'Einsatz erfolgreich beendet',
      erfolglos: 'Einsatz erfolglos beendet',
      abgebrochen: 'Einsatz abgebrochen',
    }
    const outcomeColors: Record<string, [number, number, number]> = {
      erfolgreich: [34, 139, 34],
      erfolglos: [200, 150, 0],
      abgebrochen: [200, 50, 50],
    }

    checkPageBreak(7)
    const [r, g, b] = outcomeColors[mr.outcome] ?? [30, 30, 30]
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(r, g, b)
    doc.text(outcomeLabels[mr.outcome] ?? mr.outcome, margin, y)
    y += 6

    if (mr.outcome === 'abgebrochen') {
      if (mr.abortReason) {
        drawKeyValue('Grund', mr.abortReason)
      }
      if (mr.abortNotes) {
        checkPageBreak(15)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text('Details', margin, y)
        y += 4
        doc.setTextColor(30, 30, 30)
        const lines = doc.splitTextToSize(mr.abortNotes, contentWidth - 4)
        checkPageBreak(lines.length * 4.5)
        doc.text(lines, margin + 2, y)
        y += lines.length * 4.5
      }
    }
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
