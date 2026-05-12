// ───────────────────────────────────────────────────────────────────────
// v1.0.16 — Timeline page (Section 04 · Estimated timeline).
//
// Replaces the v1.0.6 plain-text drawTimelinePage with the approved
// editorial layout: kicker + 26pt italic-serif title + 11pt CLAY
// subtitle + drawWeekRuler at y ≈ 680 (weeks 0/4/8/12/16/20/24) +
// 4 drawGanttRow stacked (prep work / submit work / review wait /
// fixes work) + drawMilestoneCallout for the Baugenehmigung-issued
// marker.
//
// PHASE DATA. v1.0.16 hardcodes the T-03 typical schedule:
//   - Preparation · LP 1–4 (work, weeks 0–12)
//   - Submission (work, weeks 12–13)
//   - Review · Bauamt (wait, weeks 13–21)
//   - Corrections (work, weeks 21–23)
//   - Milestone — Baugenehmigung at week 22
// Per-template parameterization is v1.0.17+ work. The hardcoded
// values match the prototype + the v1.0.6 plain-text page they
// replace.
// ───────────────────────────────────────────────────────────────────────

import { type PDFPage } from 'pdf-lib'
import {
  CLAY,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawEditorialTitle,
  drawFooter,
  drawGanttRow,
  drawKicker,
  drawMilestoneCallout,
  drawMonoMeta,
  drawPaperBackground,
  drawSafeText,
  drawWeekRuler,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

export interface TimelinePhase {
  /** pdfStrings key (e.g. 'timeline.phase.prep'). */
  labelKey: string
  /** pdfStrings key for the duration (e.g. 'timeline.phase.prep.duration'). */
  durationKey: string
  startWeek: number
  endWeek: number
  kind: 'work' | 'wait'
}

export interface TimelineData {
  templateLabel: string
  bundeslandCode: string
  phases: ReadonlyArray<TimelinePhase>
  /** Total weeks on the ruler (e.g. 24). */
  totalWeeks: number
  /** Approval-milestone week (e.g. 22). */
  milestoneWeek: number
}

export interface TimelineFooterData {
  docNo: string
  totalPages: number
  pageNumber: number
}

/**
 * Standard T-03 phase set. Used when the assembly doesn't supply a
 * template-specific schedule (v1.0.16 ships only this set).
 */
export const DEFAULT_TIMELINE_PHASES: ReadonlyArray<TimelinePhase> = [
  {
    labelKey: 'timeline.phase.prep',
    durationKey: 'timeline.phase.prep.duration',
    startWeek: 0,
    endWeek: 12,
    kind: 'work',
  },
  {
    labelKey: 'timeline.phase.submit',
    durationKey: 'timeline.phase.submit.duration',
    startWeek: 12,
    endWeek: 13,
    kind: 'work',
  },
  {
    labelKey: 'timeline.phase.review',
    durationKey: 'timeline.phase.review.duration',
    startWeek: 13,
    endWeek: 21,
    kind: 'wait',
  },
  {
    labelKey: 'timeline.phase.fixes',
    durationKey: 'timeline.phase.fixes.duration',
    startWeek: 21,
    endWeek: 23,
    kind: 'work',
  },
]

export const DEFAULT_TIMELINE_TOTAL_WEEKS = 24
export const DEFAULT_TIMELINE_MILESTONE_WEEK = 22

export function renderTimelineBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: TimelineData,
): void {
  drawPaperBackground(page)

  // ─── Header row ─────────────────────────────────────────────────
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'timeline.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'timeline.title'),
    fonts,
  )
  // Right-side meta (template · state)
  const metaText = `${data.templateLabel}  ·  ${data.bundeslandCode}`
  drawMonoMeta(page, PAGE_WIDTH - MARGIN, headerY - 24, metaText, fonts, {
    align: 'right',
  })

  // ─── Subtitle ───────────────────────────────────────────────────
  drawSafeText(page, pdfStr(strings, 'timeline.sub'), {
    x: MARGIN,
    y: headerY - 56,
    size: 11,
    font: fonts.serifItalic,
    color: CLAY,
    safe: fonts.safe,
  })

  // ─── Week ruler ─────────────────────────────────────────────────
  const rulerX = MARGIN
  const rulerY = headerY - 90
  const rulerWidth = PAGE_WIDTH - 2 * MARGIN
  // Generate evenly-spaced ticks every 4 weeks up to totalWeeks.
  const ticks: number[] = []
  for (let w = 0; w <= data.totalWeeks; w += 4) ticks.push(w)
  drawWeekRuler(page, {
    x: rulerX,
    y: rulerY,
    width: rulerWidth,
    weeks: ticks,
    weekLabel: pdfStr(strings, 'timeline.weekLabel'),
    fonts,
  })

  // ─── Gantt rows ─────────────────────────────────────────────────
  let cursor = rulerY - 30
  for (const phase of data.phases) {
    const { endY } = drawGanttRow(page, {
      x: rulerX,
      y: cursor,
      width: rulerWidth,
      label: pdfStr(strings, phase.labelKey),
      duration: pdfStr(strings, phase.durationKey),
      startWeek: phase.startWeek,
      endWeek: phase.endWeek,
      totalWeeks: data.totalWeeks,
      kind: phase.kind,
      fonts,
    })
    cursor = endY - 16
  }

  // ─── Milestone callout ──────────────────────────────────────────
  drawMilestoneCallout(page, {
    x: rulerX,
    y: cursor - 12,
    width: rulerWidth,
    label: pdfStr(strings, 'timeline.milestone'),
    detail: pdfStr(strings, 'timeline.milestone.detail'),
    fonts,
  })
}

export function renderTimelineFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: TimelineFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
