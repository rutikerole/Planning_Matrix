// ───────────────────────────────────────────────────────────────────────
// v1.0.16 — Costs page (Section 03 · Estimated cost range).
//
// Replaces the v1.0.6 plain-text drawCostsPage with the approved
// editorial layout: kicker + 26pt italic-serif title + 11pt CLAY
// subtitle ("Computed from {n} m² façade · HOAI Zone III · {state}
// regional BKI factor") + 3-column table (ITEM / BASIS / EUR RANGE)
// with per-row basis sub-line + total row + drawNotesBlock at the
// bottom.
//
// Pure renderer mirroring the v1.0.15 cover/toc/executive/areas split:
// renderCostsBody draws the body, renderCostsFooter renders the
// page-numbered footer in the second pass once total page count
// resolves (Path A pattern from v1.0.14 Bug 28).
//
// DATA SOURCE. The exportPdf assembly is responsible for computing
// the cost breakdown via the existing v1.0.11 cost composer
// (resolveAreaSqmByTemplate → buildCostBreakdown → formatEurRange).
// This renderer only consumes the CostsData shape — no engine
// duplication, no drift between PDF and result-page tab.
// ───────────────────────────────────────────────────────────────────────

import { type PDFPage } from 'pdf-lib'
import {
  CLAY,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawEditorialTitle,
  drawFooter,
  drawKicker,
  drawMonoMeta,
  drawNotesBlock,
  drawPaperBackground,
  drawSafeText,
  drawTable,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

export interface CostsItem {
  /** pdfStrings key (e.g. 'costs.items.architect'). */
  labelKey: string
  /** pdfStrings key for the basis sub-line. May contain {state}. */
  basisKey: string
  /** Pre-formatted EUR range, e.g. "€ 18,300 – 34,200". */
  range: string
}

export interface CostsData {
  /** m² façade used as the cost-driving area. */
  areaSqm: number
  /** Bundesland short-code uppercased (e.g. "NRW", "BAYERN"). */
  bundeslandCode: string
  /** Template label (e.g. "T-03 · Renovation"). */
  templateLabel: string
  items: ReadonlyArray<CostsItem>
  /** Pre-formatted total EUR range. */
  total: string
}

export interface CostsFooterData {
  docNo: string
  totalPages: number
  pageNumber: number
}

export function renderCostsBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: CostsData,
): void {
  drawPaperBackground(page)

  // ─── Header row ─────────────────────────────────────────────────
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'costs.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'costs.title'),
    fonts,
  )
  // Right-side meta (template · state)
  const metaText = `${data.templateLabel}  ·  ${data.bundeslandCode}`
  drawMonoMeta(page, PAGE_WIDTH - MARGIN, headerY - 24, metaText, fonts, {
    align: 'right',
  })

  // ─── Subtitle with {n}/{state} substitution ─────────────────────
  const basisRaw = pdfStr(strings, 'costs.basisTemplate')
  const basisText = basisRaw
    .replace(/\{n\}/g, String(data.areaSqm))
    .replace(/\{state\}/g, data.bundeslandCode)
  drawSafeText(page, basisText, {
    x: MARGIN,
    y: headerY - 56,
    size: 11,
    font: fonts.serifItalic,
    color: CLAY,
    safe: fonts.safe,
  })

  // ─── Empty state ────────────────────────────────────────────────
  if (data.items.length === 0) {
    drawSafeText(page, pdfStr(strings, 'costs.empty'), {
      x: MARGIN,
      y: PAGE_HEIGHT / 2,
      size: 12,
      font: fonts.serifItalic,
      color: CLAY,
      safe: fonts.safe,
    })
    return
  }

  // ─── 3-column table ─────────────────────────────────────────────
  const tableX = MARGIN
  const tableY = headerY - 90
  const tableWidth = PAGE_WIDTH - 2 * MARGIN
  const rows = data.items.map((item) => {
    const basisRaw = pdfStr(strings, item.basisKey)
    const basisLine = basisRaw.replace(/\{state\}/g, data.bundeslandCode)
    return {
      cells: [pdfStr(strings, item.labelKey), '', item.range],
      basisRow: basisLine,
    }
  })
  const { endY } = drawTable({
    page,
    x: tableX,
    y: tableY,
    width: tableWidth,
    columns: [
      { label: pdfStr(strings, 'costs.th.item'), widthFraction: 0.4 },
      { label: pdfStr(strings, 'costs.th.basis'), widthFraction: 0.35 },
      {
        label: pdfStr(strings, 'costs.th.range'),
        widthFraction: 0.25,
        align: 'right',
      },
    ],
    rows,
    totalRow: {
      label: pdfStr(strings, 'costs.total'),
      value: data.total,
    },
    fonts,
  })

  // ─── Notes block ───────────────────────────────────────────────
  drawNotesBlock(page, {
    x: MARGIN,
    y: endY - 28,
    width: PAGE_WIDTH - 2 * MARGIN,
    headerLabel: pdfStr(strings, 'costs.notes.h'),
    body: pdfStr(strings, 'costs.notes.b'),
    fonts,
  })
}

export function renderCostsFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: CostsFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
