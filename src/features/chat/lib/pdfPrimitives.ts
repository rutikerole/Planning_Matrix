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

import {
  PDFName,
  PDFString,
  rgb,
  type PDFArray,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
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

// v1.0.12 Bug 25 + v1.0.16 — shared qualifier display normalization.
//
// The Phase 13 §6.B.01 qualifier-write gate downgrades any persona-
// emitted DESIGNER+VERIFIED claim to DESIGNER+ASSUMED (audit signal:
// "model attempted designer-source on a derived rec without actual
// architect verification"). Storing DESIGNER+ASSUMED is the right
// audit state, but rendering "DESIGNER · ASSUMED" on PDF cards
// mis-signals to the bauherr that an architect has touched the
// project when none has.
//
// Render-time normalization: when source=DESIGNER + quality=ASSUMED
// AND no actual designer verification has fired (the qualifier was
// set by the gate's downgrade path, not by a human designer), display
// as "LEGAL · CALCULATED" — the qualifier that matches the rec's
// actual derivation provenance.
//
// v1.0.16 Bug 32 — moved from exportPdf.ts and exported so the
// executive renderer + body Section VIII + future Phase 2C key-data
// and recommendations renderers all share the same normalization.
// Bug 32 surfaced when v1.0.15's executive page rendered raw
// "DESIGNER · ASSUMED" because it bypassed this helper.
export function formatQualifier(q: {
  source: string
  quality: string
}): string {
  if (q.source === 'DESIGNER' && q.quality === 'ASSUMED') {
    return 'LEGAL · CALCULATED'
  }
  return `${q.source} · ${q.quality}`
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
  /** v1.0.20 — vertical gap inserted between paragraphs when the
   *  input contains "\n\n" separators. Defaults to lineHeight * 0.5
   *  (half-line gap reads as a clean paragraph break without
   *  ballooning vertical space). Pass 0 to disable. */
  paragraphGap?: number
}

/**
 * Word-wrap text to maxWidth, drawing each line at lineHeight
 * spacing. `y` is the baseline of the FIRST line; returns the y after
 * the LAST line's descender so callers can stack content below.
 *
 * Word-break only — no hyphenation. If a single word exceeds maxWidth
 * (unlikely with German legal §§), it's drawn anyway and overflows.
 *
 * v1.0.20 — input containing "\n\n" double-newline is split into
 * paragraphs. Each paragraph word-wraps independently; between
 * paragraphs a vertical gap (opts.paragraphGap ?? lineHeight * 0.5)
 * is inserted. Single-paragraph inputs (no \n\n) render identically
 * to pre-v1.0.20 behavior.
 */
export function drawWrappedText(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  opts: WrappedTextOpts,
): number {
  const paragraphGap = opts.paragraphGap ?? opts.lineHeight * 0.5
  // Split before sanitization so safe() doesn't collapse "\n\n".
  const paragraphs = text.split(/\n\n+/)
  let cursor = y
  paragraphs.forEach((paragraph, idx) => {
    if (idx > 0) cursor -= paragraphGap
    cursor = drawWrappedParagraph(page, x, cursor, paragraph, opts)
  })
  return cursor
}

function drawWrappedParagraph(
  page: PDFPage,
  x: number,
  y: number,
  paragraph: string,
  opts: WrappedTextOpts,
): number {
  const sanitized = opts.safe(paragraph)
  const words = sanitized.split(/\s+/).filter((w) => w.length > 0)
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

// ─── v1.0.18 primitive — citation hyperlink overlay ────────────────

/**
 * v1.0.18 Feature 3 — render text and overlay a link annotation on
 * a sub-range of that text. Used by section renderers to make §
 * citations clickable. text renders as a single drawText call (so
 * layout is unaffected); the link annotation is then appended to
 * the page's Annots array at the citation's bounding rect.
 *
 * `linkText` MUST appear in `text` at index `linkIndex`. The
 * primitive computes the link rect from the font's width of the
 * preceding text + the link text itself.
 */
export interface DrawLinkAnnotationOpts {
  /** Document — needed to create the annotation PDFDict. */
  doc: import('pdf-lib').PDFDocument
  /** Page on which the text was drawn. */
  page: PDFPage
  /** Origin x of the surrounding text run. */
  x: number
  /** Baseline y of the text run (pdf-lib's drawText coordinate). */
  y: number
  /** The full text rendered. */
  text: string
  /** The substring inside text to make a link. */
  linkText: string
  /** Index of linkText in text (caller pre-computed). */
  linkIndex: number
  font: PDFFont
  size: number
  /** Destination URL. */
  uri: string
  /** Sanitization fn (must match the safe used on the text draw). */
  safe: SafeTextFn
}

/**
 * Overlay a Link annotation with URI action on the given page at
 * the bounding rect of a substring of already-rendered text. The
 * substring is identified by its index in the FULL source text; the
 * primitive computes the substring's x-range by measuring the
 * sanitized prefix width.
 */
export function addLinkAnnotation(opts: DrawLinkAnnotationOpts): void {
  const { doc, page, x, y, text, linkText, linkIndex, font, size, uri, safe } = opts
  const safePrefix = safe(text.slice(0, linkIndex))
  const safeLink = safe(linkText)
  const prefixWidth = font.widthOfTextAtSize(safePrefix, size)
  const linkWidth = font.widthOfTextAtSize(safeLink, size)
  const x1 = x + prefixWidth
  const y1 = y - size * 0.2
  const x2 = x1 + linkWidth
  const y2 = y + size * 0.9
  const ctx = doc.context
  const annot = ctx.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [x1, y1, x2, y2],
    A: ctx.obj({
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(uri),
    }),
    Border: [0, 0, 0],
  })
  const annotRef = ctx.register(annot)
  const annotsName = PDFName.of('Annots')
  const existing = page.node.lookup(annotsName) as PDFArray | undefined
  if (existing) {
    existing.push(annotRef)
  } else {
    page.node.set(annotsName, ctx.obj([annotRef]))
  }
}

// ─── v1.0.17 primitives — qualifier pill + stacked bar + signature ─

const PILL_VERIFIED_BG = rgb(0.85, 0.93, 0.85)
const PILL_VERIFIED_FG = rgb(0.13, 0.32, 0.05)
const PILL_AUTHORITY_BG = rgb(0.87, 0.91, 0.97)
const PILL_AUTHORITY_FG = rgb(0.07, 0.24, 0.5)
const PILL_DESIGNER_BORDER = CLAY

export interface QualifierPillOpts {
  source: string
  quality: string
  font: PDFFont
  safe: SafeTextFn
  size?: number
  padX?: number
  padY?: number
}

/**
 * v1.0.17 — render the source · quality qualifier as a color-coded
 * pill. Same role as drawPriorityPill but the bg/fg colors are
 * derived from the source field:
 *   CLIENT · *           → blue (PILL_CLIENT_*)
 *   LEGAL · VERIFIED     → deep green (PILL_VERIFIED_*)
 *   LEGAL · CALCULATED   → light green (PILL_CALC_*)
 *   LEGAL · ASSUMED      → amber (PILL_LEGAL_*)
 *   DESIGNER · *         → outline only (no fill, CLAY border)
 *   AUTHORITY · *        → deep blue (PILL_AUTHORITY_*)
 * Returns consumed width so callers can right-align.
 */
export function drawQualifierPill(
  page: PDFPage,
  x: number,
  y: number,
  opts: QualifierPillOpts,
): number {
  const { source, quality, font, safe } = opts
  const size = opts.size ?? 9
  const padX = opts.padX ?? 6
  const padY = opts.padY ?? 3
  const text = `${source} · ${quality}`
  const safeText = safe(text)
  const textWidth = font.widthOfTextAtSize(safeText, size)
  const w = textWidth + padX * 2
  const h = size + padY * 2

  let bg: ReturnType<typeof rgb> | null = null
  let fg: ReturnType<typeof rgb>
  let drawBorder = false
  if (source === 'CLIENT') {
    bg = PILL_CLIENT_BG
    fg = PILL_CLIENT_FG
  } else if (source === 'LEGAL') {
    if (quality === 'VERIFIED') {
      bg = PILL_VERIFIED_BG
      fg = PILL_VERIFIED_FG
    } else if (quality === 'CALCULATED') {
      bg = PILL_CALC_BG
      fg = PILL_CALC_FG
    } else {
      bg = PILL_LEGAL_BG
      fg = PILL_LEGAL_FG
    }
  } else if (source === 'AUTHORITY') {
    bg = PILL_AUTHORITY_BG
    fg = PILL_AUTHORITY_FG
  } else if (source === 'DESIGNER') {
    drawBorder = true
    fg = CLAY
  } else {
    bg = PILL_LEGAL_BG
    fg = PILL_LEGAL_FG
  }

  if (bg) {
    page.drawRectangle({ x, y: y - padY - 2, width: w, height: h, color: bg })
  }
  if (drawBorder) {
    const borderY = y - padY - 2
    const t = 0.5
    drawHairline(page, x, borderY, x + w, { color: PILL_DESIGNER_BORDER, thickness: t, opacity: 0.85 })
    drawHairline(page, x, borderY + h, x + w, { color: PILL_DESIGNER_BORDER, thickness: t, opacity: 0.85 })
    page.drawLine({ start: { x, y: borderY }, end: { x, y: borderY + h }, color: PILL_DESIGNER_BORDER, thickness: t, opacity: 0.85 })
    page.drawLine({ start: { x: x + w, y: borderY }, end: { x: x + w, y: borderY + h }, color: PILL_DESIGNER_BORDER, thickness: t, opacity: 0.85 })
  }
  page.drawText(safeText, { x: x + padX, y, size, font, color: fg })
  return w
}

export interface StackedBarSegment {
  fraction: number
  color: ReturnType<typeof rgb>
  label?: string
}

/**
 * v1.0.17 — horizontal stacked bar. Segments render left-to-right;
 * each segment width = fraction * total width. Used on Verification
 * page for the data-quality breakdown (verified/calculated/assumed
 * Hamilton percentages).
 */
export function drawStackedBar(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  segments: ReadonlyArray<StackedBarSegment>,
): void {
  let cursorX = x
  for (const seg of segments) {
    const segW = seg.fraction * width
    page.drawRectangle({
      x: cursorX,
      y,
      width: segW,
      height,
      color: seg.color,
    })
    cursorX += segW
  }
}

export interface SignatureFieldOpts {
  x: number
  y: number
  width: number
  label: string
  sublabel?: string
  fonts: EditorialFonts
}

/**
 * v1.0.17 — empty signature field. Renders a 56pt-tall blank space
 * + 0.5pt INK hairline at the bottom + label below the line +
 * optional sublabel (e.g. "Date" or "Chamber stamp · registration
 * no.") in CLAY. Returns endY for stacking.
 */
export function drawSignatureField(
  page: PDFPage,
  opts: SignatureFieldOpts,
): { endY: number } {
  const { x, y, width, label, sublabel, fonts } = opts
  const safe = fonts.safe
  const lineY = y - 56
  drawHairline(page, x, lineY, x + width, {
    color: INK,
    thickness: 0.5,
    opacity: 0.85,
  })
  page.drawText(safe(label), {
    x,
    y: lineY - 14,
    size: 10,
    font: fonts.sansMedium,
    color: INK,
  })
  if (sublabel) {
    page.drawText(safe(sublabel), {
      x,
      y: lineY - 28,
      size: 9,
      font: fonts.sans,
      color: CLAY,
    })
    return { endY: lineY - 36 }
  }
  return { endY: lineY - 22 }
}

// ─── v1.0.16 primitives — Gantt timeline (Timeline page) ────────────

// Amber accent for milestone diamond / callout border (shared with the
// executive page's "high" priority color).
export const AMBER = rgb(0.729, 0.459, 0.09)

export interface WeekRulerOpts {
  x: number
  y: number
  width: number
  /** e.g. [0, 4, 8, 12, 16, 20, 24] — labels emitted at each tick. */
  weeks: ReadonlyArray<number>
  /** Localized "WEEK" / "WOCHE" label prefixing the first tick. */
  weekLabel: string
  fonts: EditorialFonts
}

/**
 * Horizontal ruler with monospace week-number labels at evenly-
 * spaced positions above a CLAY hairline. First label includes the
 * localized "WEEK 0" / "WOCHE 0" prefix.
 */
export function drawWeekRuler(
  page: PDFPage,
  opts: WeekRulerOpts,
): void {
  const { x, y, width, weeks, weekLabel, fonts } = opts
  const last = weeks[weeks.length - 1]
  const safe = fonts.safe
  weeks.forEach((w, idx) => {
    const tickX = x + (w / last) * width
    const label = idx === 0 ? `${weekLabel} ${w}` : String(w)
    page.drawText(safe(label), {
      x: tickX,
      y,
      size: 9,
      font: fonts.sans,
      color: CLAY,
    })
    page.drawLine({
      start: { x: tickX, y: y - 6 },
      end: { x: tickX, y: y - 10 },
      color: CLAY,
      thickness: 0.5,
      opacity: 0.55,
    })
  })
  drawHairline(page, x, y - 6, x + width)
}

export interface GanttRowOpts {
  x: number
  y: number
  width: number
  label: string
  duration: string
  startWeek: number
  endWeek: number
  totalWeeks: number
  /** 'work' draws INK fill; 'wait' draws CLAY fill (lighter visual
   *  weight for review/idle phases). */
  kind: 'work' | 'wait'
  fonts: EditorialFonts
}

/**
 * One Gantt row: header line (label left + duration right) above a
 * track (paper-tinted) with a colored fill bar from startWeek/totalWeeks
 * to endWeek/totalWeeks. Returns the y-cursor below the bar.
 */
export function drawGanttRow(
  page: PDFPage,
  opts: GanttRowOpts,
): { endY: number } {
  const { x, y, width, label, duration, startWeek, endWeek, totalWeeks, kind, fonts } = opts
  const safe = fonts.safe

  // Header: label left, duration right.
  page.drawText(safe(label), {
    x,
    y,
    size: 12,
    font: fonts.sansMedium,
    color: INK,
  })
  const durTxt = safe(duration)
  const durWidth = fonts.sans.widthOfTextAtSize(durTxt, 12)
  page.drawText(durTxt, {
    x: x + width - durWidth,
    y,
    size: 12,
    font: fonts.sans,
    color: CLAY,
  })

  // Track + fill (12pt tall, 8pt below the header).
  const trackY = y - 20
  const trackH = 12
  // Track (paper-tinted, very subtle).
  page.drawRectangle({
    x,
    y: trackY,
    width,
    height: trackH,
    color: rgb(0.92, 0.9, 0.84),
  })
  // Fill bar.
  const barX = x + (startWeek / totalWeeks) * width
  const barW = ((endWeek - startWeek) / totalWeeks) * width
  page.drawRectangle({
    x: barX,
    y: trackY,
    width: barW,
    height: trackH,
    color: kind === 'work' ? INK : CLAY,
    opacity: kind === 'work' ? 1 : 0.45,
  })

  return { endY: trackY - 8 }
}

export interface MilestoneCalloutOpts {
  x: number
  y: number
  width: number
  label: string
  detail: string
  fonts: EditorialFonts
}

/**
 * Approval-milestone callout — 2pt AMBER border-left + filled amber
 * diamond + 12pt INK label + 12pt CLAY detail to the right. Returns
 * the y-cursor below the callout's bottom.
 */
export function drawMilestoneCallout(
  page: PDFPage,
  opts: MilestoneCalloutOpts,
): { endY: number } {
  const { x, y, width, label, detail, fonts } = opts
  const safe = fonts.safe
  const blockH = 28
  const top = y
  const bottom = top - blockH

  // 2pt AMBER left accent.
  page.drawRectangle({
    x,
    y: bottom,
    width: 2,
    height: blockH,
    color: AMBER,
  })

  // 8×8 amber diamond (rotated square approximated with two
  // triangles via four-point poly).
  const diamondCx = x + 16
  const diamondCy = top - 14
  const ds = 4 // half-size
  page.drawSvgPath(
    `M ${diamondCx} ${diamondCy - ds} L ${diamondCx + ds} ${diamondCy} L ${diamondCx} ${diamondCy + ds} L ${diamondCx - ds} ${diamondCy} Z`,
    {
      color: AMBER,
      borderWidth: 0,
    },
  )

  // Label + detail.
  const textX = x + 30
  page.drawText(safe(label), {
    x: textX,
    y: top - 16,
    size: 12,
    font: fonts.sansMedium,
    color: INK,
  })
  const labelW = fonts.sansMedium.widthOfTextAtSize(safe(label), 12)
  page.drawText(safe(detail), {
    x: textX + labelW + 6,
    y: top - 16,
    size: 12,
    font: fonts.sans,
    color: CLAY,
  })

  // Suppress unused-var (width is part of the contract for symmetry
  // with the other v1.0.16 primitives, even though this primitive
  // doesn't constrain to width — callers compute their own layout).
  void width

  return { endY: bottom - 8 }
}

// ─── v1.0.16 primitives — table + notes block (Costs page) ──────────

export interface TableColumn {
  label: string
  widthFraction: number
  align?: 'left' | 'right'
  /** Override the body font for this column. Defaults to fonts.sansMedium. */
  bodyFont?: PDFFont
}

export interface TableRow {
  cells: ReadonlyArray<string>
  /** Optional basis-text line drawn under the first column in CLAY
   *  italic-serif. Used by the Costs page for "HOAI Zone III · LP 1–4"
   *  rationale rows beneath each item. */
  basisRow?: string
}

export interface TotalRow {
  label: string
  value: string
}

export interface DrawTableOpts {
  x: number
  y: number
  width: number
  columns: ReadonlyArray<TableColumn>
  rows: ReadonlyArray<TableRow>
  totalRow?: TotalRow
  fonts: EditorialFonts
}

/**
 * 3-column table primitive. Header row with letter-spaced CLAY column
 * labels above a 0.5pt INK hairline; body rows (each 22pt tall + optional
 * 16pt basis line); inter-row 0.5pt CLAY hairlines; optional total row
 * with a 1pt INK border-top, 14pt label, 16pt right-aligned tabular value.
 *
 * Returns the y-cursor after the bottom edge so callers can stack a
 * notes block below.
 */
export function drawTable(opts: DrawTableOpts & { page: PDFPage }): { endY: number } {
  const { page, x, y, width, columns, rows, totalRow, fonts } = opts
  const safe = fonts.safe

  // Compute column x positions and pixel widths from fractions.
  const colWidths = columns.map((c) => c.widthFraction * width)
  const colX = [] as number[]
  let cursor = x
  for (const w of colWidths) {
    colX.push(cursor)
    cursor += w
  }

  // ─── Header row ─────────────────────────────────────────────────
  const headerY = y
  for (let i = 0; i < columns.length; i++) {
    const c = columns[i]
    const txt = safe(c.label)
    if (c.align === 'right') {
      const tw = fonts.sansMedium.widthOfTextAtSize(txt, 10)
      page.drawText(txt, {
        x: colX[i] + colWidths[i] - tw,
        y: headerY,
        size: 10,
        font: fonts.sansMedium,
        color: CLAY,
      })
    } else {
      page.drawText(txt, {
        x: colX[i],
        y: headerY,
        size: 10,
        font: fonts.sansMedium,
        color: CLAY,
      })
    }
  }
  drawHairline(page, x, headerY - 8, x + width, { color: INK, thickness: 0.5, opacity: 0.7 })

  // ─── Body rows ──────────────────────────────────────────────────
  let rowTop = headerY - 24
  for (const row of rows) {
    for (let i = 0; i < columns.length; i++) {
      const c = columns[i]
      const cell = row.cells[i] ?? ''
      const txt = safe(cell)
      const font = c.bodyFont ?? fonts.sansMedium
      const size = 12
      if (c.align === 'right') {
        const tw = font.widthOfTextAtSize(txt, size)
        page.drawText(txt, {
          x: colX[i] + colWidths[i] - tw,
          y: rowTop,
          size,
          font,
          color: INK,
        })
      } else {
        page.drawText(txt, {
          x: colX[i],
          y: rowTop,
          size,
          font,
          color: INK,
        })
      }
    }
    // Optional basis sub-line under column 0
    if (row.basisRow) {
      page.drawText(safe(row.basisRow), {
        x: colX[0],
        y: rowTop - 14,
        size: 10,
        font: fonts.serifItalic,
        color: CLAY,
      })
      rowTop -= 14
    }
    rowTop -= 18
    drawHairline(page, x, rowTop + 8, x + width, { color: CLAY, thickness: 0.4, opacity: 0.4 })
  }

  // ─── Total row ──────────────────────────────────────────────────
  let endY = rowTop
  if (totalRow) {
    rowTop -= 8
    // 1pt INK divider above the total row
    page.drawLine({
      start: { x, y: rowTop + 8 },
      end: { x: x + width, y: rowTop + 8 },
      color: INK,
      thickness: 1,
      opacity: 0.85,
    })
    rowTop -= 6
    page.drawText(safe(totalRow.label), {
      x,
      y: rowTop,
      size: 14,
      font: fonts.sansMedium,
      color: INK,
    })
    const valueTxt = safe(totalRow.value)
    const vw = fonts.sansMedium.widthOfTextAtSize(valueTxt, 16)
    page.drawText(valueTxt, {
      x: x + width - vw,
      y: rowTop,
      size: 16,
      font: fonts.sansMedium,
      color: INK,
    })
    endY = rowTop - 8
  }

  return { endY }
}

export interface DrawNotesBlockOpts {
  x: number
  y: number
  width: number
  headerLabel: string
  body: string
  fonts: EditorialFonts
}

/**
 * Editorial notes block — 2pt CLAY border-left + letter-spaced CLAY
 * 11pt header + 11pt INK body word-wrapped at line-height 14.
 * Returns the y-cursor after the bottom edge.
 */
export function drawNotesBlock(
  page: PDFPage,
  opts: DrawNotesBlockOpts,
): { endY: number } {
  const { x, y, width, headerLabel, body, fonts } = opts
  const padX = 12
  const safe = fonts.safe

  // Header label
  page.drawText(safe(headerLabel), {
    x: x + padX,
    y,
    size: 11,
    font: fonts.sansMedium,
    color: CLAY,
  })

  // Body wrapped 11pt INK
  const bodyEndY = drawWrappedText(page, x + padX, y - 18, body, {
    maxWidth: width - padX - 4,
    lineHeight: 14,
    font: fonts.sans,
    size: 11,
    color: INK,
    safe,
  })

  // 2pt CLAY accent on the left edge (drawn after content so it
  // overlays cleanly).
  const topY = y + 8
  const bottomY = bodyEndY - 2
  page.drawRectangle({
    x,
    y: bottomY,
    width: 2,
    height: topY - bottomY,
    color: CLAY,
    opacity: 0.85,
  })

  return { endY: bottomY }
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
