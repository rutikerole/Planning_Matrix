// ───────────────────────────────────────────────────────────────────────
// v1.0.17 — Procedures + Documents page (Sections 05 + 06).
//
// One page, two sub-sections (matches the v1.0.6 plain-text layout
// where both fit on a single page). Procedures: drawSectionHeader +
// per-procedure card with required/optional/exempt badge + body +
// CLAY qualifier line. Documents: drawSectionHeader + list of
// document names, or empty-state placeholder.
// ───────────────────────────────────────────────────────────────────────

import { type PDFPage } from 'pdf-lib'
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
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawPaperBackground,
  drawPriorityPill,
  drawSafeText,
  drawWrappedText,
  formatQualifier,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

export type ProcStatus = 'required' | 'optional' | 'exempt'

export interface ProcRow {
  title: string
  body: string
  status: ProcStatus
  qualifier: { source: string; quality: string }
}

export interface DocRow {
  title: string
}

export interface ProceduresData {
  templateLabel: string
  bundeslandCode: string
  procedures: ReadonlyArray<ProcRow>
  documents: ReadonlyArray<DocRow>
}

export interface ProceduresFooterData {
  docNo: string
  totalPages: number
  pageNumber: number
}

export function renderProceduresBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: ProceduresData,
): void {
  drawPaperBackground(page)

  // ─── Procedures section ────────────────────────────────────────
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'proc.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'proc.title'),
    fonts,
  )

  let cursor = headerY - 70
  if (data.procedures.length === 0) {
    drawSafeText(page, pdfStr(strings, 'proc.empty'), {
      x: MARGIN,
      y: cursor,
      size: 12,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
    cursor -= 30
  } else {
    const bodyMaxWidth = PAGE_WIDTH - 2 * MARGIN
    data.procedures.forEach((proc) => {
      const statusLabel = pdfStr(strings, `proc.status.${proc.status}`)
      drawSafeText(page, proc.title, {
        x: MARGIN,
        y: cursor,
        size: 13,
        font: fonts.sansMedium,
        color: INK,
        safe: fonts.safe,
      })
      const titleW = fonts.sansMedium.widthOfTextAtSize(
        fonts.safe(proc.title),
        13,
      )
      const bg = proc.status === 'required' ? PILL_LEGAL_BG : PILL_CALC_BG
      const fg = proc.status === 'required' ? PILL_LEGAL_FG : PILL_CALC_FG
      drawPriorityPill(page, MARGIN + titleW + 10, cursor, statusLabel, {
        bg,
        fg,
        font: fonts.sansMedium,
        size: 10,
        safe: fonts.safe,
      })
      const bodyEndY = drawWrappedText(page, MARGIN, cursor - 18, proc.body, {
        maxWidth: bodyMaxWidth,
        lineHeight: 14,
        font: fonts.sans,
        size: 11,
        color: INK,
        safe: fonts.safe,
      })
      drawSafeText(page, `· ${formatQualifier(proc.qualifier)}`, {
        x: MARGIN,
        y: bodyEndY - 2,
        size: 10,
        font: fonts.serifItalic,
        color: CLAY,
        safe: fonts.safe,
      })
      cursor = bodyEndY - 24
    })
  }

  // Divider before Documents
  drawHairline(page, MARGIN, cursor + 8, PAGE_WIDTH - MARGIN, {
    color: CLAY,
    thickness: 0.5,
    opacity: 0.4,
  })
  cursor -= 12

  // ─── Documents section ─────────────────────────────────────────
  drawKicker(page, MARGIN, cursor, pdfStr(strings, 'docs.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    cursor - 32,
    pdfStr(strings, 'docs.title'),
    fonts,
  )
  cursor -= 70

  if (data.documents.length === 0) {
    drawSafeText(page, pdfStr(strings, 'docs.empty'), {
      x: MARGIN,
      y: cursor,
      size: 12,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
  } else {
    data.documents.forEach((doc) => {
      // Bullet
      page.drawCircle({
        x: MARGIN + 3,
        y: cursor + 4,
        size: 1.5,
        color: PILL_ACTIVE,
      })
      drawSafeText(page, doc.title, {
        x: MARGIN + 14,
        y: cursor,
        size: 11,
        font: fonts.sans,
        color: INK,
        safe: fonts.safe,
      })
      cursor -= 18
    })
  }
}

export function renderProceduresFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: ProceduresFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
