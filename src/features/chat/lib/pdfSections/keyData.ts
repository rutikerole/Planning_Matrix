// ───────────────────────────────────────────────────────────────────────
// v1.0.17 — Key Data page (Section 09 · qualifier table).
//
// Replaces the v1.0.6 plain-text IX KEY DATA schedule section with
// an editorial 3-column table: FIELD / VALUE / QUALIFIER. Qualifier
// renders as a color-coded pill via drawQualifierPill (CLIENT=blue,
// LEGAL CALCULATED=light green, LEGAL VERIFIED=deep green, LEGAL
// ASSUMED=amber, DESIGNER=outline, AUTHORITY=deep blue).
//
// Data: state.facts converted by exportPdf assembly into KeyDataRow
// shape (field label localized, value stringified, qualifier raw).
// ───────────────────────────────────────────────────────────────────────

import { type PDFDocument, type PDFPage } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  addLinkAnnotation,
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawPaperBackground,
  drawQualifierPill,
  drawSafeText,
  ellipsizeToWidth,
  getQualifierLabel,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'
import { findCitations } from '../pdfCitations'

export interface KeyDataRow {
  field: string
  value: string
  qualifier: { source: string; quality: string }
}

export interface KeyDataData {
  templateLabel: string
  bundeslandCode: string
  rows: ReadonlyArray<KeyDataRow>
  /** v1.0.18 Feature 3 — PDFDocument needed to register link
   *  annotations on detected § citations in value column. */
  doc?: PDFDocument
}

export interface KeyDataFooterData {
  /** v1.0.32 Bug 111 — verified|preliminary footer center, set by exportPdf. */
  footerCenter?: string
  docNo: string
  totalPages: number
  pageNumber: number
}

export function renderKeyDataBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: KeyDataData,
): void {
  drawPaperBackground(page)
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'data.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'data.title'),
    fonts,
  )

  if (data.rows.length === 0) {
    drawSafeText(page, pdfStr(strings, 'data.empty'), {
      x: MARGIN,
      y: PAGE_HEIGHT / 2,
      size: 12,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
    return
  }

  // 3-column header
  const tableX = MARGIN
  const tableY = headerY - 80
  const tableW = PAGE_WIDTH - 2 * MARGIN
  const colFieldW = tableW * 0.4
  const colValueW = tableW * 0.35
  const colFieldX = tableX
  const colValueX = tableX + colFieldW
  const colQualX = tableX + colFieldW + colValueW

  const drawColumnHeaderRow = (p: PDFPage, atY: number): void => {
    drawSafeText(p, pdfStr(strings, 'data.th.field'), {
      x: colFieldX,
      y: atY,
      size: 10,
      font: fonts.sansMedium,
      color: CLAY,
      safe: fonts.safe,
    })
    drawSafeText(p, pdfStr(strings, 'data.th.value'), {
      x: colValueX,
      y: atY,
      size: 10,
      font: fonts.sansMedium,
      color: CLAY,
      safe: fonts.safe,
    })
    drawSafeText(p, pdfStr(strings, 'data.th.qualifier'), {
      x: colQualX,
      y: atY,
      size: 10,
      font: fonts.sansMedium,
      color: CLAY,
      safe: fonts.safe,
    })
    drawHairline(p, tableX, atY - 8, tableX + tableW, {
      color: INK,
      thickness: 0.5,
      opacity: 0.7,
    })
  }
  drawColumnHeaderRow(page, tableY)

  // v1.0.34 Bug 78 — paginate when rows approach the footer band. The v1.0.17
  // loop was a flat forEach with no addPage/bottom-margin guard, so a table
  // taller than one page (T-02/T-04/T-08 rich-fact cells, > ~17 rows) drew rows
  // off-page into the footer. Now: when the next row would cross PAGE_FLOOR and
  // a PDFDocument is available, start a fresh page, repeat the column header,
  // and continue. For tables that fit one page (every demo cell, ≤ ~17 rows)
  // the guard never fires and the output is byte-identical. Overflow pages are
  // NOT in exportPdf's editorialPages set, so they receive the standard
  // continuation footer; verification/glossary page numbers shift automatically
  // because exportPdf reads getPageCount() after this body renders.
  const PAGE_FLOOR = MARGIN + 60
  let currentPage = page

  let rowY = tableY - 26
  // v1.0.18 Bug 37 — keep the qualifier pill clear of the value
  // text. v1.0.17 pinned pill at colQualX (the field+value column
  // boundary), causing collisions when value text overflowed.
  // Now: measure value width; pill x = max(colQualX,
  // colValueX + valueWidth + MIN_GAP). If pill would overflow the
  // page right margin, fall back to wrapping the value on the next
  // line and pinning the pill at colQualX.
  const MIN_GAP = 12
  const pageRight = tableX + tableW
  data.rows.forEach((row, idx) => {
    if (rowY < PAGE_FLOOR && data.doc) {
      currentPage = data.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      drawPaperBackground(currentPage)
      const contHeaderY = PAGE_HEIGHT - MARGIN - 30
      drawColumnHeaderRow(currentPage, contHeaderY)
      rowY = contHeaderY - 26
    }
    drawSafeText(currentPage, row.field, {
      x: colFieldX,
      y: rowY,
      size: 11,
      font: fonts.sans,
      color: CLAY,
      safe: fonts.safe,
    })
    // v1.0.30 Bug 106 — clamp the value to the page edge so long values
    // ("Gastronomie — Café/Bistro, ~40 Sitzplätze … Öffnungszeiten bis 23:00")
    // no longer overflow off the right page margin. ellipsizeToWidth is a
    // no-op for values that already fit, so the T-01 matrix is unaffected.
    const drawnValue = ellipsizeToWidth(
      row.value,
      fonts.sansMedium,
      11,
      pageRight - colValueX,
      fonts.safe,
    )
    drawSafeText(currentPage, drawnValue, {
      x: colValueX,
      y: rowY,
      size: 11,
      font: fonts.sansMedium,
      color: INK,
      safe: fonts.safe,
    })

    // v1.0.18 Feature 3 — overlay link annotations on any § citation
    // inside the value. Skipped when caller didn't pass doc (the
    // annotation requires the PDFDocument's context).
    if (data.doc) {
      const citations = findCitations(drawnValue, data.bundeslandCode)
      for (const cite of citations) {
        if (!cite.url) continue
        addLinkAnnotation({
          doc: data.doc,
          page: currentPage,
          x: colValueX,
          y: rowY,
          text: drawnValue,
          linkText: cite.text,
          linkIndex: cite.start,
          font: fonts.sansMedium,
          size: 11,
          uri: cite.url,
          safe: fonts.safe,
        })
      }
    }

    const valueWidth = fonts.sansMedium.widthOfTextAtSize(
      fonts.safe(drawnValue),
      11,
    )
    const proposedPillX = Math.max(colQualX, colValueX + valueWidth + MIN_GAP)
    // Estimate pill width to know if it fits before the page right
    // edge. drawQualifierPill returns its consumed width; here we
    // approximate via text-width + padX*2 + small fudge.
    // v1.0.20 — width estimation now uses the localized label so
    // overflow detection works in both locales.
    const pillTextWidth = fonts.sansMedium.widthOfTextAtSize(
      getQualifierLabel(row.qualifier.source, row.qualifier.quality, strings),
      9,
    )
    const pillWidth = pillTextWidth + 12
    if (proposedPillX + pillWidth <= pageRight) {
      drawQualifierPill(currentPage, proposedPillX, rowY, {
        source: row.qualifier.source,
        quality: row.qualifier.quality,
        font: fonts.sansMedium,
        safe: fonts.safe,
        strings,
      })
      rowY -= 22
    } else {
      // Value too long — wrap pill to next line, left-anchored to
      // the value column so the field/value/pill still align.
      drawQualifierPill(currentPage, colValueX, rowY - 16, {
        source: row.qualifier.source,
        quality: row.qualifier.quality,
        font: fonts.sansMedium,
        safe: fonts.safe,
        strings,
      })
      rowY -= 36
    }
    if (idx < data.rows.length - 1) {
      drawHairline(currentPage, tableX, rowY + 8, tableX + tableW, {
        color: CLAY,
        thickness: 0.4,
        opacity: 0.3,
      })
    }
  })
}

export function renderKeyDataFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: KeyDataFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: data.footerCenter ?? pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
