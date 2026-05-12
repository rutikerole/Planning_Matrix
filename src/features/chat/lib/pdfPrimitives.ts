// ───────────────────────────────────────────────────────────────────────
// v1.0.13 — PDF layout primitives.
//
// Pure draw helpers for the v1.0.13+ PDF Renaissance. Each primitive
// takes a pdf-lib PDFPage + typed params and renders a single visual
// unit (color block, text run, hairline, dotted leader, etc.). No
// module state — every helper is a pure function over its inputs.
//
// Color palette + page constants mirror DESIGN_DNA.md extended to the
// PDF surface: paper #F5EFDF · ink hsl(220 16% 11%) · clay hsl(25 30%
// 38%) · 0.5pt hairlines · no shadows · no gradients.
//
// Font stack: Inter Regular + Inter Medium + Instrument Serif Italic
// — all three already shipped in public/fonts/ and loaded via the
// existing src/lib/fontLoader.ts. resolveEditorialFonts is a thin
// facade returning the trio the editorial layout actually uses.
//
// Section renderers (cover.ts, toc.ts, future executive/areas/costs/…)
// consume these primitives. They do NOT touch pdf-lib directly except
// for the page itself.
// ───────────────────────────────────────────────────────────────────────

import { rgb, type PDFDocument, type PDFFont, type PDFPage } from 'pdf-lib'
import { loadBrandFonts } from '@/lib/fontLoader'

// ─── Color constants ──────────────────────────────────────────────────
// Atelier mode design DNA, ported to pdf-lib's rgb() (0..1 floats).
export const PAPER = rgb(0.961, 0.937, 0.875) // #F5EFDF
export const INK = rgb(0.157, 0.169, 0.184) // hsl(220 16% 11%)
export const CLAY = rgb(0.494, 0.396, 0.282) // hsl(25 30% 38%)
export const HAIRLINE = CLAY // named for intent; same color, opacity at site

// Qualifier ramp — declared in v1.0.13 for stability so v1.0.14+
// section renderers can rely on the export surface even before they're
// drawn for the first time.
export const PILL_ACTIVE = rgb(0.388, 0.6, 0.133)
export const PILL_PENDING = rgb(0.729, 0.459, 0.09)
export const PILL_VOID = rgb(0.639, 0.176, 0.176)
export const PILL_CLIENT_BG = rgb(0.902, 0.945, 0.984)
export const PILL_CLIENT_FG = rgb(0.047, 0.267, 0.486)
export const PILL_LEGAL_BG = rgb(0.98, 0.933, 0.855)
export const PILL_LEGAL_FG = rgb(0.388, 0.22, 0.024)
export const PILL_CALC_BG = rgb(0.918, 0.949, 0.871)
export const PILL_CALC_FG = rgb(0.153, 0.314, 0.039)

// ─── Layout constants ─────────────────────────────────────────────────
export const PAGE_WIDTH = 595.28 // A4 portrait, pts
export const PAGE_HEIGHT = 841.89
export const MARGIN = 48
export const GUTTER = 16

// ─── Font facade ──────────────────────────────────────────────────────
export interface EditorialFonts {
  /** Inter Regular — paragraphs, captions, body. */
  sans: PDFFont
  /** Inter Medium — titles, kickers, table headers. */
  sansMedium: PDFFont
  /** Instrument Serif Italic — editorial headers (cover title, section h1). */
  serifItalic: PDFFont
}

/**
 * Resolve the editorial font trio from the brand-fonts loader.
 * Wraps loadBrandFonts so section renderers don't need to know about
 * fontkit / pdf-lib's font-embed plumbing.
 */
export async function resolveEditorialFonts(
  doc: PDFDocument,
): Promise<EditorialFonts> {
  const brand = await loadBrandFonts(doc)
  return {
    sans: brand.inter,
    sansMedium: brand.interMedium,
    serifItalic: brand.serifItalic,
  }
}

// ─── Primitives ───────────────────────────────────────────────────────

/** Fill the page with PAPER. Call once per page before any content. */
export function drawPaperBackground(page: PDFPage): void {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: PAPER,
  })
}

export interface HairlineOpts {
  color?: ReturnType<typeof rgb>
  thickness?: number
  opacity?: number
}

/** 0.5pt CLAY hairline by default. */
export function drawHairline(
  page: PDFPage,
  x1: number,
  y: number,
  x2: number,
  opts: HairlineOpts = {},
): void {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    color: opts.color ?? CLAY,
    thickness: opts.thickness ?? 0.5,
    opacity: opts.opacity ?? 0.55,
  })
}

/**
 * Dotted leader between x1 and x2 at vertical y — used for TOC lines.
 * 0.5pt CLAY dots spaced 4pt apart.
 */
export function drawDottedLeader(
  page: PDFPage,
  x1: number,
  y: number,
  x2: number,
): void {
  const spacing = 4
  for (let x = x1; x <= x2; x += spacing) {
    page.drawCircle({
      x,
      y,
      size: 0.4,
      color: CLAY,
      opacity: 0.7,
    })
  }
}

/**
 * Uppercase letter-spaced kicker label. Used above editorial titles
 * and as small-caps section labels throughout the PDF.
 */
export function drawKicker(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  fonts: EditorialFonts,
): void {
  page.drawText(text, {
    x,
    y,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    // pdf-lib doesn't natively letter-space; the prototype's 2pt
    // tracking is approximated by the visual weight of Inter Medium
    // at 10pt + uppercase input.
  })
}

/** Section h1: 26pt italic serif INK. */
export function drawEditorialTitle(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  fonts: EditorialFonts,
): void {
  page.drawText(text, {
    x,
    y,
    size: 26,
    font: fonts.serifItalic,
    color: INK,
  })
}

/** Cover h1: 36pt italic serif INK — larger than section h1. */
export function drawCoverTitle(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  fonts: EditorialFonts,
): void {
  page.drawText(text, {
    x,
    y,
    size: 36,
    font: fonts.serifItalic,
    color: INK,
  })
}

export interface MonoMetaOpts {
  align?: 'left' | 'right'
  size?: number
}

/** Monospace-ish meta text (mono via Inter Regular + tracking + UPPERCASE). */
export function drawMonoMeta(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  fonts: EditorialFonts,
  opts: MonoMetaOpts = {},
): void {
  const size = opts.size ?? 11
  if (opts.align === 'right') {
    const w = fonts.sans.widthOfTextAtSize(text, size)
    page.drawText(text, {
      x: x - w,
      y,
      size,
      font: fonts.sans,
      color: CLAY,
    })
  } else {
    page.drawText(text, { x, y, size, font: fonts.sans, color: CLAY })
  }
}

/**
 * Two-line stack: small CLAY label above, Inter-Medium INK value below.
 * Used for the cover-page 3-column metadata grid + key-data table rows.
 */
export function drawLabelValue(
  page: PDFPage,
  x: number,
  y: number,
  label: string,
  value: string,
  fonts: EditorialFonts,
): void {
  page.drawText(label, {
    x,
    y,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
  })
  page.drawText(value, {
    x,
    y: y - 16,
    size: 12,
    font: fonts.sansMedium,
    color: INK,
  })
}

/**
 * Standard section header: kicker on top, editorial title 4pt below.
 * Returns the y-cursor after the title's descender (caller picks the
 * gap to its first content row).
 */
export function drawSectionHeader(
  page: PDFPage,
  yTop: number,
  kicker: string,
  title: string,
  fonts: EditorialFonts,
): number {
  drawKicker(page, MARGIN, yTop, kicker, fonts)
  drawEditorialTitle(page, MARGIN, yTop - 32, title, fonts)
  return yTop - 50
}

export interface FooterOpts {
  left: string
  center: string
  right: string
  fonts: EditorialFonts
}

/**
 * Page footer: CLAY hairline + 3-cell mono row.
 * Renders at y = MARGIN + 14 (hairline at MARGIN + 28).
 */
export function drawFooter(page: PDFPage, opts: FooterOpts): void {
  drawHairline(page, MARGIN, MARGIN + 28, PAGE_WIDTH - MARGIN)
  page.drawText(opts.left, {
    x: MARGIN,
    y: MARGIN + 14,
    size: 9,
    font: opts.fonts.sans,
    color: CLAY,
  })
  const cw = opts.fonts.sans.widthOfTextAtSize(opts.center, 9)
  page.drawText(opts.center, {
    x: (PAGE_WIDTH - cw) / 2,
    y: MARGIN + 14,
    size: 9,
    font: opts.fonts.sans,
    color: CLAY,
  })
  const rw = opts.fonts.sans.widthOfTextAtSize(opts.right, 9)
  page.drawText(opts.right, {
    x: PAGE_WIDTH - MARGIN - rw,
    y: MARGIN + 14,
    size: 9,
    font: opts.fonts.sans,
    color: CLAY,
  })
}

/**
 * One TOC row: monospace numeral + title + dotted leader + page ref.
 * Returns the y-cursor after the row (drop by ~22pt for next row).
 */
export function drawTocLine(
  page: PDFPage,
  y: number,
  num: string,
  title: string,
  pageRef: string,
  fonts: EditorialFonts,
): number {
  const numX = MARGIN
  const titleX = MARGIN + 36
  const refRight = PAGE_WIDTH - MARGIN

  // 2-digit numeral, CLAY 11pt.
  page.drawText(num, {
    x: numX,
    y,
    size: 11,
    font: fonts.sansMedium,
    color: CLAY,
  })

  // Title in Inter Regular 13pt INK.
  page.drawText(title, {
    x: titleX,
    y,
    size: 13,
    font: fonts.sans,
    color: INK,
  })
  const titleWidth = fonts.sans.widthOfTextAtSize(title, 13)

  // Page ref right-aligned.
  const refWidth = fonts.sans.widthOfTextAtSize(pageRef, 13)
  const refX = refRight - refWidth
  page.drawText(pageRef, {
    x: refX,
    y,
    size: 13,
    font: fonts.sans,
    color: INK,
  })

  // Dotted leader between title end and page-ref start (with 8pt gaps).
  const leaderStart = titleX + titleWidth + 8
  const leaderEnd = refX - 8
  if (leaderEnd > leaderStart) {
    drawDottedLeader(page, leaderStart, y + 3, leaderEnd)
  }

  return y - 22
}
