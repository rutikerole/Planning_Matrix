// ───────────────────────────────────────────────────────────────────────
// v1.0.13 — Cover page renderer.
//
// Replaces the v1.0.6+ drawTitlePage with the approved prototype:
// 28×28 logo square + wordmark + tagline + right-aligned DOC NO /
// REVISION; centered editorial title with 60pt hairline + 3-column
// metadata grid (BUNDESLAND / TEMPLATE / CREATED); bottom CLAY
// hairline + 3-cell footer row (BAUHERR / PRELIMINARY / page X / Y).
//
// Pure renderer — no module state. Consumes pdfPrimitives helpers and
// resolved CoverData. Caller (exportPdf.ts) is responsible for adding
// the page to the document and computing CoverData.
//
// PAGE-NUMBER FINALIZATION: this renderer emits a "1 / ?" placeholder
// in the bottom-right footer cell. After all pages render, the
// assembly calls finalizePageFooters(...) to overwrite every page's
// footer with the real total. v1.0.13's TOC + cover share this
// finalize pass.
// ───────────────────────────────────────────────────────────────────────

import { rgb, type PDFPage } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PAPER,
  drawCoverTitle,
  drawHairline,
  drawKicker,
  drawLabelValue,
  drawMonoMeta,
  drawPaperBackground,
  type EditorialFonts,
} from '../pdfPrimitives'
import type { PdfStrings } from '../pdfStrings'
import { pdfStr } from '../pdfStrings'

export interface CoverData {
  projectTitle: string
  address: string
  bundeslandName: string
  templateLabel: string
  createdDate: string
  docNo: string
  revision: string
  bauherrName: string
  /** Total pages — pass 0 to emit the "1 / ?" placeholder, then
   *  finalizePageFooters rewrites it once the doc is fully built. */
  totalPages: number
}

export function renderCoverPage(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: CoverData,
): void {
  drawPaperBackground(page)

  // ─── Top header row ────────────────────────────────────────────
  // 28×28 INK square + 14×14 PAPER inset → renders as a "framed
  // empty" mark. Logo is the brand crest; sized 28×28 at top-left.
  const logoTopY = PAGE_HEIGHT - MARGIN
  page.drawRectangle({
    x: MARGIN,
    y: logoTopY - 28,
    width: 28,
    height: 28,
    color: INK,
  })
  page.drawRectangle({
    x: MARGIN + 7,
    y: logoTopY - 28 + 7,
    width: 14,
    height: 14,
    color: PAPER,
  })

  // Wordmark to the right of the logo.
  page.drawText(pdfStr(strings, 'cover.wordmark'), {
    x: MARGIN + 38,
    y: logoTopY - 10,
    size: 13,
    font: fonts.sansMedium,
    color: INK,
  })
  page.drawText(pdfStr(strings, 'cover.tagline'), {
    x: MARGIN + 38,
    y: logoTopY - 26,
    size: 11,
    font: fonts.sans,
    color: CLAY,
  })

  // Right-aligned DOC NO + REVISION mono meta.
  const docnoText = `${pdfStr(strings, 'cover.docnoLabel')} · ${data.docNo}`
  const revisionText = `${pdfStr(strings, 'cover.revisionLabel')} · ${data.revision}`
  drawMonoMeta(page, PAGE_WIDTH - MARGIN, logoTopY - 10, docnoText, fonts, {
    align: 'right',
  })
  drawMonoMeta(page, PAGE_WIDTH - MARGIN, logoTopY - 26, revisionText, fonts, {
    align: 'right',
  })

  // ─── Mid-page block ────────────────────────────────────────────
  const midY = 540
  drawKicker(page, MARGIN, midY, pdfStr(strings, 'cover.kicker'), fonts)
  drawCoverTitle(page, MARGIN, midY - 36, data.projectTitle, fonts)
  page.drawText(data.address, {
    x: MARGIN,
    y: midY - 56,
    size: 15,
    font: fonts.sans,
    color: INK,
  })

  // 60pt INK hairline below the address.
  page.drawLine({
    start: { x: MARGIN, y: midY - 78 },
    end: { x: MARGIN + 60, y: midY - 78 },
    color: INK,
    thickness: 1,
    opacity: 0.55,
  })

  // 3-column metadata grid (BUNDESLAND / TEMPLATE / CREATED).
  const gridTopY = midY - 110
  const colWidth = (PAGE_WIDTH - 2 * MARGIN) / 3
  drawLabelValue(
    page,
    MARGIN,
    gridTopY,
    pdfStr(strings, 'cover.bundeslandLabel'),
    data.bundeslandName,
    fonts,
  )
  drawLabelValue(
    page,
    MARGIN + colWidth,
    gridTopY,
    pdfStr(strings, 'cover.templateLabel'),
    data.templateLabel,
    fonts,
  )
  drawLabelValue(
    page,
    MARGIN + 2 * colWidth,
    gridTopY,
    pdfStr(strings, 'cover.createdLabel'),
    data.createdDate,
    fonts,
  )

  // ─── Bottom footer ─────────────────────────────────────────────
  drawHairline(page, MARGIN, MARGIN + 28, PAGE_WIDTH - MARGIN, { color: CLAY })

  const bauherrText = `${pdfStr(strings, 'cover.bauherrLabel')} · ${data.bauherrName}`
  const preliminaryText = pdfStr(strings, 'cover.preliminary')
  const pageText =
    data.totalPages > 0 ? `1 / ${data.totalPages}` : '1 / ?'

  page.drawText(bauherrText, {
    x: MARGIN,
    y: MARGIN + 14,
    size: 10,
    font: fonts.sans,
    color: CLAY,
  })
  const prelimWidth = fonts.sans.widthOfTextAtSize(preliminaryText, 10)
  page.drawText(preliminaryText, {
    x: (PAGE_WIDTH - prelimWidth) / 2,
    y: MARGIN + 14,
    size: 10,
    font: fonts.sans,
    color: CLAY,
  })
  const pageWidth = fonts.sans.widthOfTextAtSize(pageText, 10)
  page.drawText(pageText, {
    x: PAGE_WIDTH - MARGIN - pageWidth,
    y: MARGIN + 14,
    size: 10,
    font: fonts.sans,
    color: CLAY,
  })
}

/**
 * Derive a deterministic DOC NO from project.id + created_at.
 * Pattern: PM-YYYY-MMDD-<TITLE-INITIAL><LAST-2-OF-ID>
 *   e.g.   PM-2026-0512-K8C
 *
 * Stable across renders for the same project + date.
 */
export function deriveDocNo(
  projectId: string,
  createdAt: string,
  projectTitle: string,
): string {
  const d = new Date(createdAt)
  const yyyy = d.getUTCFullYear().toString()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const titleInitial =
    (projectTitle.match(/[A-Za-zÄÖÜäöü]/)?.[0] ?? 'P').toUpperCase()
  const idTail = projectId.replace(/-/g, '').slice(-2).toUpperCase()
  return `PM-${yyyy}-${mm}${dd}-${titleInitial}${idTail}`
}

/**
 * Format a date as "12 May 2026" (EN) / "12. Mai 2026" (DE).
 */
export function formatCoverDate(iso: string, lang: 'en' | 'de'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: lang === 'de' ? 'numeric' : '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Silence unused-import warnings for re-exports the caller may want.
void rgb
