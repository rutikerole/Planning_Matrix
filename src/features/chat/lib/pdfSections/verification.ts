// ───────────────────────────────────────────────────────────────────────
// v1.0.17 — Verification page (Section 10 · status + signature).
//
// Final-page editorial layout: intro paragraph + 2-column status
// panel (verification status card + data-quality stacked bar) + 2x
// signature fields (architect + chamber stamp).
//
// Data-quality % is Hamilton largest-remainder from v1.0.10 Bug 21:
//   count facts by qualifier.quality (VERIFIED / CALCULATED /
//   ASSUMED), then largest-remainder round to 100%.
// ───────────────────────────────────────────────────────────────────────

import { rgb, type PDFPage } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PILL_ACTIVE,
  PILL_LEGAL_BG,
  PILL_PENDING,
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawPaperBackground,
  drawSafeText,
  drawSignatureField,
  drawStackedBar,
  drawWrappedText,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

export interface VerificationData {
  templateLabel: string
  bundeslandCode: string
  /** Counts of facts by qualifier.quality. */
  verifiedCount: number
  calculatedCount: number
  assumedCount: number
}

export interface VerificationFooterData {
  docNo: string
  totalPages: number
  pageNumber: number
}

/**
 * Hamilton largest-remainder: given fractional shares that sum to <1
 * due to floor rounding, distribute the leftover percentage points
 * to the largest remainders. Total always sums to exactly 100.
 */
function hamilton(counts: ReadonlyArray<number>): number[] {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return counts.map(() => 0)
  const raw = counts.map((c) => (c / total) * 100)
  const floored = raw.map(Math.floor)
  const sumFloored = floored.reduce((a, b) => a + b, 0)
  let leftover = 100 - sumFloored
  const remainders = raw.map((r, i) => ({ idx: i, rem: r - floored[i] }))
  remainders.sort((a, b) => b.rem - a.rem)
  const out = floored.slice()
  for (let i = 0; leftover > 0 && i < remainders.length; i++, leftover--) {
    out[remainders[i].idx]++
  }
  return out
}

export function renderVerificationBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: VerificationData,
): void {
  drawPaperBackground(page)
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'verif.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'verif.title'),
    fonts,
  )

  // Intro paragraph
  drawWrappedText(page, MARGIN, headerY - 70, pdfStr(strings, 'verif.sub'), {
    maxWidth: PAGE_WIDTH - 2 * MARGIN,
    lineHeight: 16,
    font: fonts.serifItalic,
    size: 12,
    color: CLAY,
    safe: fonts.safe,
  })

  // ─── 2-column status panel ─────────────────────────────────────
  const panelY = headerY - 130
  const panelHalfW = (PAGE_WIDTH - 2 * MARGIN - 24) / 2

  // Card 1 — VERIFICATION STATUS
  drawHairline(page, MARGIN, panelY + 2, MARGIN + 60, {
    color: INK,
    thickness: 1,
    opacity: 0.55,
  })
  drawSafeText(page, pdfStr(strings, 'verif.status.h'), {
    x: MARGIN,
    y: panelY - 18,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  drawWrappedText(
    page,
    MARGIN,
    panelY - 42,
    pdfStr(strings, 'verif.status.body'),
    {
      maxWidth: panelHalfW,
      lineHeight: 14,
      font: fonts.sans,
      size: 11,
      color: INK,
      safe: fonts.safe,
    },
  )

  // Card 2 — DATA QUALITY
  const card2X = MARGIN + panelHalfW + 24
  drawHairline(page, card2X, panelY + 2, card2X + 60, {
    color: INK,
    thickness: 1,
    opacity: 0.55,
  })
  drawSafeText(page, pdfStr(strings, 'verif.dq.h'), {
    x: card2X,
    y: panelY - 18,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  const counts = [data.verifiedCount, data.calculatedCount, data.assumedCount]
  const pct = hamilton(counts)
  const total = counts.reduce((a, b) => a + b, 0)
  const segments =
    total === 0
      ? [{ fraction: 1, color: rgb(0.92, 0.9, 0.84) }]
      : [
          { fraction: pct[0] / 100, color: PILL_ACTIVE },
          { fraction: pct[1] / 100, color: rgb(0.66, 0.78, 0.55) },
          { fraction: pct[2] / 100, color: PILL_PENDING },
        ]
  drawStackedBar(page, card2X, panelY - 50, panelHalfW, 14, segments)
  // Legend
  const legendY = panelY - 76
  const items = [
    {
      label: `${pct[0]}% ${pdfStr(strings, 'verif.dq.legend.verified')}`,
      color: PILL_ACTIVE,
    },
    {
      label: `${pct[1]}% ${pdfStr(strings, 'verif.dq.legend.calculated')}`,
      color: rgb(0.66, 0.78, 0.55),
    },
    {
      label: `${pct[2]}% ${pdfStr(strings, 'verif.dq.legend.assumed')}`,
      color: PILL_PENDING,
    },
  ]
  let legendX = card2X
  for (const item of items) {
    page.drawCircle({ x: legendX + 3, y: legendY + 3, size: 3, color: item.color })
    drawSafeText(page, item.label, {
      x: legendX + 12,
      y: legendY,
      size: 9,
      font: fonts.sans,
      color: CLAY,
      safe: fonts.safe,
    })
    const labelW = fonts.sans.widthOfTextAtSize(fonts.safe(item.label), 9)
    legendX += 12 + labelW + 12
  }

  // ─── Signature block ───────────────────────────────────────────
  const sigStartY = panelY - 140
  const sigHalfW = (PAGE_WIDTH - 2 * MARGIN - 40) / 2

  drawSignatureField(page, {
    x: MARGIN,
    y: sigStartY,
    width: sigHalfW,
    label: pdfStr(strings, 'sig.architect'),
    sublabel: pdfStr(strings, 'sig.date'),
    fonts,
  })
  drawSignatureField(page, {
    x: MARGIN + sigHalfW + 40,
    y: sigStartY,
    width: sigHalfW,
    label: pdfStr(strings, 'sig.chamber'),
    sublabel: pdfStr(strings, 'sig.date'),
    fonts,
  })

  // Silence unused — PILL_LEGAL_BG is part of the design system but
  // not used on this page; the reference keeps the bundle quiet.
  void PILL_LEGAL_BG
}

export function renderVerificationFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: VerificationFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
