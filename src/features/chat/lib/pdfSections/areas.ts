// ───────────────────────────────────────────────────────────────────────
// v1.0.15 — Areas page (Section 02 · A · B · C status).
//
// Three legal-area cards stacked on a single page:
//   - A · Planungsrecht       (planning law)
//   - B · Bauordnungsrecht    (building-code law)
//   - C · Sonstige Vorgaben   (other requirements — energy/listed/etc.)
//
// Each card has a circular A/B/C badge filled in the state color
// (ACTIVE=green, PENDING=amber, VOID=red), an INK title, a status
// pill, and an italic-serif CLAY reason paragraph. Top-right of the
// section shows a 3-item legend mapping color → status label.
//
// Pure renderer matching the cover/toc split: renderAreasBody draws
// the page contents, renderAreasFooter draws the page-numbered footer
// after the assembly has resolved the total page count.
// ───────────────────────────────────────────────────────────────────────

import { type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PILL_ACTIVE,
  PILL_CALC_BG,
  PILL_CALC_FG,
  PILL_LEGAL_BG,
  PILL_LEGAL_FG,
  PILL_PENDING,
  PILL_VOID,
  drawCard,
  drawCircularBadge,
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawMonoMeta,
  drawPaperBackground,
  drawPriorityPill,
  drawStatusLegend,
  drawWrappedText,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'
import type { AreaState } from '@/types/projectState'

// Pill bg/fg ramps reused from executive — neutral light backgrounds
// keep the status pill readable on the paper-tinted card fill.
const PILL_BG_BY_STATE: Record<AreaState, RGB> = {
  ACTIVE: PILL_CALC_BG,
  PENDING: PILL_LEGAL_BG,
  VOID: PILL_LEGAL_BG,
}

const PILL_FG_BY_STATE: Record<AreaState, RGB> = {
  ACTIVE: PILL_CALC_FG,
  PENDING: PILL_LEGAL_FG,
  VOID: PILL_VOID,
}

const BADGE_COLOR_BY_STATE: Record<AreaState, RGB> = {
  ACTIVE: PILL_ACTIVE,
  PENDING: PILL_PENDING,
  VOID: PILL_VOID,
}

export interface AreaRow {
  key: 'A' | 'B' | 'C'
  title: string
  state: AreaState
  reason?: string
}

export interface AreasData {
  templateLabel: string
  bundeslandCode: string
  rows: ReadonlyArray<AreaRow>
}

export interface AreasFooterData {
  docNo: string
  totalPages: number
  pageNumber: number
}

export function renderAreasBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: AreasData,
): void {
  drawPaperBackground(page)

  // ─── Header row ────────────────────────────────────────────────
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'areas.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'areas.title'),
    fonts,
  )
  // Right-side meta (template · bundesland)
  const metaText = `${data.templateLabel}  ·  ${data.bundeslandCode}`
  drawMonoMeta(page, PAGE_WIDTH - MARGIN, headerY - 24, metaText, fonts, {
    align: 'right',
  })

  // Status legend right-anchored under the meta line
  drawStatusLegend(
    page,
    PAGE_WIDTH - MARGIN,
    headerY - 50,
    [
      { color: PILL_ACTIVE, label: pdfStr(strings, 'areas.legend.active') },
      { color: PILL_PENDING, label: pdfStr(strings, 'areas.legend.pending') },
      { color: PILL_VOID, label: pdfStr(strings, 'areas.legend.void') },
    ],
    fonts,
  )

  // Empty state
  if (data.rows.length === 0) {
    page.drawText(pdfStr(strings, 'areas.empty'), {
      x: MARGIN,
      y: PAGE_HEIGHT / 2,
      size: 12,
      font: fonts.serifItalic,
      color: CLAY,
    })
    return
  }

  // ─── Three A · B · C cards ─────────────────────────────────────
  const cardWidth = PAGE_WIDTH - 2 * MARGIN
  let cursor = headerY - 80
  data.rows.slice(0, 3).forEach((row) => {
    const badgeColor = BADGE_COLOR_BY_STATE[row.state]
    const pillBg = PILL_BG_BY_STATE[row.state]
    const pillFg = PILL_FG_BY_STATE[row.state]
    const statusLabel = pdfStr(strings, `areas.status.${row.state.toLowerCase()}`)
    const reason = row.reason ?? ''

    // Estimate height: title row 28 + reason ~2 lines × 14 + pad 36
    const reasonLines = estimateLineCount(reason, fonts.serifItalic, 11, cardWidth - 88)
    const reasonBlockH = Math.max(1, reasonLines) * 14
    const estimatedHeight = 28 + reasonBlockH + 36

    // Card outline (full thin border in CLAY)
    drawCard(page, {
      x: MARGIN,
      y: cursor,
      w: cardWidth,
      h: estimatedHeight,
      borderSide: 'full',
      borderColor: CLAY,
      borderWidth: 0.5,
      fillColor: null,
    })

    // Circular badge — radius 14, centered vertically near the top
    const badgeCx = MARGIN + 28
    const badgeCy = cursor - 26
    drawCircularBadge(page, badgeCx, badgeCy, 14, row.key, {
      fillColor: badgeColor,
      textColor: row.state === 'VOID' ? PILL_LEGAL_BG : INK,
      font: fonts.sansMedium,
      size: 14,
    })

    // Title to the right of the badge
    const titleX = MARGIN + 56
    page.drawText(row.title, {
      x: titleX,
      y: cursor - 22,
      size: 14,
      font: fonts.sansMedium,
      color: INK,
    })
    const titleWidth = fonts.sansMedium.widthOfTextAtSize(row.title, 14)

    // Status pill
    drawPriorityPill(page, titleX + titleWidth + 12, cursor - 22, statusLabel, {
      bg: pillBg,
      fg: pillFg,
      font: fonts.sansMedium,
      size: 10,
    })

    // Reason paragraph — italic-serif CLAY, wrapped
    if (reason) {
      drawWrappedText(page, titleX, cursor - 42, reason, {
        maxWidth: cardWidth - 88,
        lineHeight: 14,
        font: fonts.serifItalic,
        size: 11,
        color: CLAY,
      })
    }

    cursor -= estimatedHeight + 14
  })

  // Bottom italic CLAY note
  const footerNoteY = MARGIN + 60
  drawHairline(page, MARGIN, footerNoteY + 12, MARGIN + 80)
  drawWrappedText(
    page,
    MARGIN,
    footerNoteY,
    pdfStr(strings, 'footer.preliminary'),
    {
      maxWidth: PAGE_WIDTH - 2 * MARGIN,
      lineHeight: 14,
      font: fonts.serifItalic,
      size: 11,
      color: CLAY,
    },
  )
}

export function renderAreasFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: AreasFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}

/**
 * Estimate how many wrapped lines `text` will occupy at the given
 * width, mirroring drawWrappedText's word-break algorithm. Used to
 * size the area cards before they're drawn.
 */
function estimateLineCount(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): number {
  if (!text) return 0
  const words = text.split(/\s+/)
  let line = ''
  let lines = 0
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    const w = font.widthOfTextAtSize(candidate, size)
    if (w > maxWidth && line) {
      lines += 1
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines += 1
  return lines
}
