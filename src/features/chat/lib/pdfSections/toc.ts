// ───────────────────────────────────────────────────────────────────────
// v1.0.13 — Table-of-contents page renderer.
//
// Renders the 11-entry contents page matching the approved prototype:
// kicker + 26pt italic-serif title + 11 TOC lines (monospace numeral +
// Inter Regular title + dotted leader + tabular page reference) +
// standard footer.
//
// PAGE NUMBER STRATEGY: v1.0.13's body renders the v1.0.6+ pages
// (drawTop3Page / drawBereichePage / drawCostsPage / drawTimelinePage
// + inline procedures/documents/team/recommendations/keyData/audit).
// The TocData.pageNumbers field is supplied by the assembly with the
// best-effort page-index map. Sections not yet present in the body
// (verification, glossary) point at the last-known body page so the
// TOC ALWAYS renders with 11 entries — v1.0.14+ will replace those
// approximations with real pages.
// ───────────────────────────────────────────────────────────────────────

import { type PDFPage } from 'pdf-lib'
import {
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawFooter,
  drawHairline,
  drawKicker,
  drawEditorialTitle,
  drawPaperBackground,
  drawTocLine,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

export interface TocData {
  /** Per-section page index in the final PDF. */
  pageNumbers: {
    executive: number
    areas: number
    costs: number
    timeline: number
    procedures: number
    documents: number
    team: number
    recommendations: number
    keyData: number
    verification: number
    glossary: number
  }
  /** Cover-derived DOC NO; surfaced in the footer. */
  docNo: string
  /** Total pages; 0 → "?" placeholder for finalize pass. */
  totalPages: number
  /** TOC page number (typically 2). */
  tocPageNumber: number
}

export function renderTocPage(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: TocData,
): void {
  drawPaperBackground(page)

  // Section header (kicker + editorial title).
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'toc.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'toc.title'),
    fonts,
  )

  // 60pt INK hairline below the title — mirrors the cover-page accent.
  drawHairline(page, MARGIN, headerY - 52, MARGIN + 60, {
    color: INK,
    thickness: 1,
    opacity: 0.55,
  })

  // TOC lines start at y=680, drop by 22pt per row (11 rows = ~242pt total).
  let y = 680
  const entries: Array<{ num: string; titleKey: string; pageRef: number }> = [
    { num: '01', titleKey: 'toc.entry.1', pageRef: data.pageNumbers.executive },
    { num: '02', titleKey: 'toc.entry.2', pageRef: data.pageNumbers.areas },
    { num: '03', titleKey: 'toc.entry.3', pageRef: data.pageNumbers.costs },
    { num: '04', titleKey: 'toc.entry.4', pageRef: data.pageNumbers.timeline },
    { num: '05', titleKey: 'toc.entry.5', pageRef: data.pageNumbers.procedures },
    { num: '06', titleKey: 'toc.entry.6', pageRef: data.pageNumbers.documents },
    { num: '07', titleKey: 'toc.entry.7', pageRef: data.pageNumbers.team },
    { num: '08', titleKey: 'toc.entry.8', pageRef: data.pageNumbers.recommendations },
    { num: '09', titleKey: 'toc.entry.9', pageRef: data.pageNumbers.keyData },
    { num: '10', titleKey: 'toc.entry.10', pageRef: data.pageNumbers.verification },
    { num: '11', titleKey: 'toc.entry.11', pageRef: data.pageNumbers.glossary },
  ]
  for (const entry of entries) {
    y = drawTocLine(
      page,
      y,
      entry.num,
      pdfStr(strings, entry.titleKey),
      `p. ${entry.pageRef}`,
      fonts,
    )
  }

  // v1.0.14 Bug 28 fix — footer is NOT drawn here. renderTocFooter
  // is invoked AFTER total page count is known.
  void PAGE_WIDTH
}

/**
 * v1.0.14 Bug 28 fix — Path A split. Renders the TOC page footer
 * AFTER the assembly knows the resolved total page count.
 */
export function renderTocFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: { docNo: string; totalPages: number; tocPageNumber: number },
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.tocPageNumber} / ${data.totalPages}`,
    fonts,
  })
}
