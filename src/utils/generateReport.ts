import { jsPDF } from 'jspdf'
import type { ArcClass } from '../components/ArcDetermination'
import type { DroneSpec } from '../types/drone'
import type { NearbyCategory } from '../services/overpassApi'
import type { AssessmentResult, MetricStatus } from '../types/assessment'
import type { FlightLogEntry, EventNote } from '../types/flightLog'

// ── Design System ──────────────────────────────────────────────────────────

type RGB = [number, number, number]

const COLORS = {
  primary: [37, 99, 235] as RGB,
  primaryLight: [239, 246, 255] as RGB,
  good: [22, 163, 74] as RGB,
  caution: [202, 138, 4] as RGB,
  warning: [220, 38, 38] as RGB,
  text: [15, 23, 42] as RGB,
  textMuted: [100, 116, 139] as RGB,
  textLight: [148, 163, 184] as RGB,
  border: [226, 232, 240] as RGB,
  bgSection: [248, 250, 252] as RGB,
  white: [255, 255, 255] as RGB,
}

const FONTS = {
  title: 24,
  subtitle: 14,
  sectionHeader: 12,
  subHeader: 10,
  body: 9.5,
  small: 8,
}

// ── Label Maps ─────────────────────────────────────────────────────────────

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

// ── Interfaces (unchanged) ─────────────────────────────────────────────────

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

export interface SegmentReportData {
  label: string
  locationName?: string
  location: string
  categories: NearbyCategory[]
  manualChecks: Record<string, boolean>
  assessment: AssessmentResult | null
  grc: number | null
  arc: ArcClass | null
  sail: number | null
  anmeldungen?: AnmeldungItem[]
  mapImage?: string
  flugfreigabe?: string | null
  checklistGroups?: ChecklistGroupData[]
  flightLog?: FlightLogEntry[]
  eventNotes?: EventNote[]
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
  segments?: SegmentReportData[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip characters that jsPDF's built-in helvetica (WinAnsiEncoding) cannot render.
 * Keeps printable ASCII (U+0020–U+007E) and Latin-1 Supplement (U+00A0–U+00FF),
 * plus common Windows-1252 extras (€, –, —, ', ', ", ", …).
 * Everything else (emoji, CJK, etc.) is removed to prevent garbled glyphs
 * and corrupted text metrics in the PDF.
 */
function sanitizeForPdf(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x20-\x7E\xA0-\xFF\u20AC\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u2022]/g, '').trim()
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${meters} m`
}

// ── Report Generation ──────────────────────────────────────────────────────

export function generateReport(data: ReportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // ── Drawing Primitives ──────────────────────────────────────────────────

  function setColor(c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }
  function setFill(c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }
  function setDraw(c: RGB) { doc.setDrawColor(c[0], c[1], c[2]) }

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 22) {
      doc.addPage()
      y = margin
    }
  }

  // ── Visual Components ───────────────────────────────────────────────────

  function drawChapterHeader(num: number, title: string) {
    checkPageBreak(16)
    y += 6

    // Background bar
    setFill(COLORS.bgSection)
    doc.rect(margin, y - 5.5, contentWidth, 11, 'F')

    // Left accent
    setFill(COLORS.primary)
    doc.rect(margin, y - 5.5, 1.5, 11, 'F')

    // Text
    doc.setFontSize(FONTS.sectionHeader)
    doc.setFont('helvetica', 'bold')
    setColor(COLORS.text)
    doc.text(`${num}  ${title.toUpperCase()}`, margin + 5, y + 1)

    y += 10
  }

  function drawSubHeader(num: string, title: string) {
    checkPageBreak(12)
    y += 3

    // Subtle separator line
    setDraw(COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(margin, y - 1.5, margin + contentWidth, y - 1.5)

    // Text
    doc.setFontSize(FONTS.subHeader)
    doc.setFont('helvetica', 'bold')
    setColor(COLORS.text)
    doc.text(`${num}  ${title}`, margin + 1, y + 3)

    y += 8
  }

  function drawSegmentBanner(label: string, locationName: string | undefined) {
    checkPageBreak(20)
    y += 6

    // Full-width primary bar
    setFill(COLORS.primary)
    doc.roundedRect(margin, y - 5, contentWidth, 13, 2, 2, 'F')

    // White text
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    setColor(COLORS.white)
    const headerText = locationName ? `${label}: ${locationName}` : label
    doc.text(headerText, margin + 5, y + 2.5)

    y += 13
  }

  function drawStatusBadge(label: string, status: 'good' | 'caution' | 'warning' | 'primary') {
    const colorMap: Record<string, RGB> = {
      good: COLORS.good,
      caution: COLORS.caution,
      warning: COLORS.warning,
      primary: COLORS.primary,
    }
    const color = colorMap[status] || COLORS.primary

    doc.setFontSize(FONTS.small)
    doc.setFont('helvetica', 'bold')
    const textW = doc.getTextWidth(label) + 6
    const badgeH = 5.5

    setFill(color)
    doc.roundedRect(margin, y - 3.5, textW, badgeH, 1.5, 1.5, 'F')

    setColor(COLORS.white)
    doc.text(label, margin + 3, y)

    setColor(COLORS.text)
    y += badgeH + 2
  }

  function drawInlineBadge(x: number, yPos: number, label: string, status: MetricStatus): number {
    const colorMap: Record<MetricStatus, RGB> = {
      good: COLORS.good,
      caution: COLORS.caution,
      warning: COLORS.warning,
    }
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    const textW = doc.getTextWidth(label) + 4
    const badgeH = 4.5

    setFill(colorMap[status])
    doc.roundedRect(x, yPos - 3.2, textW, badgeH, 1, 1, 'F')

    setColor(COLORS.white)
    doc.text(label, x + 2, yPos)

    setColor(COLORS.text)
    return x + textW + 2
  }

  function drawInfoBox(items: Array<{ label: string; value: string; color?: RGB }>) {
    const boxH = items.length * 6.5 + 6
    checkPageBreak(boxH + 4)

    // Background
    setFill(COLORS.primaryLight)
    doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'F')

    // Left accent
    setFill(COLORS.primary)
    doc.rect(margin, y, 1.5, boxH, 'F')

    y += 5
    for (const item of items) {
      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'normal')
      setColor(COLORS.textMuted)
      doc.text(item.label, margin + 6, y)

      doc.setFont('helvetica', 'bold')
      setColor(item.color ?? COLORS.text)
      doc.text(item.value, margin + 50, y)
      y += 6.5
    }
    y += 3
  }

  function drawCheckItem(label: string, checked: boolean, note?: string) {
    checkPageBreak(note ? 11 : 6)

    doc.setFontSize(FONTS.body)

    if (checked) {
      // Green filled circle
      setFill(COLORS.good)
      doc.circle(margin + 3.5, y - 1.2, 1.5, 'F')
    } else {
      // Gray outlined circle
      setDraw(COLORS.textLight)
      doc.setLineWidth(0.3)
      doc.circle(margin + 3.5, y - 1.2, 1.5, 'S')
    }

    doc.setFont('helvetica', 'normal')
    setColor(checked ? COLORS.text : COLORS.textMuted)
    doc.text(label, margin + 8, y)
    y += 4.5

    if (note) {
      checkPageBreak(5)
      doc.setFontSize(FONTS.small)
      doc.setFont('helvetica', 'italic')
      setColor(COLORS.textLight)
      const noteLines = doc.splitTextToSize(`\u2192 ${sanitizeForPdf(note)}`, contentWidth - 14)
      doc.text(noteLines, margin + 10, y)
      y += noteLines.length * 4
    }
  }

  function drawMetricRow(label: string, value: string, status: MetricStatus, detail?: string) {
    checkPageBreak(6)

    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    setColor(COLORS.textMuted)
    doc.text(label, margin, y)

    setColor(COLORS.text)
    doc.text(value, margin + 48, y)

    drawInlineBadge(margin + 88, y, STATUS_LABELS[status], status)

    if (detail) {
      doc.setFontSize(FONTS.small)
      setColor(COLORS.textLight)
      doc.text(`(${detail})`, margin + 115, y)
    }

    setColor(COLORS.text)
    y += 5.5
  }

  function drawKeyValue(key: string, value: string) {
    checkPageBreak(7)
    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    setColor(COLORS.textMuted)
    doc.text(key, margin, y)
    setColor(COLORS.text)
    doc.text(sanitizeForPdf(value), margin + 60, y)
    y += 5.5
  }

  function drawGroupTitle(title: string) {
    checkPageBreak(10)
    y += 2
    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'bold')
    setColor(COLORS.text)
    doc.text(title, margin, y)
    y += 5
  }

  // ── Reusable Section Renderers ──────────────────────────────────────────

  function drawAnmeldungen(anmeldungen: AnmeldungItem[]) {
    for (const item of anmeldungen) {
      checkPageBreak(6)
      drawCheckItem(item.label, item.checked)
      if (item.detail) {
        doc.setFontSize(FONTS.small)
        setColor(COLORS.textLight)
        doc.text(item.detail, margin + 8, y - 2)
        y += 1
      }
    }
  }

  function drawMapImage(mapImage: string) {
    const imgWidth = contentWidth
    const imgHeight = imgWidth * 0.6
    checkPageBreak(imgHeight + 5)
    try {
      doc.addImage(mapImage, 'JPEG', margin, y, imgWidth, imgHeight)
      y += imgHeight + 5
    } catch {
      // Image could not be added
    }
  }

  function drawNearby(categories: NearbyCategory[], manualChecks: Record<string, boolean>) {
    if (categories.length === 0) {
      checkPageBreak(7)
      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'italic')
      setColor(COLORS.textMuted)
      doc.text('Keine relevanten Objekte im Umkreis von 1,5 km gefunden.', margin, y)
      y += 6
    } else {
      for (const cat of categories) {
        checkPageBreak(10)
        drawGroupTitle(`${cat.label} (${cat.items.length})`)

        for (const item of cat.items) {
          checkPageBreak(6)
          doc.setFontSize(FONTS.body)
          doc.setFont('helvetica', 'normal')
          setColor(COLORS.textMuted)
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
    drawGroupTitle('Manuelle Pr\u00fcfungen')

    for (const [key, label] of Object.entries(MANUAL_CHECK_LABELS)) {
      checkPageBreak(6)
      const isChecked = manualChecks[key] ?? false
      drawCheckItem(label, isChecked)
    }
  }

  function drawSora(grc: number | null, arc: ArcClass | null, sail: number | null) {
    if (grc !== null) {
      drawKeyValue('Ground Risk Class (GRC)', String(grc))
    } else {
      drawKeyValue('Ground Risk Class (GRC)', 'Nicht bestimmt')
    }

    if (arc !== null) {
      drawKeyValue('Air Risk Class (ARC)', ARC_LABELS[arc])
    } else {
      drawKeyValue('Air Risk Class (ARC)', 'Nicht bestimmt')
    }

    if (sail !== null) {
      const sailLabels = ['I', 'II', 'III', 'IV']
      drawKeyValue('SAIL', `SAIL ${sailLabels[sail - 1]}`)
    } else {
      drawKeyValue('SAIL', 'Nicht bestimmt')
    }
  }

  function drawWeatherAssessment(assessment: AssessmentResult | null) {
    if (assessment) {
      // Overall badge
      checkPageBreak(10)
      const overallStatusMap: Record<MetricStatus, 'good' | 'caution' | 'warning'> = {
        good: 'good',
        caution: 'caution',
        warning: 'warning',
      }
      drawStatusBadge(`Gesamtbewertung: ${STATUS_LABELS[assessment.overall]}`, overallStatusMap[assessment.overall])
      y += 2

      // Metrics
      for (const metric of assessment.metrics) {
        const valStr = `${metric.value} ${metric.unit}`.trim()
        drawMetricRow(metric.label, valStr, metric.status, metric.detail)
      }

      // Recommendations
      if (assessment.recommendations.length > 0) {
        y += 3
        checkPageBreak(10)
        drawGroupTitle('Empfehlungen')

        for (const rec of assessment.recommendations) {
          checkPageBreak(6)
          doc.setFontSize(FONTS.body)
          doc.setFont('helvetica', 'normal')
          setColor(COLORS.textMuted)
          const lines = doc.splitTextToSize(`\u2022  ${rec}`, contentWidth - 4)
          doc.text(lines, margin + 2, y)
          y += lines.length * 4.5
        }
      }
    } else {
      checkPageBreak(7)
      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'italic')
      setColor(COLORS.textMuted)
      doc.text('Wetterdaten nicht verf\u00fcgbar.', margin, y)
      y += 6
    }
  }

  function drawChecklistGroups(groups: ChecklistGroupData[]) {
    for (const group of groups) {
      drawGroupTitle(group.title)
      const groupChecked = group.items.filter((i) => i.checked).length
      const groupTotal = group.items.length
      checkPageBreak(7)
      doc.setFontSize(FONTS.small)
      doc.setFont('helvetica', 'normal')
      setColor(COLORS.textMuted)
      doc.text(`${groupChecked} von ${groupTotal} best\u00e4tigt`, margin, y)
      y += 5

      for (const item of group.items) {
        drawCheckItem(item.label, item.checked)
      }
    }
  }

  function drawFlugfreigabe(flugfreigabe: string | null | undefined) {
    if (flugfreigabe !== undefined) {
      if (flugfreigabe) {
        const freigabeDate = new Date(flugfreigabe)
        const freigabeTime = freigabeDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        const freigabeDateStr = freigabeDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

        checkPageBreak(12)
        drawStatusBadge('Flug freigegeben', 'good')
        doc.setFontSize(FONTS.body)
        doc.setFont('helvetica', 'normal')
        setColor(COLORS.textMuted)
        doc.text(`Freigabe erteilt: ${freigabeDateStr} ${freigabeTime} Uhr`, margin, y)
        y += 6
      } else {
        checkPageBreak(8)
        drawStatusBadge('Flug NICHT freigegeben', 'warning')
        y += 2
      }
    }
  }

  function drawFlightLog(flightLog: FlightLogEntry[], startIndex: number = 0) {
    // Reminder
    checkPageBreak(10)
    doc.setFontSize(FONTS.small)
    doc.setFont('helvetica', 'italic')
    setColor(COLORS.textLight)
    doc.text('Hinweis: Jeden Start und jede Landung an F\u00fcKw oder Abschnittsleiter melden.', margin, y)
    y += 6

    for (let i = 0; i < flightLog.length; i++) {
      const flight = flightLog[i]
      checkPageBreak(30)

      // Flight number with accent
      setFill(COLORS.bgSection)
      doc.rect(margin, y - 4, contentWidth, 8, 'F')
      setFill(COLORS.primary)
      doc.rect(margin, y - 4, 1, 8, 'F')

      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'bold')
      setColor(COLORS.text)
      doc.text(`Flug ${startIndex + i + 1}`, margin + 4, y)
      y += 7

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

      drawKeyValue('Fernpilot', flight.fernpilot || '\u2014')
      drawKeyValue('Luftraumbeobachter', flight.lrb || '\u2014')

      // Landing status as badge
      if (flight.blockOn) {
        const landungLabels: Record<string, string> = { ok: 'In Ordnung', auffaellig: 'Mit Auff\u00e4lligkeiten', notfall: 'Notfall' }
        const landungStatusMap: Record<string, 'good' | 'caution' | 'warning'> = { ok: 'good', auffaellig: 'caution', notfall: 'warning' }
        const status = flight.landungStatus ?? 'ok'
        checkPageBreak(8)
        doc.setFontSize(FONTS.body)
        doc.setFont('helvetica', 'normal')
        setColor(COLORS.textMuted)
        doc.text('Landung', margin, y)
        drawInlineBadge(margin + 60, y, landungLabels[status] ?? 'In Ordnung', landungStatusMap[status] ?? 'good' as MetricStatus)
        y += 5.5
      }

      if (flight.bemerkung) {
        drawKeyValue('Bemerkung', flight.bemerkung)
      }

      y += 3
    }

    // Summary
    checkPageBreak(12)
    const totalFlights = flightLog.length
    const completedFlights = flightLog.filter(f => f.blockOn !== null).length
    const totalMinutes = flightLog.reduce((acc, f) => {
      if (f.blockOn) {
        const diff = new Date(f.blockOn).getTime() - new Date(f.blockOff).getTime()
        return acc + (diff > 0 ? Math.floor(diff / 60000) : 0)
      }
      return acc
    }, 0)
    const summaryStr = totalMinutes < 60
      ? `${totalMinutes} min`
      : `${Math.floor(totalMinutes / 60)}h ${(totalMinutes % 60).toString().padStart(2, '0')}min`

    drawInfoBox([
      { label: 'Fl\u00fcge', value: `${completedFlights} von ${totalFlights} abgeschlossen` },
      { label: 'Gesamtflugzeit', value: summaryStr },
    ])
  }

  function drawEventNotes(eventNotes: EventNote[]) {
    for (const note of eventNotes) {
      checkPageBreak(15)

      // Timestamp
      const noteDate = new Date(note.timestamp)
      const noteTime = noteDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      const noteDateStr = noteDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'bold')
      setColor(COLORS.textMuted)
      doc.text(`${noteTime} (${noteDateStr})`, margin, y)
      y += 4.5

      // Text
      if (note.text) {
        doc.setFont('helvetica', 'normal')
        setColor(COLORS.text)
        const lines = doc.splitTextToSize(sanitizeForPdf(note.text), contentWidth - 4)
        checkPageBreak(lines.length * 4.5)
        doc.text(lines, margin + 2, y)
        y += lines.length * 4.5
      }
      y += 2
    }
  }

  /** Render all segment-specific sections (Chapters 2 + 3) for a given segment */
  function drawSegmentSections(seg: SegmentReportData, flightStartIndex: number): number {
    // ── Chapter 2: VORFLUGKONTROLLE ──
    drawChapterHeader(2, 'Vorflugkontrolle')

    // 2.1 Fluganmeldungen
    if (seg.anmeldungen && seg.anmeldungen.length > 0) {
      drawSubHeader('2.1', 'Fluganmeldungen')
      drawAnmeldungen(seg.anmeldungen)
    }

    // 2.2 Einsatzkarte
    if (seg.mapImage) {
      drawSubHeader('2.2', 'Einsatzkarte')
      drawMapImage(seg.mapImage)
    }

    // 2.3 Umgebungsprüfung
    drawSubHeader('2.3', 'Umgebungspr\u00fcfung')
    drawKeyValue('Standort', seg.location)
    y += 2
    drawNearby(seg.categories, seg.manualChecks)

    // 2.4 SORA
    drawSubHeader('2.4', 'SORA Risikoklassifizierung')
    drawSora(seg.grc, seg.arc, seg.sail)

    // 2.5 Wetterbewertung
    drawSubHeader('2.5', 'Wetterbewertung')
    drawWeatherAssessment(seg.assessment)

    // 2.6 Technische Checklisten (segment-scoped)
    if (seg.checklistGroups && seg.checklistGroups.length > 0) {
      drawSubHeader('2.6', 'Technische Checklisten')
      drawChecklistGroups(seg.checklistGroups)
    }

    // ── Chapter 3: FLUGFREIGABE & FLUGBETRIEB ──
    drawChapterHeader(3, 'Flugfreigabe & Flugbetrieb')

    // 3.1 Flugfreigabe
    drawSubHeader('3.1', 'Flugfreigabe')
    drawFlugfreigabe(seg.flugfreigabe)

    // 3.2 Flugtagebuch
    if (seg.flightLog && seg.flightLog.length > 0) {
      drawSubHeader('3.2', 'Flugtagebuch')
      drawFlightLog(seg.flightLog, flightStartIndex)
    }

    // 3.3 Ereignisse
    if (seg.eventNotes && seg.eventNotes.length > 0) {
      drawSubHeader('3.3', 'Ereignisse')
      drawEventNotes(seg.eventNotes)
    }

    return seg.flightLog?.length ?? 0
  }

  // ════════════════════════════════════════════════════════════════════════
  // COVER PAGE (Seite 1)
  // ════════════════════════════════════════════════════════════════════════

  // Accent bar at top
  setFill(COLORS.primary)
  doc.rect(0, 0, pageWidth, 8, 'F')

  // Title
  y = 50
  doc.setFontSize(FONTS.title)
  doc.setFont('helvetica', 'bold')
  setColor(COLORS.primary)
  doc.text('UAV MISSIONSBERICHT', margin, y)

  // Mission label
  if (data.missionLabel) {
    y += 14
    doc.setFontSize(FONTS.subtitle)
    doc.setFont('helvetica', 'normal')
    setColor(COLORS.text)
    doc.text(data.missionLabel, margin, y)
  }

  // Location
  y += 9
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  setColor(COLORS.textMuted)
  doc.text(data.location, margin, y)

  // Summary info box
  y += 16

  const totalFlightsCover = data.flightLog?.length ?? 0
  const totalMinutesCover = (data.flightLog ?? []).reduce((acc, f) => {
    if (f.blockOn) {
      const diff = new Date(f.blockOn).getTime() - new Date(f.blockOff).getTime()
      return acc + (diff > 0 ? Math.floor(diff / 60000) : 0)
    }
    return acc
  }, 0)
  const flightSummary = totalFlightsCover > 0
    ? `${totalFlightsCover} (${totalMinutesCover < 60 ? `${totalMinutesCover} min` : `${Math.floor(totalMinutesCover / 60)}h ${(totalMinutesCover % 60).toString().padStart(2, '0')}min`})`
    : 'Keine Fl\u00fcge'

  const outcomeLabels: Record<string, string> = {
    erfolgreich: 'Erfolgreich',
    erfolglos: 'Erfolglos',
    abgebrochen: 'Abgebrochen',
  }
  const outcomeColors: Record<string, RGB> = {
    erfolgreich: COLORS.good,
    erfolglos: COLORS.caution,
    abgebrochen: COLORS.warning,
  }

  const coverItems: Array<{ label: string; value: string; color?: RGB }> = [
    { label: 'Datum', value: dateStr },
    { label: 'Drohne', value: data.drone.name },
    { label: 'Fl\u00fcge', value: flightSummary },
  ]
  if (data.missionResult) {
    coverItems.push({
      label: 'Ergebnis',
      value: outcomeLabels[data.missionResult.outcome] || data.missionResult.outcome,
      color: outcomeColors[data.missionResult.outcome],
    })
  }
  drawInfoBox(coverItems)

  // Cover page footer
  doc.setFontSize(FONTS.small)
  doc.setFont('helvetica', 'normal')
  setColor(COLORS.textLight)
  doc.text(`Generiert: ${dateStr} ${timeStr}`, margin, pageHeight - 25)

  // ════════════════════════════════════════════════════════════════════════
  // CONTENT PAGES
  // ════════════════════════════════════════════════════════════════════════

  doc.addPage()
  y = margin

  const isMultiSegment = data.segments && data.segments.length > 1

  // ── Chapter 1: EINSATZ\u00dcBERSICHT ──────────────────────────────────────

  drawChapterHeader(1, 'Einsatz\u00fcbersicht')

  // 1.1 Einsatzdetails
  if (data.einsatzdetails) {
    const d = data.einsatzdetails
    drawSubHeader('1.1', 'Einsatzdetails')
    if (d.flugAnlass) drawKeyValue('Anlass des Fluges', d.flugAnlass)
    if (d.einsatzstichwort) drawKeyValue('Einsatzstichwort', d.einsatzstichwort)
    if (d.alarmzeit) drawKeyValue('Alarmzeit', d.alarmzeit)
    if (d.alarmierungDurch) drawKeyValue('Alarmierung durch', d.alarmierungDurch)
    if (d.anforderndeStelle) drawKeyValue('Anfordernde Stelle', d.anforderndeStelle)
    if (d.einsatzleiter) drawKeyValue('Einsatzleiter', d.einsatzleiter)
    if (d.abschnittsleiter) drawKeyValue('Abschnittsleiter', d.abschnittsleiter)
  }

  // 1.2 Truppst\u00e4rke
  if (data.truppstaerke && data.truppstaerke.members.length > 0) {
    drawSubHeader('1.2', 'Truppst\u00e4rke')
    for (const member of data.truppstaerke.members) {
      drawKeyValue(member.role, member.name)
    }
    checkPageBreak(7)
    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'bold')
    setColor(COLORS.textMuted)
    doc.text('Gesamt', margin, y)
    setColor(COLORS.text)
    doc.text(data.truppstaerke.summary, margin + 60, y)
    y += 5.5
  }

  // 1.3 Einsatzauftrag
  if (data.einsatzauftrag) {
    drawSubHeader('1.3', 'Einsatzauftrag')
    drawKeyValue('Art', data.einsatzauftrag.template)
    for (const detail of data.einsatzauftrag.details) {
      drawKeyValue(detail.label, detail.value)
    }
    if (data.einsatzauftrag.freitext) {
      checkPageBreak(15)
      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'normal')
      setColor(COLORS.textMuted)
      doc.text('Weitere Informationen', margin, y)
      y += 4
      setColor(COLORS.text)
      const lines = doc.splitTextToSize(sanitizeForPdf(data.einsatzauftrag.freitext), contentWidth - 4)
      doc.text(lines, margin, y)
      y += lines.length * 4.5
    }
  }

  // 1.4 Rahmenangaben
  drawSubHeader('1.4', 'Rahmenangaben')
  if (!isMultiSegment) {
    drawKeyValue('Standort', data.location)
  }
  drawKeyValue('Drohne', data.drone.name)
  drawKeyValue('Max. Flugh\u00f6he', `${data.maxAltitude} m`)
  drawKeyValue('IP-Schutzklasse', data.drone.ipRating ?? 'Keine')
  drawKeyValue('Gewicht', `${data.drone.weight} g`)

  // In multi-segment mode, render global tech checks (UAV, RC) here
  if (isMultiSegment) {
    const globalGroupTitles = ['UAV', 'Remote Controller (A und B)']
    const globalGroups = (data.checklistGroups ?? []).filter(g => globalGroupTitles.includes(g.title))
    if (globalGroups.length > 0) {
      y += 2
      drawGroupTitle('Technische Kontrolle')
      drawChecklistGroups(globalGroups)
    }
  }

  // ── Segment-Specific Content ────────────────────────────────────────────

  if (isMultiSegment) {
    // ── MULTI-SEGMENT PATH ──
    let flightCounter = 0
    for (const seg of data.segments!) {
      drawSegmentBanner(seg.label, seg.locationName)
      const segFlightCount = drawSegmentSections(seg, flightCounter)
      flightCounter += segFlightCount
    }
  } else {
    // ── SINGLE-SEGMENT PATH ──

    // ── Chapter 2: VORFLUGKONTROLLE ──
    drawChapterHeader(2, 'Vorflugkontrolle')

    // 2.1 Fluganmeldungen
    if (data.anmeldungen && data.anmeldungen.length > 0) {
      drawSubHeader('2.1', 'Fluganmeldungen')
      drawAnmeldungen(data.anmeldungen)
    }

    // 2.2 Einsatzkarte
    if (data.mapImage) {
      drawSubHeader('2.2', 'Einsatzkarte')
      drawMapImage(data.mapImage)
    }

    // 2.3 Umgebungspr\u00fcfung
    drawSubHeader('2.3', 'Umgebungspr\u00fcfung')
    drawNearby(data.categories, data.manualChecks)

    // 2.4 SORA Risikoklassifizierung
    drawSubHeader('2.4', 'SORA Risikoklassifizierung')
    drawSora(data.grc, data.arc, data.sail)

    // 2.5 Wetterbewertung
    drawSubHeader('2.5', 'Wetterbewertung')
    drawWeatherAssessment(data.assessment)

    // 2.6 Technische Checklisten
    if (data.checklistGroups && data.checklistGroups.length > 0) {
      drawSubHeader('2.6', 'Technische Checklisten')
      drawChecklistGroups(data.checklistGroups)
    }

    // ── Chapter 3: FLUGFREIGABE & FLUGBETRIEB ──
    drawChapterHeader(3, 'Flugfreigabe & Flugbetrieb')

    // 3.1 Flugfreigabe
    drawSubHeader('3.1', 'Flugfreigabe')
    drawFlugfreigabe(data.flugfreigabe)

    // 3.2 Flugtagebuch
    if (data.flightLog && data.flightLog.length > 0) {
      drawSubHeader('3.2', 'Flugtagebuch')
      drawFlightLog(data.flightLog)
    }

    // 3.3 Ereignisse
    if (data.eventNotes && data.eventNotes.length > 0) {
      drawSubHeader('3.3', 'Ereignisse')
      drawEventNotes(data.eventNotes)
    }
  }

  // ── GLOBAL POST-MISSION SECTIONS (both paths) ────────────────────────────

  // ── Chapter 4: NACHBEREITUNG ──
  drawChapterHeader(4, 'Nachbereitung')

  // 4.1 St\u00f6rungen & Vorf\u00e4lle
  if (data.disruptions) {
    drawSubHeader('4.1', 'St\u00f6rungen & Vorf\u00e4lle')

    if (data.disruptions.noDisruptions) {
      checkPageBreak(8)
      drawStatusBadge('Keine St\u00f6rungen oder Vorf\u00e4lle', 'good')
    } else if (data.disruptions.categories.length > 0) {
      for (const cat of data.disruptions.categories) {
        checkPageBreak(15)
        doc.setFontSize(FONTS.body)
        doc.setFont('helvetica', 'bold')
        setColor(COLORS.caution)
        doc.text(cat.label, margin, y)
        y += 5

        if (cat.note) {
          doc.setFont('helvetica', 'normal')
          setColor(COLORS.text)
          const lines = doc.splitTextToSize(sanitizeForPdf(cat.note), contentWidth - 4)
          checkPageBreak(lines.length * 4.5)
          doc.text(lines, margin + 2, y)
          y += lines.length * 4.5
        }
        y += 2
      }
    }
  }

  // 4.2 Nachflugkontrolle
  if (data.postFlightInspection) {
    const pfi = data.postFlightInspection
    drawSubHeader('4.2', 'Nachflugkontrolle')

    const pfiChecked = pfi.items.filter(i => i.checked).length
    const pfiTotal = pfi.items.length
    checkPageBreak(7)
    doc.setFontSize(FONTS.small)
    doc.setFont('helvetica', 'normal')
    setColor(COLORS.textMuted)
    doc.text(`${pfiChecked} von ${pfiTotal} best\u00e4tigt`, margin, y)
    y += 5

    for (const item of pfi.items) {
      drawCheckItem(item.label, item.checked, item.note)
    }

    if (pfi.remarks) {
      y += 3
      checkPageBreak(15)
      drawGroupTitle('Allgemeine Bemerkungen')
      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'normal')
      setColor(COLORS.text)
      const remarkLines = doc.splitTextToSize(sanitizeForPdf(pfi.remarks), contentWidth - 4)
      checkPageBreak(remarkLines.length * 4.5)
      doc.text(remarkLines, margin + 2, y)
      y += remarkLines.length * 4.5
    }
  }

  // 4.3 Einsatzabschluss
  if (data.einsatzabschluss) {
    const ea = data.einsatzabschluss
    drawSubHeader('4.3', 'Einsatzabschluss')

    // Abmeldungen
    if (ea.abmeldungen.length > 0) {
      drawGroupTitle('Abmeldungen')
      for (const item of ea.abmeldungen) {
        drawCheckItem(item.label, item.checked, item.note)
      }
      y += 2
    }

    // Dokumentation & Meldungen
    if (ea.dokumentation.length > 0) {
      drawGroupTitle('Dokumentation & Meldungen')
      for (const item of ea.dokumentation) {
        drawCheckItem(item.label, item.checked)
      }
      y += 2
    }

    // R\u00fcckbau
    if (ea.rueckbau.length > 0) {
      drawGroupTitle('R\u00fcckbau')
      for (const item of ea.rueckbau) {
        drawCheckItem(item.label, item.checked)
      }
      y += 2
    }

    // Feedback
    if (ea.feedback) {
      checkPageBreak(15)
      drawGroupTitle('Team-Feedback')
      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'normal')
      setColor(COLORS.text)
      const fbLines = doc.splitTextToSize(sanitizeForPdf(ea.feedback), contentWidth - 4)
      checkPageBreak(fbLines.length * 4.5)
      doc.text(fbLines, margin + 2, y)
      y += fbLines.length * 4.5
    }
  }

  // ── Chapter 5: WARTUNG & PFLEGE ──
  if (data.wartungPflege && data.wartungPflege.items.length > 0) {
    drawChapterHeader(5, 'Wartung & Pflege')

    for (const item of data.wartungPflege.items) {
      checkPageBreak(item.source ? 10 : 6)
      doc.setFontSize(FONTS.body)
      doc.setFont('helvetica', 'normal')
      setColor(COLORS.text)
      doc.text(`\u2022  ${item.label}`, margin + 2, y)
      y += 4.5

      if (item.source) {
        checkPageBreak(4)
        doc.setFontSize(FONTS.small)
        doc.setFont('helvetica', 'italic')
        setColor(COLORS.textLight)
        doc.text(item.source, margin + 8, y)
        y += 4
      }
    }
  }

  // ── Chapter 6: ERGEBNIS ──
  if (data.missionResult) {
    const mr = data.missionResult
    drawChapterHeader(6, 'Ergebnis')

    const resultLabels: Record<string, string> = {
      erfolgreich: 'Einsatz erfolgreich beendet',
      erfolglos: 'Einsatz erfolglos beendet',
      abgebrochen: 'Einsatz abgebrochen',
    }
    const resultStatusMap: Record<string, 'good' | 'caution' | 'warning'> = {
      erfolgreich: 'good',
      erfolglos: 'caution',
      abgebrochen: 'warning',
    }

    checkPageBreak(10)
    drawStatusBadge(resultLabels[mr.outcome] ?? mr.outcome, resultStatusMap[mr.outcome] ?? 'primary')

    if (mr.outcome === 'abgebrochen') {
      if (mr.abortReason) {
        drawKeyValue('Grund', mr.abortReason)
      }
      if (mr.abortNotes) {
        checkPageBreak(15)
        doc.setFontSize(FONTS.body)
        doc.setFont('helvetica', 'normal')
        setColor(COLORS.textMuted)
        doc.text('Details', margin, y)
        y += 4
        setColor(COLORS.text)
        const lines = doc.splitTextToSize(sanitizeForPdf(mr.abortNotes), contentWidth - 4)
        checkPageBreak(lines.length * 4.5)
        doc.text(lines, margin + 2, y)
        y += lines.length * 4.5
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // UNTERSCHRIFTEN (Signature Section)
  // ════════════════════════════════════════════════════════════════════════

  checkPageBreak(70)
  y += 10

  // Section header
  doc.setFontSize(FONTS.sectionHeader)
  doc.setFont('helvetica', 'bold')
  setColor(COLORS.text)
  doc.text('Unterschriften', margin, y)
  y += 10

  const sigWidth = (contentWidth - 10) / 2 // Two signature blocks side by side

  // Resolve names from crew data
  const fkName = data.truppstaerke?.members.find(m => m.role === 'Führungskraft')?.name || ''
  const elName = data.einsatzdetails?.einsatzleiter || ''

  // Left: Führungskraft UAS
  if (fkName) {
    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    setColor(COLORS.text)
    doc.text(fkName, margin, y + 16)
  }
  setDraw(COLORS.textMuted)
  doc.setLineWidth(0.4)
  doc.line(margin, y + 20, margin + sigWidth, y + 20)
  doc.setFontSize(FONTS.small)
  doc.setFont('helvetica', 'normal')
  setColor(COLORS.textMuted)
  doc.text('Ort, Datum', margin, y + 25)
  doc.text('Führungskraft UAS', margin, y + 30)

  // Right: Einsatzleitung
  const rightX = margin + sigWidth + 10
  if (elName) {
    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    setColor(COLORS.text)
    doc.text(elName, rightX, y + 16)
  }
  doc.line(rightX, y + 20, rightX + sigWidth, y + 20)
  doc.setFontSize(FONTS.small)
  doc.setFont('helvetica', 'normal')
  setColor(COLORS.textMuted)
  doc.text('Ort, Datum', rightX, y + 25)
  doc.text('Einsatzleitung', rightX, y + 30)

  y += 40

  // ════════════════════════════════════════════════════════════════════════
  // FOOTER (all pages)
  // ════════════════════════════════════════════════════════════════════════

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Separator line
    setDraw(COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(margin, pageHeight - 15, margin + contentWidth, pageHeight - 15)

    doc.setFontSize(FONTS.small)
    doc.setFont('helvetica', 'normal')
    setColor(COLORS.textLight)

    // Left: page number
    doc.text(`Seite ${i} / ${totalPages}`, margin, pageHeight - 10)

    // Center: report identity
    const centerText = 'UAV Missionsbericht'
    const centerX = pageWidth / 2 - doc.getTextWidth(centerText) / 2
    doc.text(centerText, centerX, pageHeight - 10)

    // Right: date
    const rightText = `${dateStr} ${timeStr}`
    doc.text(rightText, margin + contentWidth - doc.getTextWidth(rightText), pageHeight - 10)
  }

  // ── Return blob for caller to handle ──────────────────────────────────────

  const filename = `UAV_Missionsbericht_${dateStr.replace(/\./g, '-')}.pdf`
  const blob = doc.output('blob')

  return { blob, filename }
}

// ── PDF Download & Share Utilities ──────────────────────────────────────────

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function sharePdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  return navigator.share({ files: [file], title: 'UAV Missionsbericht' })
}

export function canSharePdf() {
  if (!navigator.canShare) return false
  const testFile = new File([''], 'test.pdf', { type: 'application/pdf' })
  return navigator.canShare({ files: [testFile] })
}
