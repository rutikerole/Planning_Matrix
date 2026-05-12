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
// v1.0.14 Bug 28 — Path A split. The cover body no longer draws its
// own footer. The assembly calls renderCoverFooter(...) AFTER total
// page count is known so no placeholder is ever drawn (v1.0.13's
// placeholder-then-mask approach left visible residue above the
// mask rectangle).
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
  drawSafeText,
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
  /** Total pages — surfaced separately to renderCoverFooter; the body
   *  no longer carries page-number copy. v1.0.13 used this field for
   *  an unresolved-total placeholder that v1.0.14 retired (Path A). */
  totalPages: number
  /** v1.0.18 Feature 2 — composite confidence 0..100. Displayed as
   *  4th column in metadata grid. */
  confidencePercent: number
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
  drawSafeText(page, pdfStr(strings, 'cover.wordmark'), {
    x: MARGIN + 38,
    y: logoTopY - 10,
    size: 13,
    font: fonts.sansMedium,
    color: INK,
    safe: fonts.safe,
  })
  drawSafeText(page, pdfStr(strings, 'cover.tagline'), {
    x: MARGIN + 38,
    y: logoTopY - 26,
    size: 11,
    font: fonts.sans,
    color: CLAY,
    safe: fonts.safe,
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
  drawSafeText(page, data.address, {
    x: MARGIN,
    y: midY - 56,
    size: 15,
    font: fonts.sans,
    color: INK,
    safe: fonts.safe,
  })

  // 60pt INK hairline below the address.
  page.drawLine({
    start: { x: MARGIN, y: midY - 78 },
    end: { x: MARGIN + 60, y: midY - 78 },
    color: INK,
    thickness: 1,
    opacity: 0.55,
  })

  // v1.0.18 Feature 2 — 4-column metadata grid (BUNDESLAND /
  // TEMPLATE / CREATED / CONFIDENCE). Previously 3-column; the
  // 4th cell surfaces the composite confidence score so the
  // bauherr knows the deliverable's signal strength at a glance.
  const gridTopY = midY - 110
  const colWidth = (PAGE_WIDTH - 2 * MARGIN) / 4
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
  drawLabelValue(
    page,
    MARGIN + 3 * colWidth,
    gridTopY,
    pdfStr(strings, 'cover.confidenceLabel'),
    `${data.confidencePercent}%`,
    fonts,
  )

  // v1.0.14 Bug 28 fix — footer is NOT drawn here. Footer is drawn
  // by renderCoverFooter AFTER total page count is known, so the
  // page never carries an unresolved-total placeholder that
  // v1.0.13's mask helper couldn't fully erase (resolved total was
  // drawn over the placeholder but the placeholder's top edge
  // remained visible above the mask rectangle).
}

/**
 * v1.0.14 Bug 28 fix — Path A split. Renders the cover page footer
 * AFTER the assembly knows the resolved total page count, so no
 * placeholder is ever drawn. Called from buildExportPdf once the
 * document is fully assembled.
 */
/**
 * v1.0.18 Feature 1 — draws the project QR code on the cover.
 * Caller (exportPdf assembly) embeds the PNG via doc.embedPng
 * (async) and passes the PDFImage handle here. Renderer stays
 * synchronous. Position: above the bottom footer row, right side
 * of the page.
 */
export function renderCoverQr(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  image: import('pdf-lib').PDFImage,
): void {
  const size = 64
  const x = PAGE_WIDTH - MARGIN - size
  const y = MARGIN + 80
  page.drawImage(image, { x, y, width: size, height: size })
  // 9pt CLAY label above the QR.
  const label = pdfStr(strings, 'cover.qrLabel')
  const labelWidth = fonts.sans.widthOfTextAtSize(fonts.safe(label), 9)
  drawSafeText(page, label, {
    x: x + size - labelWidth,
    y: y + size + 8,
    size: 9,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
}

export function renderCoverFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: {
    bauherrName: string
    totalPages: number
    /** v1.0.18 Feature 4 — pre-formatted expiry date in locale. */
    validUntilLabel?: string
  },
): void {
  drawHairline(page, MARGIN, MARGIN + 28, PAGE_WIDTH - MARGIN, { color: CLAY })

  const bauherrText = `${pdfStr(strings, 'cover.bauherrLabel')} · ${data.bauherrName}`
  const preliminaryText = pdfStr(strings, 'cover.preliminary')
  const pageText = `1 / ${data.totalPages}`

  // Pre-sanitize ONLY for width measurement. drawSafeText re-applies
  // fonts.safe internally (idempotent) so the rendered string is
  // consistent with the measured width.
  const preliminaryWidth = fonts.sans.widthOfTextAtSize(
    fonts.safe(preliminaryText),
    10,
  )
  const pageWidth = fonts.sans.widthOfTextAtSize(fonts.safe(pageText), 10)

  drawSafeText(page, bauherrText, {
    x: MARGIN,
    y: MARGIN + 14,
    size: 10,
    font: fonts.sans,
    color: CLAY,
    safe: fonts.safe,
  })
  drawSafeText(page, preliminaryText, {
    x: (PAGE_WIDTH - preliminaryWidth) / 2,
    y: MARGIN + 14,
    size: 10,
    font: fonts.sans,
    color: CLAY,
    safe: fonts.safe,
  })
  drawSafeText(page, pageText, {
    x: PAGE_WIDTH - MARGIN - pageWidth,
    y: MARGIN + 14,
    size: 10,
    font: fonts.sans,
    color: CLAY,
    safe: fonts.safe,
  })

  // v1.0.18 Feature 4 — validity stamp below the preliminary line.
  // Centered, same mono 10pt CLAY style. Substitutes {date} with the
  // pre-formatted per-locale expiry from BuildArgs.
  if (data.validUntilLabel) {
    const validityRaw = pdfStr(strings, 'cover.validity.template')
    const validityText = validityRaw.replace(/\{date\}/g, data.validUntilLabel)
    const validityWidth = fonts.sans.widthOfTextAtSize(
      fonts.safe(validityText),
      9,
    )
    drawSafeText(page, validityText, {
      x: (PAGE_WIDTH - validityWidth) / 2,
      y: MARGIN - 2,
      size: 9,
      font: fonts.sans,
      color: CLAY,
      safe: fonts.safe,
    })
  }
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
