// ───────────────────────────────────────────────────────────────────────
// v1.0.17 — Recommendations page (Section 08 · all recs prioritised).
//
// Replaces the v1.0.6 plain-text VIII RECOMMENDATIONS schedule
// section with an editorial layout. Renders ALL recommendations
// (not just top 3 — Executive page already covers highlight reel)
// stacked at higher density: italic-serif numeral 18pt + Inter
// Medium title + priority pill + wrapped body + CLAY italic-serif
// qualifier line (formatQualifier-normalized).
//
// Path-A 2-pass footer split (renderRecsFooter post-page-count).
// ───────────────────────────────────────────────────────────────────────

import { type PDFPage } from 'pdf-lib'
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
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawPaperBackground,
  drawPriorityPill,
  drawSafeText,
  drawWrappedText,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'
import type { Priority } from './executive'

export interface RecRow {
  title: string
  body: string
  /** Pre-formatted via formatQualifier (DESIGNER+ASSUMED → LEGAL · CALCULATED). */
  qualifierLabel: string
  priority: Priority
}

export interface RecsData {
  templateLabel: string
  bundeslandCode: string
  rows: ReadonlyArray<RecRow>
}

export interface RecsFooterData {
  docNo: string
  totalPages: number
  pageNumber: number
}

const PILL_BG_BY_PRIORITY: Record<Priority, ReturnType<typeof rgbStub>> = {
  high: PILL_LEGAL_BG,
  beforeAward: PILL_CLIENT_BG,
  confirm: PILL_CALC_BG,
}
const PILL_FG_BY_PRIORITY: Record<Priority, ReturnType<typeof rgbStub>> = {
  high: PILL_LEGAL_FG,
  beforeAward: PILL_CLIENT_FG,
  confirm: PILL_CALC_FG,
}
function rgbStub(): import('pdf-lib').RGB {
  return PILL_LEGAL_BG
}

export function renderRecsBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: RecsData,
): void {
  drawPaperBackground(page)
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'recs.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'recs.title'),
    fonts,
  )

  if (data.rows.length === 0) {
    drawSafeText(page, pdfStr(strings, 'recs.empty'), {
      x: MARGIN,
      y: PAGE_HEIGHT / 2,
      size: 12,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
    return
  }

  let cursor = headerY - 70
  const bodyMaxWidth = PAGE_WIDTH - 2 * MARGIN - 40
  data.rows.forEach((rec, idx) => {
    const num = `0${idx + 1}`.slice(-2)
    drawSafeText(page, num, {
      x: MARGIN,
      y: cursor - 14,
      size: 18,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
    const titleX = MARGIN + 36
    drawSafeText(page, rec.title, {
      x: titleX,
      y: cursor - 8,
      size: 13,
      font: fonts.sansMedium,
      color: INK,
      safe: fonts.safe,
    })
    const titleWidth = fonts.sansMedium.widthOfTextAtSize(
      fonts.safe(rec.title),
      13,
    )
    // v1.0.23 Bug P — pill width measurement + overflow wrap. v1.0.20
    // pinned the pill at titleX + titleWidth + 10 and clipped when
    // the combined width exceeded the page right margin — "HOHE
    // PRIORITÄT" (DE) regularly overflowed the inner-text bounding
    // box on long titles and rendered as "HOHE PRIORI" in the
    // extracted text. v1.0.23 measures the pill text, checks for
    // overflow against PAGE_WIDTH - MARGIN, and either pins inline
    // (no overflow) or wraps the pill down a half-line so the full
    // label always fits.
    const priorityLabel = pdfStr(strings, `prio.${rec.priority}`)
    const pillTextWidth = fonts.sansMedium.widthOfTextAtSize(
      fonts.safe(priorityLabel),
      9,
    )
    const pillTotalWidth = pillTextWidth + 16
    const inlinePillX = titleX + titleWidth + 10
    const pageRight = PAGE_WIDTH - MARGIN
    const fitsInline = inlinePillX + pillTotalWidth <= pageRight
    let bodyOffsetY = 0
    if (fitsInline) {
      drawPriorityPill(
        page,
        inlinePillX,
        cursor - 8,
        priorityLabel,
        {
          bg: PILL_BG_BY_PRIORITY[rec.priority],
          fg: PILL_FG_BY_PRIORITY[rec.priority],
          font: fonts.sansMedium,
          size: 9,
          safe: fonts.safe,
        },
      )
    } else {
      drawPriorityPill(
        page,
        titleX,
        cursor - 22,
        priorityLabel,
        {
          bg: PILL_BG_BY_PRIORITY[rec.priority],
          fg: PILL_FG_BY_PRIORITY[rec.priority],
          font: fonts.sansMedium,
          size: 9,
          safe: fonts.safe,
        },
      )
      bodyOffsetY = 18
    }
    const bodyEndY = drawWrappedText(page, titleX, cursor - 26 - bodyOffsetY, rec.body, {
      maxWidth: bodyMaxWidth,
      lineHeight: 14,
      font: fonts.sans,
      size: 11,
      color: INK,
      safe: fonts.safe,
    })
    // Qualifier line
    drawSafeText(page, `· ${rec.qualifierLabel}`, {
      x: titleX,
      y: bodyEndY - 2,
      size: 10,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
    cursor = bodyEndY - 22
    if (idx < data.rows.length - 1) {
      drawHairline(page, MARGIN, cursor + 8, PAGE_WIDTH - MARGIN, {
        color: CLAY,
        thickness: 0.4,
        opacity: 0.3,
      })
    }
  })
}

export function renderRecsFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: RecsFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
