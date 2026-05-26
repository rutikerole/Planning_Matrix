// ───────────────────────────────────────────────────────────────────────
// v1.0.17 — Verification page (Section 10 · status + signature).
//
// Final-page editorial layout: intro paragraph + 2-column status
// panel (verification status card + data-quality stacked bar) + 2x
// signature fields (architect + chamber stamp).
//
// Data-quality % is Hamilton largest-remainder from v1.0.10 Bug 21:
//   count facts by qualifier.quality (VERIFIED / CALCULATED /
//   ASSUMED), then largest-remainder round to 100%.
// ───────────────────────────────────────────────────────────────────────

import { rgb, type PDFPage } from 'pdf-lib'
import {
  CLAY,
  INK,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PILL_ACTIVE,
  PILL_LEGAL_BG,
  PILL_PENDING,
  drawEditorialTitle,
  drawFooter,
  drawHairline,
  drawKicker,
  drawPaperBackground,
  drawSafeText,
  drawSignatureField,
  drawStackedBar,
  drawWrappedText,
  type EditorialFonts,
} from '../pdfPrimitives'
import { pdfStr, type PdfStrings } from '../pdfStrings'

export interface VerificationData {
  templateLabel: string
  bundeslandCode: string
  /** Counts of facts by qualifier.quality. */
  verifiedCount: number
  calculatedCount: number
  assumedCount: number
  /** v1.0.20 Polish 3 — pre-printed Bauherr name above the third
   *  signature line. Resolved by exportPdf assembly per the v1.0.14
   *  Bug 29 fallback chain (profile.full_name → user_metadata →
   *  email local-part → "Bauherr"/"Owner"). */
  bauherrName?: string
  /** v1.0.32 Bug 130 — true on a fully-verified brief; flips the intro from
   *  "this brief is preliminary" to the confirmed wording. */
  verified?: boolean
  /** v1.0.32 Bug 112 — self-attested verifying-architect identity, pre-printed
   *  above the architect / chamber signature lines on a fully-verified brief.
   *  Passed by exportPdf only when rollup.allVerified. Self-attested, not
   *  chamber-audited. */
  architectName?: string
  architectChamberNo?: string
  architectChamberState?: string
}

export interface VerificationFooterData {
  /** v1.0.32 Bug 111 — verified|preliminary footer center, set by exportPdf. */
  footerCenter?: string
  docNo: string
  totalPages: number
  pageNumber: number
}

/**
 * Hamilton largest-remainder: given fractional shares that sum to <1
 * due to floor rounding, distribute the leftover percentage points
 * to the largest remainders. Total always sums to exactly 100.
 */
function hamilton(counts: ReadonlyArray<number>): number[] {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return counts.map(() => 0)
  const raw = counts.map((c) => (c / total) * 100)
  const floored = raw.map(Math.floor)
  const sumFloored = floored.reduce((a, b) => a + b, 0)
  let leftover = 100 - sumFloored
  const remainders = raw.map((r, i) => ({ idx: i, rem: r - floored[i] }))
  remainders.sort((a, b) => b.rem - a.rem)
  const out = floored.slice()
  for (let i = 0; leftover > 0 && i < remainders.length; i++, leftover--) {
    out[remainders[i].idx]++
  }
  return out
}

export function renderVerificationBody(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: VerificationData,
): void {
  drawPaperBackground(page)
  const headerY = PAGE_HEIGHT - MARGIN - 8
  drawKicker(page, MARGIN, headerY, pdfStr(strings, 'verif.kicker'), fonts)
  drawEditorialTitle(
    page,
    MARGIN,
    headerY - 32,
    pdfStr(strings, 'verif.title'),
    fonts,
  )

  // Intro paragraph
  drawWrappedText(page, MARGIN, headerY - 70, pdfStr(strings, data.verified ? 'verif.sub.verified' : 'verif.sub'), {
    maxWidth: PAGE_WIDTH - 2 * MARGIN,
    lineHeight: 16,
    font: fonts.serifItalic,
    size: 12,
    color: CLAY,
    safe: fonts.safe,
  })

  // ─── 2-column status panel ─────────────────────────────────────
  const panelY = headerY - 130
  const panelHalfW = (PAGE_WIDTH - 2 * MARGIN - 24) / 2

  // Card 1 — VERIFICATION STATUS
  drawHairline(page, MARGIN, panelY + 2, MARGIN + 60, {
    color: INK,
    thickness: 1,
    opacity: 0.55,
  })
  drawSafeText(page, pdfStr(strings, 'verif.status.h'), {
    x: MARGIN,
    y: panelY - 18,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  drawWrappedText(
    page,
    MARGIN,
    panelY - 42,
    pdfStr(strings, data.verified ? 'verif.status.body.verified' : 'verif.status.body'),
    {
      maxWidth: panelHalfW,
      lineHeight: 14,
      font: fonts.sans,
      size: 11,
      color: INK,
      safe: fonts.safe,
    },
  )

  // Card 2 — DATA QUALITY
  const card2X = MARGIN + panelHalfW + 24
  drawHairline(page, card2X, panelY + 2, card2X + 60, {
    color: INK,
    thickness: 1,
    opacity: 0.55,
  })
  drawSafeText(page, pdfStr(strings, 'verif.dq.h'), {
    x: card2X,
    y: panelY - 18,
    size: 10,
    font: fonts.sansMedium,
    color: CLAY,
    safe: fonts.safe,
  })
  const counts = [data.verifiedCount, data.calculatedCount, data.assumedCount]
  const pct = hamilton(counts)
  const total = counts.reduce((a, b) => a + b, 0)
  const segments =
    total === 0
      ? [{ fraction: 1, color: rgb(0.92, 0.9, 0.84) }]
      : [
          { fraction: pct[0] / 100, color: PILL_ACTIVE },
          { fraction: pct[1] / 100, color: rgb(0.66, 0.78, 0.55) },
          { fraction: pct[2] / 100, color: PILL_PENDING },
        ]
  drawStackedBar(page, card2X, panelY - 50, panelHalfW, 14, segments)
  // Legend
  const legendY = panelY - 76
  const items = [
    {
      label: `${pct[0]}% ${pdfStr(strings, 'verif.dq.legend.verified')}`,
      color: PILL_ACTIVE,
    },
    {
      label: `${pct[1]}% ${pdfStr(strings, 'verif.dq.legend.calculated')}`,
      color: rgb(0.66, 0.78, 0.55),
    },
    {
      label: `${pct[2]}% ${pdfStr(strings, 'verif.dq.legend.assumed')}`,
      color: PILL_PENDING,
    },
  ]
  let legendX = card2X
  for (const item of items) {
    page.drawCircle({ x: legendX + 3, y: legendY + 3, size: 3, color: item.color })
    drawSafeText(page, item.label, {
      x: legendX + 12,
      y: legendY,
      size: 9,
      font: fonts.sans,
      color: CLAY,
      safe: fonts.safe,
    })
    const labelW = fonts.sans.widthOfTextAtSize(fonts.safe(item.label), 9)
    legendX += 12 + labelW + 12
  }

  // ─── Signature block ───────────────────────────────────────────
  const sigStartY = panelY - 140
  const sigHalfW = (PAGE_WIDTH - 2 * MARGIN - 40) / 2

  // v1.0.32 Bug 112 — pre-print the self-attested architect identity just above
  // the signature lines on a fully-verified brief (drawSignatureField puts the
  // hairline at y-56, so y-50 sits ~6pt above it). The earlier design left
  // these blank "never a fabricated name"; we now print the architect's own
  // attested name + chamber number, captured at verify time.
  if (data.architectName) {
    drawSafeText(page, data.architectName, {
      x: MARGIN,
      y: sigStartY - 50,
      size: 12,
      font: fonts.sansMedium,
      color: INK,
      safe: fonts.safe,
    })
  }
  const chamberLine = [data.architectChamberNo, data.architectChamberState]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join(' · ')
  if (chamberLine) {
    drawSafeText(page, chamberLine, {
      x: MARGIN + sigHalfW + 40,
      y: sigStartY - 50,
      size: 11,
      font: fonts.sans,
      color: INK,
      safe: fonts.safe,
    })
  }

  drawSignatureField(page, {
    x: MARGIN,
    y: sigStartY,
    width: sigHalfW,
    label: pdfStr(strings, 'sig.architect'),
    sublabel: pdfStr(strings, 'sig.date'),
    fonts,
  })
  drawSignatureField(page, {
    x: MARGIN + sigHalfW + 40,
    y: sigStartY,
    width: sigHalfW,
    label: pdfStr(strings, 'sig.chamber'),
    sublabel: pdfStr(strings, 'sig.date'),
    fonts,
  })

  // ─── v1.0.20 Polish 3 — Bauherr signature row (full width) ──
  // Architect + Chamber stamp signatures are professional-side
  // accreditation. The Bauantrag also requires Bauherr-co-signature
  // per BauO NRW — without it the Bauamt rejects the submission.
  // This third row makes the requirement explicit and pre-fills the
  // resolved Bauherr name above the signature line.
  const bauherrY = sigStartY - 100
  const fullW = PAGE_WIDTH - 2 * MARGIN
  // Pre-printed name above the signature line
  if (data.bauherrName) {
    drawSafeText(page, data.bauherrName, {
      x: MARGIN,
      y: bauherrY,
      size: 13,
      font: fonts.sansMedium,
      color: INK,
      safe: fonts.safe,
    })
  }
  // Full-width signature underline (drawSignatureField at fullW).
  // v1.0.31 C5 (Bug 60) — measure-then-place. The co-signature note was drawn
  // at a FIXED bauherrY-80, which lands between the Bauherr label (bauherrY-76)
  // and its Date sublabel (bauherrY-90) and overlapped both — the signature-
  // block collision deferred across v1.0.28/29/30. Anchor the note below the
  // field's returned endY instead (endY = lineY-36, i.e. 8pt below the
  // sublabel), so it can never overlap regardless of font metrics. The page
  // has ~240pt of clearance to the footer (panelY = headerY-130), so pushing
  // the note ~32pt lower than before stays well clear.
  const bauherrField = drawSignatureField(page, {
    x: MARGIN,
    y: bauherrY - 6,
    width: fullW,
    label: pdfStr(strings, 'sig.bauherr'),
    sublabel: pdfStr(strings, 'sig.date'),
    fonts,
  })
  // Italic-serif CLAY co-signature note, cleared 14pt below the field endY.
  drawSafeText(page, pdfStr(strings, 'sig.bauherr.note'), {
    x: MARGIN,
    y: bauherrField.endY - 14,
    size: 9,
    font: fonts.serifItalic,
    color: CLAY,
    safe: fonts.safe,
  })

  // Silence unused — PILL_LEGAL_BG is part of the design system but
  // not used on this page; the reference keeps the bundle quiet.
  void PILL_LEGAL_BG
}

export function renderVerificationFooter(
  page: PDFPage,
  fonts: EditorialFonts,
  strings: PdfStrings,
  data: VerificationFooterData,
): void {
  drawFooter(page, {
    left: data.docNo,
    center: data.footerCenter ?? pdfStr(strings, 'footer.preliminary'),
    right: `${data.pageNumber} / ${data.totalPages}`,
    fonts,
  })
}
