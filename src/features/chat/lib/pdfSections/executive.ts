// ───────────────────────────────────────────────────────────────────────
// v1.0.15 — Executive page (Section 01 · Top 3 next steps).
//
// Pure renderer matching the approved prototype. Three priority cards
// stacked on a single page; each card has a left-accent border in the
// color of its priority bucket, a large italic-serif numeral, a title
// row with priority pill, a wrapped body paragraph, and optional
// source/timing chips. Footer is a single italic CLAY line citing
// the legal anchors the recommendations were derived from.
//
// Mirrors the cover.ts + toc.ts pattern: body renders inline, footer
// renders post-page-count via renderExecutiveFooter.
//
// PRIORITY BUCKETING. The Recommendation type doesn't carry an
// explicit priority field; we infer from title/detail text:
//   - GEG / Energiebera / "before LP" / energy → high
//   - "before awarding" / "vor Vergabe" / KfW → beforeAward
//   - "confirm" / "bestätigen" / Verfahrensfreiheit → confirm
//   - default → high
// ───────────────────────────────────────────────────────────────────────

import { rgb, type PDFPage } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PILL_CALC_BG,
  PILL_CALC_FG,
  PILL_CLIENT_BG,
  PILL_CLIENT_FG,
  PILL_LEGAL_BG,
  PILL_LEGAL_FG,
  drawCard,
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawMonoMeta,
  drawPaperBackground,
  drawPriorityPill,
  drawSafeText,
  drawWrappedText,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

// Accent colors per priority bucket (border-left stripe + pill ramp).
const ACCENT_AMBER = rgb(0.729, 0.459, 0.09)
const ACCENT_CLAY = rgb(0.494, 0.396, 0.282)
const ACCENT_GREEN = rgb(0.388, 0.6, 0.133)

// Light card fill (paper-tinted approximation of rgba(255,255,255,0.5)
// over the paper bg — pdf-lib alpha is unreliable cross-viewer, so we
// pre-mix into a static tone).
const CARD_FILL = rgb(0.973, 0.957, 0.91)

export type Priority = 'high' | 'beforeAward' | 'confirm'

export interface ExecutiveRec {
  title: string
  body: string
  sourceLabel?: string
  whenLabel?: string
  priority: Priority
}

export interface ExecutiveData {
  templateLabel: string
  bundeslandCode: string
  topThree: ReadonlyArray<ExecutiveRec>
}

export interface ExecutiveFooterData {
  docNo: string
  totalPages: number
  pageNumber: number
}

/**
 * Heuristic priority bucketer. Caller may also override via an
 * explicit field; this function is the fallback when no signal is
 * passed.
 */
export function inferPriority(title: string, body: string): Priority {
  const t = `${title} ${body}`.toLowerCase()
  if (
    /\bgeg\b|energiebera|\bbefore lp\b|\bvor lp\b|energieausweis|energy/i.test(
      t,
    )
  ) {
    return 'high'
  }
  if (/before awarding|vor vergabe|kfw\b|beg\b|bevor.*beauftrag/i.test(t)) {
    return 'beforeAward'
  }
  if (/verfahrensfrei|confirm|bestätig/i.test(t)) {
    return 'confirm'
  }
  return 'high'
}

const ACCENT_BY_PRIORITY: Record<Priority, ReturnType<typeof rgb>> = {
  high: ACCENT_AMBER,
  beforeAward: ACCENT_CLAY,
  confirm: ACCENT_GREEN,
}

const PILL_BG_BY_PRIORITY: Record<Priority, ReturnType<typeof rgb>> = {
  high: PILL_LEGAL_BG,
  beforeAward: PILL_CLIENT_BG,
  confirm: PILL_CALC_BG,
}

const PILL_FG_BY_PRIORITY: Record<Priority, ReturnType<typeof rgb>> = {
  high: PILL_LEGAL_FG,
  beforeAward: PILL_CLIENT_FG,
  confirm: PILL_CALC_FG,
}

export function renderExecutiveBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: ExecutiveData,
): void {
  drawPaperBackground(page)

  // Section header
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'exec.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'exec.title'),
    fonts,
  )
  // Right side: meta (template · state)
  const metaText = `${data.templateLabel}  ·  ${data.bundeslandCode}`
  drawMonoMeta(page, PAGE_WIDTH - MARGIN, headerY - 24, metaText, fonts, {
    align: 'right',
  })

  // Empty state
  if (data.topThree.length === 0) {
    drawSafeText(page, pdfStr(strings, 'exec.empty'), {
      x: MARGIN,
      y: PAGE_HEIGHT / 2,
      size: 12,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
    return
  }

  // Three priority cards
  const cardWidth = PAGE_WIDTH - 2 * MARGIN
  let cursor = headerY - 70
  const cards = data.topThree.slice(0, 3)
  cards.forEach((rec, idx) => {
    const accent = ACCENT_BY_PRIORITY[rec.priority]
    const pillBg = PILL_BG_BY_PRIORITY[rec.priority]
    const pillFg = PILL_FG_BY_PRIORITY[rec.priority]
    const priorityLabel = pdfStr(strings, `prio.${rec.priority}`)

    // Pre-compute body wrap to determine card height
    const bodyMaxWidth = cardWidth - 90
    // Card height: numeral row (32pt) + title row (22pt) + body
    // (~3 lines × 16pt = 48pt) + optional chip row (16pt) + padding 32pt
    let estimatedHeight = 22 + 28 + 48 + 16
    if (rec.sourceLabel || rec.whenLabel) estimatedHeight += 4

    // Draw card with left accent
    drawCard(page, {
      x: MARGIN,
      y: cursor,
      w: cardWidth,
      h: estimatedHeight,
      borderSide: 'left',
      borderColor: accent,
      borderWidth: 3,
      fillColor: CARD_FILL,
    })

    // Italic-serif numeral on the left
    const numText = `0${idx + 1}`
    drawSafeText(page, numText, {
      x: MARGIN + 18,
      y: cursor - 30,
      size: 28,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })

    // Title row
    const titleX = MARGIN + 60
    drawSafeText(page, rec.title, {
      x: titleX,
      y: cursor - 22,
      size: 14,
      font: fonts.sansMedium,
      color: INK,
      safe: fonts.safe,
    })
    const titleWidth = fonts.sansMedium.widthOfTextAtSize(
      fonts.safe(rec.title),
      14,
    )
    // v1.0.23 Bug P — same overflow-aware pill placement as
    // recommendations.ts. Measure the pill, check against page right
    // margin, wrap to a half-line below the title when it would
    // otherwise overflow. Prevents "HOHE PRIORITÄT" / "CONFIRM"
    // truncation observed on the v1.0.20 NRW + Berlin PDFs.
    const pillTextWidth = fonts.sansMedium.widthOfTextAtSize(
      fonts.safe(priorityLabel),
      10,
    )
    const pillTotalWidth = pillTextWidth + 16
    const inlinePillX = titleX + titleWidth + 10
    const pageRight = PAGE_WIDTH - MARGIN
    const fitsInline = inlinePillX + pillTotalWidth <= pageRight
    if (fitsInline) {
      drawPriorityPill(
        page,
        inlinePillX,
        cursor - 22,
        priorityLabel,
        { bg: pillBg, fg: pillFg, font: fonts.sansMedium, size: 10, safe: fonts.safe },
      )
    } else {
      drawPriorityPill(
        page,
        titleX,
        cursor - 40,
        priorityLabel,
        { bg: pillBg, fg: pillFg, font: fonts.sansMedium, size: 10, safe: fonts.safe },
      )
    }

    // Body wrapped
    const bodyEndY = drawWrappedText(
      page,
      titleX,
      cursor - 42,
      rec.body,
      {
        maxWidth: bodyMaxWidth,
        lineHeight: 16,
        font: fonts.sans,
        size: 12,
        color: INK,
        safe: fonts.safe,
      },
    )

    // Optional chip row
    if (rec.sourceLabel || rec.whenLabel) {
      let chipX = titleX
      const chipY = bodyEndY - 4
      if (rec.sourceLabel) {
        const chipText = `· ${rec.sourceLabel}`
        drawSafeText(page, chipText, {
          x: chipX,
          y: chipY,
          size: 11,
          font: fonts.sans,
          color: CLAY,
          safe: fonts.safe,
        })
        chipX +=
          fonts.sans.widthOfTextAtSize(fonts.safe(chipText), 11) + 18
      }
      if (rec.whenLabel) {
        const chipText = `· ${rec.whenLabel}`
        drawSafeText(page, chipText, {
          x: chipX,
          y: chipY,
          size: 11,
          font: fonts.sans,
          color: CLAY,
          safe: fonts.safe,
        })
      }
    }

    cursor -= estimatedHeight + 14
  })

  // Bottom italic CLAY footer note (above page footer)
  const footerNoteY = MARGIN + 70
  drawHairline(page, MARGIN, footerNoteY + 12, MARGIN + 80)
  const footerNoteRaw = pdfStr(strings, 'exec.footer')
  const footerNote = footerNoteRaw.replace(/\{state\}/g, data.bundeslandCode)
  drawWrappedText(page, MARGIN, footerNoteY, footerNote, {
    maxWidth: PAGE_WIDTH - 2 * MARGIN,
    lineHeight: 14,
    font: fonts.serifItalic,
    size: 11,
    color: CLAY,
    safe: fonts.safe,
  })
}

export function renderExecutiveFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: ExecutiveFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
