// ───────────────────────────────────────────────────────────────────────
// Phase 3.4 #55 — PDF brief exporter
//
// Builds a multi-page architectural-document PDF via pdf-lib:
//   • Page 1   — title page (wordmark + intent + address + axonometric +
//                "Vorläufig …" footer)
//   • Page 2   — TOP-3 next steps
//   • Page 3   — Bereiche (A/B/C) with hatched bands
//   • Pages 4+ — Verfahren / Dokumente / Fachplaner / Eckdaten as
//                schedule-block sections
//   • Last     — Audit timeline
//
// Brand fonts (Inter + Instrument Serif) load from /public/fonts via
// fontLoader; falls back to Helvetica when TTFs aren't deployed.
//
// The whole module is dynamic-imported from ExportMenu so pdf-lib +
// fontkit + the (future) brand TTFs only ship when the user clicks
// Export.
// ───────────────────────────────────────────────────────────────────────

import { PDFDocument, rgb, type PDFPage } from 'pdf-lib'
import { loadBrandFonts, type BrandFonts } from '@/lib/fontLoader'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'
import { winAnsiSafe } from '@/lib/winAnsiSafe'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { AreaState, ProjectState } from '@/types/projectState'

/**
 * Phase 3.6 #73 — sanitize unicode that pdf-lib's WinAnsi-encoded
 * Helvetica fallback can't draw. Active only when
 * fonts.usingFallback === true; fontkit + brand TTFs handle full
 * unicode natively. Module-scope mutable: set once at the top of
 * buildExportPdf, read by helper functions. The PDF build is a
 * single synchronous pipeline driven from one entry point, so
 * sharing this here is safe in practice.
 */
let safe: (s: string) => string = (s: string) => s

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface BuildArgs {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  lang: 'de' | 'en'
}

// ── Color tokens (mirrored from globals.css) ───────────────────────
const INK = rgb(0.13, 0.14, 0.16) // hsl(220 16% 11%)
const INK_MUTED = rgb(0.13, 0.14, 0.16)
const CLAY = rgb(0.51, 0.41, 0.32) // hsl(25 30% 38%)
const CLAY_DEEP = rgb(0.36, 0.31, 0.25) // hsl(25 32% 28%)
const DRAFTING_BLUE = rgb(0.32, 0.41, 0.51) // hsl(212 38% 32%)
const PAPER = rgb(0.97, 0.96, 0.93) // hsl(38 30% 97%)

const PAGE_WIDTH = 595.28 // A4 portrait in points
const PAGE_HEIGHT = 841.89
const MARGIN = 56

const STATE_LABELS_DE: Record<AreaState, string> = {
  ACTIVE: 'AKTIV',
  PENDING: 'AUSSTEHEND',
  VOID: 'NICHT ERMITTELBAR',
}
const STATE_LABELS_EN: Record<AreaState, string> = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  VOID: 'NOT DETERMINABLE',
}

/**
 * Build the PDF and return its bytes. Caller pipes to a Blob + saveAs.
 */
export async function buildExportPdf({
  project,
  events,
  lang,
}: BuildArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${project.name} — Planning Matrix`)
  doc.setCreator('Planning Matrix')
  doc.setProducer('Planning Matrix')

  const fonts = await loadBrandFonts(doc)
  safe = fonts.usingFallback ? winAnsiSafe : (s: string) => s

  const state = (project.state ?? {}) as Partial<ProjectState>

  // ── Page 1: title ──────────────────────────────────────────────
  await drawTitlePage(doc, fonts, project, lang)

  // ── Page 2: TOP-3 ──────────────────────────────────────────────
  const recs = (state.recommendations ?? []).slice().sort((a, b) => a.rank - b.rank).slice(0, 3)
  if (recs.length > 0) {
    drawTop3Page(doc, fonts, recs, lang)
  }

  // ── Page 3: Bereiche ───────────────────────────────────────────
  if (state.areas) {
    drawBereichePage(doc, fonts, state.areas, lang)
  }

  // ── Schedule sections ──────────────────────────────────────────
  const procs = state.procedures ?? []
  const docs = state.documents ?? []
  const roles = state.roles ?? []
  const facts = state.facts ?? []

  if (procs.length + docs.length + roles.length + facts.length > 0) {
    let { page, y } = startPage(doc)
    drawSectionHeader(page, fonts, y, lang === 'en' ? 'IV  PROCEDURES' : 'IV  VERFAHREN')
    y -= 30
    if (procs.length === 0) {
      page.drawText(safe(lang === 'en' ? '- None recorded.' : '- Noch nicht erfasst.'), {
        x: MARGIN + 40,
        y,
        size: 11,
        font: fonts.serifItalic,
        color: CLAY,
      })
      y -= 24
    } else {
      for (const p of procs) {
        const result = drawScheduleEntry({
          doc,
          page,
          fonts,
          y,
          index: procs.indexOf(p) + 1,
          title: lang === 'en' ? p.title_en : p.title_de,
          meta: STATE_LABELS_DE[p.status as AreaState] ?? p.status.toUpperCase(),
          body: (lang === 'en' ? p.rationale_en : p.rationale_de) ?? '',
          qualifier: `${p.qualifier.source} · ${p.qualifier.quality}`,
        })
        page = result.page
        y = result.y
      }
    }

    if (docs.length > 0) {
      ;({ page, y } = ensureSpace(doc, page, y, 80))
      y -= 12
      drawSectionHeader(
        page,
        fonts,
        y,
        lang === 'en' ? 'V  DOCUMENTS' : 'V  DOKUMENTE',
      )
      y -= 30
      for (const d of docs) {
        const result = drawScheduleEntry({
          doc,
          page,
          fonts,
          y,
          index: docs.indexOf(d) + 1,
          title: lang === 'en' ? d.title_en : d.title_de,
          meta: d.status.toUpperCase(),
          body:
            d.required_for.length > 0
              ? `${lang === 'en' ? 'Required for' : 'Erforderlich für'}: ${d.required_for.join(', ')}`
              : '',
          qualifier: `${d.qualifier.source} · ${d.qualifier.quality}`,
        })
        page = result.page
        y = result.y
      }
    }

    if (roles.length > 0) {
      ;({ page, y } = ensureSpace(doc, page, y, 80))
      y -= 12
      drawSectionHeader(
        page,
        fonts,
        y,
        lang === 'en' ? 'VI  SPECIALISTS' : 'VI  FACHPLANER',
      )
      y -= 30
      const sorted = roles
        .slice()
        .sort((a, b) => (a.needed === b.needed ? 0 : a.needed ? -1 : 1))
      for (const r of sorted) {
        const tag = r.needed
          ? lang === 'en' ? 'NEEDED' : 'ERFORDERLICH'
          : lang === 'en' ? 'NOT NEEDED' : 'NICHT ERFORDERLICH'
        const result = drawScheduleEntry({
          doc,
          page,
          fonts,
          y,
          index: sorted.indexOf(r) + 1,
          title: lang === 'en' ? r.title_en : r.title_de,
          meta: tag,
          body: r.rationale_de ?? '',
          qualifier: `${r.qualifier.source} · ${r.qualifier.quality}`,
        })
        page = result.page
        y = result.y
      }
    }

    if (facts.length > 0) {
      ;({ page, y } = ensureSpace(doc, page, y, 80))
      y -= 12
      drawSectionHeader(
        page,
        fonts,
        y,
        lang === 'en' ? 'VII  KEY DATA' : 'VII  ECKDATEN',
      )
      y -= 30
      for (const f of facts) {
        const result = drawScheduleEntry({
          doc,
          page,
          fonts,
          y,
          index: facts.indexOf(f) + 1,
          title: factLabel(f.key, lang).label,
          meta: '',
          body: factValueWithUnit(f.key, f.value, lang),
          qualifier: `${f.qualifier.source} · ${f.qualifier.quality}`,
        })
        page = result.page
        y = result.y
      }
    }
  }

  // ── Audit log ──────────────────────────────────────────────────
  if (events.length > 0) {
    let { page, y } = startPage(doc)
    drawSectionHeader(
      page,
      fonts,
      y,
      lang === 'en' ? 'VIII  AUDIT LOG' : 'VIII  AUDITSPUR',
    )
    y -= 30
    for (const ev of events.slice(0, 30)) {
      ;({ page, y } = ensureSpace(doc, page, y, 30))
      const when = formatDateTime(ev.created_at, lang)
      page.drawText(safe(when), {
        x: MARGIN,
        y,
        size: 9,
        font: fonts.serifItalic,
        color: CLAY_DEEP,
      })
      page.drawText(safe(`${ev.triggered_by}  ·  ${ev.event_type}`), {
        x: MARGIN + 130,
        y,
        size: 10,
        font: fonts.inter,
        color: INK,
      })
      y -= 14
      if (ev.reason) {
        page.drawText(safe(ev.reason), {
          x: MARGIN + 130,
          y,
          size: 9,
          font: fonts.serifItalic,
          color: rgb(0.13, 0.14, 0.16),
          opacity: 0.55,
        })
        y -= 14
      }
      y -= 4
    }
  }

  // ── Page footers (every page) ──────────────────────────────────
  const allPages = doc.getPages()
  const today = formatDate(new Date().toISOString(), lang)
  const footer = `${lang === 'en' ? 'Generated with Planning Matrix' : 'Generiert mit Planning Matrix'}  ·  planning-matrix.app  ·  ${today}`
  allPages.forEach((p, i) => {
    p.drawText(safe(footer), {
      x: MARGIN,
      y: 28,
      size: 8,
      font: fonts.inter,
      color: rgb(0.13, 0.14, 0.16),
      opacity: 0.55,
    })
    p.drawText(safe(`${i + 1} / ${allPages.length}`), {
      x: PAGE_WIDTH - MARGIN - 40,
      y: 28,
      size: 8,
      font: fonts.inter,
      color: rgb(0.13, 0.14, 0.16),
      opacity: 0.55,
    })
  })

  return await doc.save()
}

// ── Page builders ──────────────────────────────────────────────────

function startPage(doc: PDFDocument): { page: PDFPage; y: number } {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  return { page, y: PAGE_HEIGHT - MARGIN }
}

function ensureSpace(
  doc: PDFDocument,
  page: PDFPage,
  y: number,
  needed: number,
): { page: PDFPage; y: number } {
  if (y - needed > MARGIN + 30) return { page, y }
  return startPage(doc)
}

async function drawTitlePage(
  doc: PDFDocument,
  fonts: BrandFonts,
  project: ProjectRow,
  lang: 'de' | 'en',
) {
  const { page } = startPage(doc)

  // Wordmark up top
  page.drawText(safe('Planning Matrix'), {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 6,
    size: 11,
    font: fonts.interMedium,
    color: INK,
  })

  // Eyebrow
  page.drawText(
    safe(
      lang === 'en' ? 'PROJECT  ·  EXPORTED PROJECT BRIEF' : 'PROJEKT  ·  EXPORT-BRIEFING',
    ),
    {
      x: MARGIN,
      y: PAGE_HEIGHT / 2 + 60,
      size: 10,
      font: fonts.interMedium,
      color: CLAY,
    },
  )

  // Intent (display)
  page.drawText(safe(project.name), {
    x: MARGIN,
    y: PAGE_HEIGHT / 2 + 20,
    size: 28,
    font: fonts.serif,
    color: INK,
  })

  // Address
  if (project.plot_address) {
    page.drawText(safe(project.plot_address), {
      x: MARGIN,
      y: PAGE_HEIGHT / 2 - 8,
      size: 14,
      font: fonts.serifItalic,
      color: rgb(0.13, 0.14, 0.16),
      opacity: 0.65,
    })
  }

  // Hairline
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT / 2 - 30 },
    end: { x: MARGIN + 96, y: PAGE_HEIGHT / 2 - 30 },
    thickness: 0.5,
    color: INK,
    opacity: 0.25,
  })

  // Created
  page.drawText(
    safe(`${lang === 'en' ? 'Created' : 'Erstellt'}: ${formatDate(project.created_at, lang)}`),
    {
      x: MARGIN,
      y: PAGE_HEIGHT / 2 - 50,
      size: 10,
      font: fonts.inter,
      color: INK_MUTED,
      opacity: 0.7,
    },
  )

  // Axonometric placeholder — simple hand-drawn building glyph
  drawAxonometricGlyph(page, MARGIN, PAGE_HEIGHT / 2 - 200, 120)

  // Footer caveat. Em-dashes flattened to hyphens unconditionally so
  // the literal copy doesn't depend on the runtime sanitizer being
  // active; safe() also runs in case the source ever drifts.
  // Umlauts are Latin-1 and survive Helvetica intact.
  page.drawText(
    safe(
      lang === 'en'
        ? 'Preliminary - to be confirmed by a certified architect (Bauvorlageberechtigte/r).'
        : 'Vorläufig - bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.',
    ),
    {
      x: MARGIN,
      y: MARGIN + 56,
      size: 9,
      font: fonts.serifItalic,
      color: CLAY,
      maxWidth: PAGE_WIDTH - MARGIN * 2,
    },
  )
}

function drawAxonometricGlyph(page: PDFPage, x: number, y: number, size: number) {
  // Simple isometric cube — three parallelograms in drafting-blue.
  const s = size / 16
  const stroke = (
    p1: [number, number],
    p2: [number, number],
    opacity = 0.55,
  ) => {
    page.drawLine({
      start: { x: x + p1[0] * s, y: y - p1[1] * s + size },
      end: { x: x + p2[0] * s, y: y - p2[1] * s + size },
      thickness: 1.25,
      color: DRAFTING_BLUE,
      opacity,
    })
  }
  // Front face
  stroke([3, 8], [10, 8])
  stroke([10, 8], [10, 14])
  stroke([10, 14], [3, 14])
  stroke([3, 14], [3, 8])
  // Right face
  stroke([10, 8], [13, 5])
  stroke([13, 5], [13, 11])
  stroke([13, 11], [10, 14])
  // Top face
  stroke([3, 8], [6, 5])
  stroke([6, 5], [13, 5])
}

function drawTop3Page(
  doc: PDFDocument,
  fonts: BrandFonts,
  recs: NonNullable<ProjectState['recommendations']>,
  lang: 'de' | 'en',
) {
  const { page } = startPage(doc)
  let y = PAGE_HEIGHT - MARGIN
  drawSectionHeader(
    page,
    fonts,
    y,
    lang === 'en' ? 'I  TOP 3 NEXT STEPS' : 'I  TOP 3 SCHRITTE',
  )
  y -= 50
  recs.forEach((rec, idx) => {
    const title = lang === 'en' ? rec.title_en : rec.title_de
    const detail = lang === 'en' ? rec.detail_en : rec.detail_de
    // Drafting-blue left edge
    page.drawLine({
      start: { x: MARGIN - 8, y: y - 60 },
      end: { x: MARGIN - 8, y },
      thickness: 0.7,
      color: DRAFTING_BLUE,
      opacity: 0.35,
    })
    // Italic-Serif numeral
    page.drawText(safe(`${idx + 1}.`), {
      x: MARGIN,
      y: y - 4,
      size: 22,
      font: fonts.serifItalic,
      color: CLAY_DEEP,
    })
    // Title
    page.drawText(safe(title), {
      x: MARGIN + 28,
      y,
      size: 14,
      font: fonts.interMedium,
      color: INK,
      maxWidth: PAGE_WIDTH - MARGIN * 2 - 28,
    })
    y -= 22
    // Detail
    if (detail) {
      const wrapped = wrapText(detail, 80)
      wrapped.forEach((line) => {
        page.drawText(safe(line), {
          x: MARGIN + 28,
          y,
          size: 11,
          font: fonts.inter,
          color: INK,
          opacity: 0.85,
        })
        y -= 14
      })
    }
    // Footer caveat. Em-dash flattened — same rationale as the cover.
    y -= 4
    page.drawText(
      safe(
        lang === 'en'
          ? 'Preliminary - to be confirmed by a certified architect (Bauvorlageberechtigte/r).'
          : 'Vorläufig - bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.',
      ),
      {
        x: MARGIN + 28,
        y,
        size: 9,
        font: fonts.serifItalic,
        color: rgb(0.13, 0.14, 0.16),
        opacity: 0.55,
      },
    )
    y -= 36
  })
}

function drawBereichePage(
  doc: PDFDocument,
  fonts: BrandFonts,
  areas: NonNullable<ProjectState['areas']>,
  lang: 'de' | 'en',
) {
  const { page } = startPage(doc)
  let y = PAGE_HEIGHT - MARGIN
  drawSectionHeader(
    page,
    fonts,
    y,
    lang === 'en' ? 'II  AREAS  (PLAN SECTION)' : 'II  BEREICHE  (SCHNITT)',
  )
  y -= 50

  const stateLabels = lang === 'en' ? STATE_LABELS_EN : STATE_LABELS_DE
  const labels: Record<'A' | 'B' | 'C', { de: string; en: string }> = {
    A: { de: 'Planungsrecht', en: 'Planning law' },
    B: { de: 'Bauordnungsrecht', en: 'Building law' },
    C: { de: 'Sonstige Vorgaben', en: 'Other requirements' },
  }

  // Plan-section diagram: three horizontal hatched bands
  const diagramX = MARGIN
  const diagramY = y - 100
  const diagramW = PAGE_WIDTH - MARGIN * 2
  const bandH = 30
  ;(['A', 'B', 'C'] as const).forEach((key, idx) => {
    const a = areas[key]
    if (!a) return
    const bandTop = diagramY - idx * bandH

    // Frame
    page.drawLine({
      start: { x: diagramX, y: bandTop },
      end: { x: diagramX + diagramW, y: bandTop },
      thickness: 0.5,
      color: INK,
      opacity: 0.3,
    })

    // Hatching by state
    if (a.state === 'ACTIVE') {
      drawHatching(page, diagramX, bandTop - bandH, diagramW, bandH, 4, DRAFTING_BLUE, 0.55)
    } else if (a.state === 'PENDING') {
      drawHatching(page, diagramX, bandTop - bandH, diagramW, bandH, 8, CLAY, 0.35)
    } else if (a.state === 'VOID') {
      // Dashed strikethrough
      page.drawLine({
        start: { x: diagramX + 6, y: bandTop - bandH + 4 },
        end: { x: diagramX + diagramW - 6, y: bandTop - 4 },
        thickness: 0.6,
        color: INK,
        opacity: 0.25,
        dashArray: [3, 3],
      })
    }

    // Letter notch on the left
    page.drawRectangle({
      x: diagramX + 4,
      y: bandTop - bandH + 7,
      width: 16,
      height: 16,
      color: PAPER,
      borderColor: INK,
      borderWidth: 0.5,
      borderOpacity: 0.3,
    })
    page.drawText(safe(key), {
      x: diagramX + 8,
      y: bandTop - bandH + 11,
      size: 11,
      font: fonts.serifItalic,
      color: CLAY_DEEP,
    })
  })

  // Last divider
  page.drawLine({
    start: { x: diagramX, y: diagramY - bandH * 3 },
    end: { x: diagramX + diagramW, y: diagramY - bandH * 3 },
    thickness: 0.5,
    color: INK,
    opacity: 0.3,
  })

  // Legend below the diagram
  let legendY = diagramY - bandH * 3 - 30
  ;(['A', 'B', 'C'] as const).forEach((key) => {
    const a = areas[key]
    if (!a) return
    const labelText = `${key}  ${labels[key][lang]}`
    page.drawText(safe(labelText), {
      x: MARGIN,
      y: legendY,
      size: 12,
      font: fonts.interMedium,
      color: INK,
    })
    page.drawText(safe(stateLabels[a.state]), {
      x: MARGIN + 200,
      y: legendY,
      size: 10,
      font: fonts.interMedium,
      color: a.state === 'ACTIVE' ? CLAY : a.state === 'VOID' ? INK_MUTED : CLAY,
      opacity: a.state === 'VOID' ? 0.4 : 1,
    })
    legendY -= 18
    if (a.reason) {
      page.drawText(safe(a.reason), {
        x: MARGIN,
        y: legendY,
        size: 10,
        font: fonts.serifItalic,
        color: INK,
        opacity: 0.65,
        maxWidth: PAGE_WIDTH - MARGIN * 2,
      })
      legendY -= 18
    }
    legendY -= 6
  })
}

function drawHatching(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  spacing: number,
  color: ReturnType<typeof rgb>,
  opacity: number,
) {
  // Diagonal lines from top-left to bottom-right at 45°.
  for (let off = 0; off < w + h; off += spacing) {
    const x1 = Math.max(x, x + off - h)
    const y1 = Math.min(y + h, y + off)
    const x2 = Math.min(x + w, x + off)
    const y2 = Math.max(y, y + off - w)
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 0.5,
      color,
      opacity,
    })
  }
}

function drawSectionHeader(page: PDFPage, fonts: BrandFonts, y: number, title: string) {
  // Italic Serif numeral + uppercase tracked title
  page.drawText(safe(title), {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.interMedium,
    color: CLAY,
    opacity: 0.85,
  })
  page.drawLine({
    start: { x: MARGIN, y: y - 6 },
    end: { x: PAGE_WIDTH - MARGIN, y: y - 6 },
    thickness: 0.5,
    color: INK,
    opacity: 0.18,
  })
}

interface ScheduleEntryArgs {
  doc: PDFDocument
  page: PDFPage
  fonts: BrandFonts
  y: number
  index: number
  title: string
  meta: string
  body: string
  qualifier: string
}

function drawScheduleEntry({
  doc,
  page,
  fonts,
  y,
  index,
  title,
  meta,
  body,
  qualifier,
}: ScheduleEntryArgs): { page: PDFPage; y: number } {
  // Need at minimum ~64 px of vertical space.
  ;({ page, y } = ensureSpace(doc, page, y, 64))

  // Italic Serif row index in 24px column on the left
  page.drawText(safe(String(index).padStart(2, '0')), {
    x: MARGIN,
    y: y - 2,
    size: 11,
    font: fonts.serifItalic,
    color: CLAY,
    opacity: 0.55,
  })

  // Title
  page.drawText(safe(title), {
    x: MARGIN + 32,
    y,
    size: 12,
    font: fonts.interMedium,
    color: INK,
    maxWidth: PAGE_WIDTH - MARGIN * 2 - 100 - 32,
  })
  if (meta) {
    page.drawText(safe(meta), {
      x: PAGE_WIDTH - MARGIN - 100,
      y,
      size: 9,
      font: fonts.interMedium,
      color: CLAY,
    })
  }
  y -= 16

  if (body) {
    const wrapped = wrapText(body, 72)
    wrapped.slice(0, 3).forEach((line) => {
      page.drawText(safe(line), {
        x: MARGIN + 32,
        y,
        size: 10,
        font: fonts.inter,
        color: INK,
        opacity: 0.7,
      })
      y -= 13
    })
  }

  if (qualifier) {
    page.drawText(safe(qualifier), {
      x: MARGIN + 32,
      y,
      size: 8,
      font: fonts.serifItalic,
      color: CLAY,
      opacity: 0.7,
    })
    y -= 14
  }

  y -= 6
  return { page, y }
}

// ── Helpers ────────────────────────────────────────────────────────

function wrapText(text: string, charsPerLine: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (cur.length + w.length + 1 > charsPerLine) {
      lines.push(cur)
      cur = w
    } else {
      cur = cur ? `${cur} ${w}` : w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function formatDate(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
