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

import { type PDFPage } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawPaperBackground,
  drawQualifierPill,
  drawSafeText,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

export interface KeyDataRow {
  field: string
  value: string
  qualifier: { source: string; quality: string }
}

export interface KeyDataData {
  templateLabel: string
  bundeslandCode: string
  rows: ReadonlyArray<KeyDataRow>
}

export interface KeyDataFooterData {
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

  drawSafeText(page, pdfStr(strings, 'data.th.field'), {
    x: colFieldX,
    y: tableY,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  drawSafeText(page, pdfStr(strings, 'data.th.value'), {
    x: colValueX,
    y: tableY,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  drawSafeText(page, pdfStr(strings, 'data.th.qualifier'), {
    x: colQualX,
    y: tableY,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  drawHairline(page, tableX, tableY - 8, tableX + tableW, {
    color: INK,
    thickness: 0.5,
    opacity: 0.7,
  })

  let rowY = tableY - 26
  data.rows.forEach((row, idx) => {
    drawSafeText(page, row.field, {
      x: colFieldX,
      y: rowY,
      size: 11,
      font: fonts.sans,
      color: CLAY,
      safe: fonts.safe,
    })
    drawSafeText(page, row.value, {
      x: colValueX,
      y: rowY,
      size: 11,
      font: fonts.sansMedium,
      color: INK,
      safe: fonts.safe,
    })
    drawQualifierPill(page, colQualX, rowY, {
      source: row.qualifier.source,
      quality: row.qualifier.quality,
      font: fonts.sansMedium,
      safe: fonts.safe,
    })
    rowY -= 22
    if (idx < data.rows.length - 1) {
      drawHairline(page, tableX, rowY + 8, tableX + tableW, {
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
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
