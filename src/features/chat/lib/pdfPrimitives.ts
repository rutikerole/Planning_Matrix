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
import {
  decomposeLigatures,
  preventBrandLigatures,
  winAnsiSafe,
} from '@/lib/winAnsiSafe'

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

// ─── Font + sanitization facade ───────────────────────────────────────
//
// v1.0.16 — every text-drawing primitive applies `safe` internally so
// section renderers physically cannot bypass the ligature-decomposition
// + WinAnsi-safe + brand-ligature-prevention pipeline. Bug 22 / Bug 30
// / Bug 33 / Bug 34 were all variants of the same architectural flaw:
// `safe` lived as a module-local closure in exportPdf.ts, so pure
// section renderers (cover/toc/executive/areas) called page.drawText
// raw and re-introduced corrupted ligature output on every new
// renderer or font refactor. v1.0.16 bakes it into EditorialFonts.
export type SafeTextFn = (s: string) => string

export interface EditorialFonts {
  /** Inter Regular — paragraphs, captions, body. */
  sans: PDFFont
  /** Inter Medium — titles, kickers, table headers. */
  sansMedium: PDFFont
  /** Instrument Serif Italic — editorial headers (cover title, section h1). */
  serifItalic: PDFFont
  /**
   * v1.0.16 — ligature/encoding sanitizer pipeline. Every text-drawing
   * primitive in this module calls fonts.safe(text) before passing to
   * page.drawText. Section renderers MUST use drawSafeText (also in
   * this module) for any one-off draws; the smoke-walk drift fixture
   * asserts zero raw `page.drawText` calls outside pdfPrimitives.ts.
   */
  safe: SafeTextFn
}

/**
 * v1.0.16 — single source of truth for PDF text sanitization. On the
 * brand-TTF path (Inter + Instrument Serif via fontkit), composes
 * decomposeLigatures (always-on, strips U+FB00..U+FB05) with
 * preventBrandLigatures (injects ZWNJ between f+i/l/f to prevent
 * fontkit's GSUB layer from applying OpenType `liga` substitution
 * at embed time). On the Helvetica fallback path, composes
 * decomposeLigatures with winAnsiSafe (strips zero-widths + ASCIIfies
 * unsupported codepoints).
 */
export function resolveSafeTextFn(usingFallback: boolean): SafeTextFn {
  if (usingFallback) {
    return (s: string) => winAnsiSafe(decomposeLigatures(s))
  }
  return (s: string) => preventBrandLigatures(decomposeLigatures(s))
}

/**
 * Resolve the editorial font trio from the brand-fonts loader.
 *
 * v1.0.13 called loadBrandFonts on every invocation. The assembly
 * (exportPdf) ALSO called loadBrandFonts directly for body pages,
 * so the same PDFDocument ended up with two independent font embeds
 * for the same TTFs — increasing subset/encoding surface area and
 * making it possible for the body pages' PDFFont instances to lose
 * the v1.0.12 safe() ligature-guard guarantees in subtle ways.
 *
 * v1.0.14 Bug 30 fix: accept an OPTIONAL pre-loaded BrandFonts. When
 * the assembly already has one, pass it in and we just rebind the
 * existing PDFFont instances into the editorial view — no second
 * embed, no font duplication. Backward compat: a missing arg
 * triggers the original loadBrandFonts call so non-assembly callers
 * still work standalone.
 */
export async function resolveEditorialFonts(
  doc: PDFDocument,
  pre?: {
    inter: PDFFont
    interMedium: PDFFont
    serifItalic: PDFFont
    usingFallback: boolean
  },
): Promise<EditorialFonts> {
  const brand = pre ?? (await loadBrandFonts(doc))
  return {
    sans: brand.inter,
    sansMedium: brand.interMedium,
    serifItalic: brand.serifItalic,
    safe: resolveSafeTextFn(brand.usingFallback),
  }
}

// ─── Primitives ───────────────────────────────────────────────────────

/**
 * v1.0.16 — enforcement primitive. Section renderers that need a
 * one-off page.drawText call must route through this helper. The
 * required `safe` field on opts means forgetting to sanitize is a
 * TypeScript compile error, not a silent runtime regression.
 */
export interface DrawSafeTextOpts {
  x: number
  y: number
  size: number
  font: PDFFont
  color: ReturnType<typeof rgb>
  opacity?: number
  maxWidth?: number
  safe: SafeTextFn
}

export function drawSafeText(
  page: PDFPage,
  text: string,
  opts: DrawSafeTextOpts,
): void {
  page.drawText(opts.safe(text), {
    x: opts.x,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color,
    opacity: opts.opacity,
    maxWidth: opts.maxWidth,
  })
}

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
  page.drawText(fonts.safe(text), {
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
  page.drawText(fonts.safe(text), {
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
  page.drawText(fonts.safe(text), {
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
  const safe = fonts.safe(text)
  if (opts.align === 'right') {
    const w = fonts.sans.widthOfTextAtSize(safe, size)
    page.drawText(safe, {
      x: x - w,
      y,
      size,
      font: fonts.sans,
      color: CLAY,
    })
  } else {
    page.drawText(safe, { x, y, size, font: fonts.sans, color: CLAY })
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
  page.drawText(fonts.safe(label), {
    x,
    y,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
  })
  page.drawText(fonts.safe(value), {
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
  const safe = opts.fonts.safe
  const left = safe(opts.left)
  const center = safe(opts.center)
  const right = safe(opts.right)
  page.drawText(left, {
    x: MARGIN,
    y: MARGIN + 14,
    size: 9,
    font: opts.fonts.sans,
    color: CLAY,
  })
  const cw = opts.fonts.sans.widthOfTextAtSize(center, 9)
  page.drawText(center, {
    x: (PAGE_WIDTH - cw) / 2,
    y: MARGIN + 14,
    size: 9,
    font: opts.fonts.sans,
    color: CLAY,
  })
  const rw = opts.fonts.sans.widthOfTextAtSize(right, 9)
  page.drawText(right, {
    x: PAGE_WIDTH - MARGIN - rw,
    y: MARGIN + 14,
    size: 9,
    font: opts.fonts.sans,
    color: CLAY,
  })
}

// ─── v1.0.15 primitives — cards / pills / badges / wrapped text ──────

export interface CardOpts {
  x: number
  y: number
  w: number
  h: number
  /** 'left' = accent stripe down the left edge only; 'full' = thin
   *  border on all four sides; 'none' = no border (fill only). */
  borderSide: 'left' | 'full' | 'none'
  borderColor?: ReturnType<typeof rgb>
  borderWidth?: number
  /** Optional fill color. Skip for transparent (paper background
   *  shows through). */
  fillColor?: ReturnType<typeof rgb> | null
  /** Reserved for callers — primitives don't auto-pad text but the
   *  field is part of the contract so section renderers can store
   *  their pad value next to the card definition for stacking. */
  padding?: number
}

/**
 * Card primitive — paper-tinted rect with optional accent border.
 * `y` is the TOP of the card (so y - h is the bottom). pdf-lib's
 * drawRectangle treats `y` as the bottom edge, so we translate.
 */
export function drawCard(page: PDFPage, opts: CardOpts): void {
  const { x, y, w, h } = opts
  const rectY = y - h
  if (opts.fillColor) {
    page.drawRectangle({ x, y: rectY, width: w, height: h, color: opts.fillColor })
  }
  if (opts.borderSide === 'full') {
    const color = opts.borderColor ?? CLAY
    const t = opts.borderWidth ?? 0.5
    // Four hairlines forming the rectangle outline.
    drawHairline(page, x, y, x + w, { color, thickness: t, opacity: 0.85 })
    drawHairline(page, x, rectY, x + w, { color, thickness: t, opacity: 0.85 })
    page.drawLine({
      start: { x, y: rectY }, end: { x, y },
      color, thickness: t, opacity: 0.85,
    })
    page.drawLine({
      start: { x: x + w, y: rectY }, end: { x: x + w, y },
      color, thickness: t, opacity: 0.85,
    })
  } else if (opts.borderSide === 'left') {
    const color = opts.borderColor ?? CLAY
    const t = opts.borderWidth ?? 3
    page.drawRectangle({
      x: x,
      y: rectY,
      width: t,
      height: h,
      color,
    })
  }
}

export interface PriorityPillOpts {
  bg: ReturnType<typeof rgb>
  fg: ReturnType<typeof rgb>
  font: PDFFont
  /** v1.0.16 — sanitization fn from EditorialFonts.safe. Required so
   *  the call site cannot accidentally skip ligature decomposition. */
  safe: SafeTextFn
  size?: number
  padX?: number
  padY?: number
}

/**
 * Pill primitive — small rounded-rect label. pdf-lib has no native
 * rounded-rect at modest cost; we draw a flat rectangle with hair-
 * line edges as the visual approximation, which reads as a "pill"
 * within the editorial design language. Returns the consumed width
 * so callers can chain pills horizontally.
 */
export function drawPriorityPill(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  opts: PriorityPillOpts,
): number {
  const size = opts.size ?? 10
  const padX = opts.padX ?? 8
  const padY = opts.padY ?? 3
  const safe = opts.safe(text)
  const textWidth = opts.font.widthOfTextAtSize(safe, size)
  const w = textWidth + padX * 2
  const h = size + padY * 2
  page.drawRectangle({
    x,
    y: y - padY - 2,
    width: w,
    height: h,
    color: opts.bg,
  })
  page.drawText(safe, {
    x: x + padX,
    y,
    size,
    font: opts.font,
    color: opts.fg,
  })
  return w
}

export interface CircularBadgeOpts {
  fillColor: ReturnType<typeof rgb>
  textColor: ReturnType<typeof rgb>
  font: PDFFont
  /** v1.0.16 — sanitization fn from EditorialFonts.safe. */
  safe: SafeTextFn
  size?: number
}

/**
 * Filled-circle badge with a single uppercase letter centered.
 * Used for the Areas page A · B · C badges.
 */
export function drawCircularBadge(
  page: PDFPage,
  cx: number,
  cy: number,
  radius: number,
  letter: string,
  opts: CircularBadgeOpts,
): void {
  page.drawCircle({ x: cx, y: cy, size: radius, color: opts.fillColor })
  const size = opts.size ?? 13
  const safe = opts.safe(letter)
  const letterWidth = opts.font.widthOfTextAtSize(safe, size)
  page.drawText(safe, {
    x: cx - letterWidth / 2,
    y: cy - size / 2 + 1,
    size,
    font: opts.font,
    color: opts.textColor,
  })
}

export interface WrappedTextOpts {
  maxWidth: number
  lineHeight: number
  font: PDFFont
  size: number
  color: ReturnType<typeof rgb>
  /** v1.0.16 — sanitization fn from EditorialFonts.safe. Applied
   *  per-line so word-wrap math uses the same string drawText receives. */
  safe: SafeTextFn
}

/**
 * Word-wrap a paragraph to maxWidth, drawing each line at lineHeight
 * spacing. `y` is the baseline of the FIRST line; returns the y after
 * the LAST line's descender so callers can stack content below.
 *
 * Word-break only — no hyphenation. If a single word exceeds maxWidth
 * (unlikely with German legal §§), it's drawn anyway and overflows.
 */
export function drawWrappedText(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  opts: WrappedTextOpts,
): number {
  const sanitized = opts.safe(text)
  const words = sanitized.split(/\s+/)
  let line = ''
  let cursor = y
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    const w = opts.font.widthOfTextAtSize(candidate, opts.size)
    if (w > opts.maxWidth && line) {
      page.drawText(line, {
        x, y: cursor,
        size: opts.size, font: opts.font, color: opts.color,
      })
      cursor -= opts.lineHeight
      line = word
    } else {
      line = candidate
    }
  }
  if (line) {
    page.drawText(line, {
      x, y: cursor,
      size: opts.size, font: opts.font, color: opts.color,
    })
    cursor -= opts.lineHeight
  }
  return cursor
}

export interface StatusLegendItem {
  color: ReturnType<typeof rgb>
  label: string
}

/**
 * Inline horizontal legend (dot + label, repeating). `rightX` is the
 * RIGHT edge anchor; items render right-to-left from that anchor.
 * Used on the Areas page top-right corner.
 */
export function drawStatusLegend(
  page: PDFPage,
  rightX: number,
  y: number,
  items: ReadonlyArray<StatusLegendItem>,
  fonts: EditorialFonts,
): void {
  let cursor = rightX
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    const label = fonts.safe(item.label)
    const labelWidth = fonts.sans.widthOfTextAtSize(label, 10)
    page.drawText(label, {
      x: cursor - labelWidth,
      y,
      size: 10,
      font: fonts.sans,
      color: CLAY,
    })
    page.drawCircle({
      x: cursor - labelWidth - 8,
      y: y + 3,
      size: 3,
      color: item.color,
    })
    cursor = cursor - labelWidth - 18
    if (i > 0) cursor -= 4
  }
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

  const safeNum = fonts.safe(num)
  const safeTitle = fonts.safe(title)
  const safePageRef = fonts.safe(pageRef)

  // 2-digit numeral, CLAY 11pt.
  page.drawText(safeNum, {
    x: numX,
    y,
    size: 11,
    font: fonts.sansMedium,
    color: CLAY,
  })

  // Title in Inter Regular 13pt INK.
  page.drawText(safeTitle, {
    x: titleX,
    y,
    size: 13,
    font: fonts.sans,
    color: INK,
  })
  const titleWidth = fonts.sans.widthOfTextAtSize(safeTitle, 13)

  // Page ref right-aligned.
  const refWidth = fonts.sans.widthOfTextAtSize(safePageRef, 13)
  const refX = refRight - refWidth
  page.drawText(safePageRef, {
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
