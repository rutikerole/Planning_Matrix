// ───────────────────────────────────────────────────────────────────────
// v1.0.17 — Team & Stakeholders page (Section 07).
//
// Two sub-sections on one page. Specialists: list of resolved
// engineering disciplines (Tragwerksplanung / Energieberatung /
// Brandschutz / Vermessung) — or empty-state. Stakeholders: 2×2
// grid (Owner / Architect / Engineers / Building authority) with
// title + responsibility paragraph. Mirrors the v1.0.6 STAKEHOLDERS_PDF
// const that exportPdf.ts has, but lives in the editorial renderer
// and pulls labels from pdfStrings.
// ───────────────────────────────────────────────────────────────────────

import { type PDFPage } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PILL_ACTIVE,
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawPaperBackground,
  drawSafeText,
  drawWrappedText,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

export interface SpecialistRow {
  title: string
}

export interface TeamData {
  specialists: ReadonlyArray<SpecialistRow>
}

export interface TeamFooterData {
  docNo: string
  totalPages: number
  pageNumber: number
}

export function renderTeamBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: TeamData,
): void {
  drawPaperBackground(page)
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'team.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'team.title'),
    fonts,
  )

  let cursor = headerY - 70

  // ─── Specialists sub-section ───────────────────────────────────
  drawSafeText(page, pdfStr(strings, 'team.specialists.h'), {
    x: MARGIN,
    y: cursor,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  cursor -= 18
  if (data.specialists.length === 0) {
    drawSafeText(page, pdfStr(strings, 'team.specialists.empty'), {
      x: MARGIN,
      y: cursor,
      size: 11,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
    cursor -= 22
  } else {
    data.specialists.forEach((s) => {
      page.drawCircle({
        x: MARGIN + 3,
        y: cursor + 4,
        size: 1.5,
        color: PILL_ACTIVE,
      })
      drawSafeText(page, s.title, {
        x: MARGIN + 14,
        y: cursor,
        size: 11,
        font: fonts.sans,
        color: INK,
        safe: fonts.safe,
      })
      cursor -= 16
    })
    cursor -= 8
  }

  // Divider
  drawHairline(page, MARGIN, cursor, PAGE_WIDTH - MARGIN, {
    color: CLAY,
    thickness: 0.5,
    opacity: 0.4,
  })
  cursor -= 24

  // ─── Stakeholders 2×2 grid ─────────────────────────────────────
  drawSafeText(page, pdfStr(strings, 'team.stakeholders.h'), {
    x: MARGIN,
    y: cursor,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  cursor -= 22

  const cellW = (PAGE_WIDTH - 2 * MARGIN - 24) / 2
  const roles: Array<[string, string]> = [
    ['team.role.owner', 'team.role.owner.body'],
    ['team.role.architect', 'team.role.architect.body'],
    ['team.role.engineers', 'team.role.engineers.body'],
    ['team.role.authority', 'team.role.authority.body'],
  ]
  const rowHeight = 80
  roles.forEach(([titleKey, bodyKey], idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const cellX = MARGIN + col * (cellW + 24)
    const cellY = cursor - row * rowHeight
    drawSafeText(page, pdfStr(strings, titleKey), {
      x: cellX,
      y: cellY,
      size: 12,
      font: fonts.sansMedium,
      color: INK,
      safe: fonts.safe,
    })
    drawWrappedText(page, cellX, cellY - 16, pdfStr(strings, bodyKey), {
      maxWidth: cellW,
      lineHeight: 14,
      font: fonts.sans,
      size: 10,
      color: CLAY,
      safe: fonts.safe,
    })
  })
}

export function renderTeamFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: TeamFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
