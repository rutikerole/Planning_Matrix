// ───────────────────────────────────────────────────────────────────────
// Phase 3.4 #55 — PDF font loader
//
// pdf-lib embeds either built-in PDF fonts (Helvetica family — free,
// always available) or custom TTF fonts via fontkit. We prefer the
// brand stack (Inter + Instrument Serif) so the exported PDF reads as
// a real architectural-firm document; we fall back to Helvetica when
// the TTF assets are absent (see /public/fonts/README.md).
//
// This module is imported only from `exportPdf.ts`, which itself is
// dynamic-imported from the ExportMenu component, so neither pdf-lib
// nor fontkit nor the TTF binaries ship in the main JS bundle —
// they're loaded on demand when the user clicks Export.
// ───────────────────────────────────────────────────────────────────────

import type { PDFDocument, PDFFont } from 'pdf-lib'
import { StandardFonts } from 'pdf-lib'

export interface BrandFonts {
  /** Body sans for paragraphs + section bodies. */
  inter: PDFFont
  /** Heavier sans for titles + Top-3 row titles. */
  interMedium: PDFFont
  /** Italic Serif for sub copy + footers + drop-caps. */
  serifItalic: PDFFont
  /** Display Serif for the cover page intent line. */
  serif: PDFFont
  /** True when at least one brand font failed to load and we fell back. */
  usingFallback: boolean
}

const FONT_PATHS = {
  inter: '/fonts/Inter-Regular.ttf',
  interMedium: '/fonts/Inter-Medium.ttf',
  serifItalic: '/fonts/InstrumentSerif-Italic.ttf',
  serif: '/fonts/InstrumentSerif-Regular.ttf',
}

async function fetchTtf(path: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

/**
 * Embed brand fonts into a pdf-lib document. Falls back to Helvetica
 * when any TTF is missing — every consumer ends up with four valid
 * PDFFont handles regardless. fontkit is registered up front so
 * embedFont(buffer) accepts arbitrary TTFs.
 */
export async function loadBrandFonts(doc: PDFDocument): Promise<BrandFonts> {
  // pdf-lib needs fontkit for custom TTF embedding. Fontkit is heavy;
  // dynamic-import only when we have at least one TTF to embed.
  const buffers = await Promise.all([
    fetchTtf(FONT_PATHS.inter),
    fetchTtf(FONT_PATHS.interMedium),
    fetchTtf(FONT_PATHS.serifItalic),
    fetchTtf(FONT_PATHS.serif),
  ])
  const allMissing = buffers.every((b) => b === null)

  if (allMissing) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        '[fontLoader] No brand TTFs in /public/fonts — falling back to Helvetica. ' +
          'See /public/fonts/README.md.',
      )
    }
    return helveticaFallback(doc)
  }

  // At least one TTF is present — register fontkit and embed what we
  // can; substitute Helvetica for any individual gap.
  const fontkit = (await import('@pdf-lib/fontkit')).default
  doc.registerFontkit(fontkit)

  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const helvOblique = await doc.embedFont(StandardFonts.HelveticaOblique)

  const inter = buffers[0] ? await doc.embedFont(buffers[0]) : helv
  const interMedium = buffers[1] ? await doc.embedFont(buffers[1]) : helvBold
  const serifItalic = buffers[2] ? await doc.embedFont(buffers[2]) : helvOblique
  const serif = buffers[3] ? await doc.embedFont(buffers[3]) : helv

  return {
    inter,
    interMedium,
    serifItalic,
    serif,
    usingFallback: buffers.some((b) => b === null),
  }
}

async function helveticaFallback(doc: PDFDocument): Promise<BrandFonts> {
  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const helvOblique = await doc.embedFont(StandardFonts.HelveticaOblique)
  return {
    inter: helv,
    interMedium: helvBold,
    serifItalic: helvOblique,
    serif: helv,
    usingFallback: true,
  }
}
