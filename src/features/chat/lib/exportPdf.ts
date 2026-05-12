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
import { winAnsiSafe, decomposeLigatures, preventBrandLigatures } from '@/lib/winAnsiSafe'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { AreaState, ProjectState } from '@/types/projectState'
// v1.0.6 Bug 2 — PDF brief now mirrors the Cost & Timeline, Team &
// Stakeholders, and Suggestions/Recommendations surfaces. Imports use
// the same engines as the result-page tabs so the two surfaces cannot
// drift.
import {
  buildCostBreakdown,
  describeCostInputs,
  detectAreaSqm,
  detectKlasse,
  detectProcedure,
  formatEurRange,
  resolveAreaSqmByTemplate,
  resolveInputs,
} from '@/features/result/lib/costNormsMuenchen'
// v1.0.13 → v1.0.14 — PDF Renaissance Part 2 imports. The
// PDF_CLAY / PDF_MARGIN / PDF_PAPER aliases that v1.0.13 used for
// the mask-and-redraw finalizePageFooters helper were dropped in
// the v1.0.14 Bug 28 Path A split (cover/TOC footers now render
// AFTER total page count is known, so no placeholder + no mask).
import {
  PAGE_HEIGHT as PDF_PAGE_HEIGHT,
  PAGE_WIDTH as PDF_PAGE_WIDTH,
  resolveEditorialFonts,
} from './pdfPrimitives'
import {
  deriveDocNo,
  formatCoverDate,
  renderCoverFooter,
  renderCoverPage,
} from './pdfSections/cover'
import { renderTocFooter, renderTocPage } from './pdfSections/toc'
import {
  pdfStr,
  resolvePdfStrings,
  type PdfLang,
} from './pdfStrings'
import { getStateLocalization } from '@/legal/stateLocalization'
import {
  PROCEDURE_PHASES,
  totalPhaseWeight,
} from '@/features/result/lib/composeTimeline'
import { findCostRationale } from '@/data/costRationales'
import { pickSmartSuggestions } from '@/features/result/lib/smartSuggestionsMatcher'

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
  /** v1.0.14 Bug 29 — resolved display name for the project owner.
   *  Resolved by the caller (ExportMenu) from profile.full_name /
   *  user.user_metadata.full_name / user.email local-part, with
   *  "Bauherr"/"Owner" as final fallback. Threading the resolution
   *  here so the PDF composer stays a pure renderer (no Supabase
   *  queries during PDF build). */
  bauherrName?: string
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

// v1.0.6 Bug 2 — stakeholder block mirrors src/features/result/components/
// tabs/TeamTab.tsx:STAKEHOLDERS verbatim so the PDF cannot drift from the
// in-app card grid. Four-actor mental model: Owner / Architect /
// Engineers / Building authority.
const STAKEHOLDERS_PDF: ReadonlyArray<{
  titleDe: string
  titleEn: string
  detailDe: string
  detailEn: string
}> = [
  {
    titleDe: 'Bauherr:in',
    titleEn: 'Owner',
    detailDe: 'Sie. Beauftragt das Vorhaben, trägt die Kosten, entscheidet.',
    detailEn: 'You. Commissions the project, carries the costs, decides.',
  },
  {
    titleDe: 'Architekt:in',
    titleEn: 'Architect',
    detailDe: 'Bauvorlageberechtigt. Reicht im Namen der Bauherrschaft ein.',
    detailEn: "Licensed for submissions. Files on the owner's behalf.",
  },
  {
    titleDe: 'Fachplaner:innen',
    titleEn: 'Engineers',
    detailDe: 'Tragwerksplanung, Energieberatung, Brandschutz, Vermessung.',
    detailEn: 'Structural, energy, fire protection, surveying.',
  },
  {
    titleDe: 'Bauamt',
    titleEn: 'Building authority',
    detailDe: 'Kommunale Genehmigungsbehörde. Prüft und entscheidet.',
    detailEn: 'Municipal permitting body. Reviews and decides.',
  },
]

/**
 * Build the PDF and return its bytes. Caller pipes to a Blob + saveAs.
 */
export async function buildExportPdf({
  project,
  events,
  lang,
  bauherrName: bauherrNameArg,
}: BuildArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${project.name} — Planning Matrix`)
  doc.setCreator('Planning Matrix')
  doc.setProducer('Planning Matrix')

  const fonts = await loadBrandFonts(doc)
  // v1.0.11 Bug 22 — ALWAYS decompose literal U+FB0x ligature
  // codepoints regardless of font path. On the brand-TTF path
  // (Inter + Instrument Serif) ALSO inject ZWNJ between f+i/l/f
  // letter pairs to prevent fontkit's layout() from applying
  // OpenType `liga` GSUB substitution at PDF embed time — the
  // ligature glyphs otherwise round-trip through some PDF viewers'
  // text-extraction layer as "ċ" / "Č" / similar substitute
  // codepoints. ZWNJ is outside WinAnsi so the fallback path
  // skips it (winAnsiSafe already strips zero-widths there).
  safe = fonts.usingFallback
    ? (s: string) => winAnsiSafe(decomposeLigatures(s))
    : (s: string) => preventBrandLigatures(decomposeLigatures(s))

  const state = (project.state ?? {}) as Partial<ProjectState>

  // ── v1.0.13 PDF Renaissance Part 1: Cover + TOC ────────────────
  // Replaces the v1.0.6 drawTitlePage with the approved-prototype
  // cover page rendered via renderCoverPage primitive. New TOC page
  // inserts at page 2. Body sections (executive/areas/costs/timeline
  // /procedures/team/recommendations/keyData/audit) render unchanged
  // from v1.0.12 — Renaissance Parts 2-4 (v1.0.14+) redesign each
  // section after Rutik's visual checkpoint on this Part 1.
  // v1.0.14 Bug 30 — pass the already-loaded BrandFonts into
  // resolveEditorialFonts so cover/TOC and body share the SAME
  // PDFFont instances. Previously each call to loadBrandFonts
  // produced an independent font embed; the duplicate embeds
  // appear to have been the root cause of body-page ligature
  // corruption regressing in v1.0.13 (safe() wiring stayed intact;
  // the bug was upstream of safe() — pdf-lib was choosing different
  // subsets for the same TTFs depending on which embed code path
  // touched each character).
  const editorialFonts = await resolveEditorialFonts(doc, fonts)
  const pdfStrings = resolvePdfStrings(lang as PdfLang)
  const projectTitleForCover = project.name
  const bundeslandName = getStateLocalization(project.bundesland).labelDe
  const templateIntentKey = `template.${state.templateId ?? 'T-01'}`
  const templateLabel = pdfStr(pdfStrings, templateIntentKey)
  const createdDate = formatCoverDate(project.created_at, lang as PdfLang)
  const docNo = deriveDocNo(
    project.id,
    project.created_at,
    projectTitleForCover,
  )
  const revision = pdfStr(pdfStrings, 'cover.revisionValue')
  // v1.0.14 Bug 29 — bauherrName resolved by caller (ExportMenu)
  // from profile.full_name / user_metadata / email local-part with
  // localized "Bauherr"/"Owner" as final fallback. PDF composer
  // stays a pure renderer; no Supabase queries during build.
  const bauherrName =
    bauherrNameArg ?? (lang === 'de' ? 'Bauherr' : 'Owner')

  // Cover page (page 1). totalPages placeholder; finalizePageFooters
  // will rewrite once doc is fully built.
  const coverPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  renderCoverPage(coverPage, editorialFonts, pdfStrings, {
    projectTitle: projectTitleForCover,
    address: project.plot_address ?? '',
    bundeslandName,
    templateLabel,
    createdDate,
    docNo,
    revision,
    bauherrName,
    totalPages: 0,
  })

  // TOC page (page 2) — body sections start on page 3. Approximate
  // page numbers for sections that still inline-flow through the
  // v1.0.12 body (verification + glossary point at the last-known
  // body page; v1.0.14+ adds dedicated pages).
  const tocPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])

  // ── Body: existing v1.0.12 rendering, shifted by 2 (cover + TOC) ─
  const recs = (state.recommendations ?? []).slice().sort((a, b) => a.rank - b.rank).slice(0, 3)
  if (recs.length > 0) {
    drawTop3Page(doc, fonts, recs, lang)
  }

  // ── Page 3: Bereiche ───────────────────────────────────────────
  if (state.areas) {
    drawBereichePage(doc, fonts, state.areas, lang)
  }

  // ── Page 4: Costs (III COSTS) ──────────────────────────────────
  // v1.0.6 Bug 2 — mirror src/features/result/components/tabs/
  // CostTimelineTab.tsx. The numeric engine is the same; the PDF
  // surface adds the per-row rationale next to the EUR range and
  // calls out the inputs that drove the multiplier.
  drawCostsPage(doc, fonts, project, state, lang)

  // ── Page 5: Timeline (IV TIMELINE) ─────────────────────────────
  drawTimelinePage(doc, fonts, lang)

  // ── Schedule sections ──────────────────────────────────────────
  // Phase 8.5 (A.3): read through the resolve* helpers so PDF + result
  // page show the same data. Without this, the PDF Section IV printed
  // "None recorded" while the result page rendered the resolved
  // baseline (§ 58 BayBO etc.) — a contradiction the bauherr noticed.
  const { resolveProcedures } = await import('@/features/result/lib/resolveProcedures')
  const { resolveRoles } = await import('@/features/result/lib/resolveRoles')
  const resolvedProcs = resolveProcedures(project, state as ProjectState)
  const resolvedRoles = resolveRoles(project, state as ProjectState)
  const procs = resolvedProcs.procedures
  const docs = state.documents ?? []
  const roles = resolvedRoles.roles
  const facts = state.facts ?? []

  // v1.0.6 Bug 2 — TOC re-ordering: Procedures becomes V, Documents
  // becomes VI, Specialists becomes VII (renamed Team & Stakeholders),
  // then VIII Recommendations, IX Key Data. Audit log stays last as X.
  if (procs.length + docs.length + roles.length + facts.length > 0) {
    let { page, y } = startPage(doc)
    drawSectionHeader(page, fonts, y, lang === 'en' ? 'V  PROCEDURES' : 'V  VERFAHREN')
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

    // v1.0.12 Bug 26 — ALWAYS render section VI (Documents) so the
    // I..X numbering has no gaps. Previously the section was
    // conditional on docs.length > 0, which produced "V → VII → ..."
    // numbering on projects where the persona hadn't emitted any
    // documents yet. Empty state surfaces "(no documents recorded yet)"
    // honestly instead of skipping the header.
    {
      ;({ page, y } = ensureSpace(doc, page, y, 80))
      y -= 12
      drawSectionHeader(
        page,
        fonts,
        y,
        lang === 'en' ? 'VI  DOCUMENTS' : 'VI  DOKUMENTE',
      )
      y -= 30
      if (docs.length === 0) {
        page.drawText(
          safe(lang === 'en' ? '- No documents recorded yet.' : '- Noch keine Dokumente erfasst.'),
          {
            x: MARGIN + 40,
            y,
            size: 11,
            font: fonts.serifItalic,
            color: CLAY,
          },
        )
        y -= 24
      }
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

    // v1.0.6 Bug 2 — VII renamed Specialists → "Team & Stakeholders"
    // and extended with the four-actor stakeholder cards from
    // src/features/result/components/tabs/TeamTab.tsx. The section
    // always renders (so the Bauherr / Architekt / Fachplaner / Bauamt
    // narrative carries through even when roles[] is empty).
    ;({ page, y } = ensureSpace(doc, page, y, 80))
    y -= 12
    drawSectionHeader(
      page,
      fonts,
      y,
      lang === 'en' ? 'VII  TEAM & STAKEHOLDERS' : 'VII  TEAM & BETEILIGTE',
    )
    y -= 30
    if (roles.length > 0) {
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
          body:
            (lang === 'en' ? r.rationale_en || r.rationale_de : r.rationale_de) ?? '',
          qualifier: `${r.qualifier.source} · ${r.qualifier.quality}`,
        })
        page = result.page
        y = result.y
      }
      ;({ page, y } = ensureSpace(doc, page, y, 30))
      y -= 6
    }
    // Stakeholder block — always renders.
    const stakeEyebrow = lang === 'en' ? 'STAKEHOLDERS' : 'BETEILIGTE'
    page.drawText(safe(stakeEyebrow), {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.interMedium,
      color: CLAY,
      opacity: 0.85,
    })
    y -= 16
    for (const s of STAKEHOLDERS_PDF) {
      ;({ page, y } = ensureSpace(doc, page, y, 40))
      page.drawText(safe(lang === 'en' ? s.titleEn : s.titleDe), {
        x: MARGIN + 32,
        y,
        size: 11,
        font: fonts.interMedium,
        color: INK,
      })
      y -= 14
      const detail = wrapText(lang === 'en' ? s.detailEn : s.detailDe, 76)
      for (const line of detail) {
        page.drawText(safe(line), {
          x: MARGIN + 32,
          y,
          size: 10,
          font: fonts.inter,
          color: INK,
          opacity: 0.75,
        })
        y -= 13
      }
      y -= 6
    }

    // v1.0.6 Bug 2 — VIII RECOMMENDATIONS. Lists ALL recommendations
    // (not just the TOP-3 from page 2) plus smart suggestions matched
    // for the project. Each entry carries WHY + qualifier so the PDF
    // mirrors the in-app Suggestions tab.
    const recs = (state.recommendations ?? []).slice().sort((a, b) => a.rank - b.rank)
    const smartPicks = pickSmartSuggestions({ project, state: state as ProjectState })
    if (recs.length > 0 || smartPicks.length > 0) {
      ;({ page, y } = ensureSpace(doc, page, y, 80))
      y -= 12
      drawSectionHeader(
        page,
        fonts,
        y,
        lang === 'en' ? 'VIII  RECOMMENDATIONS' : 'VIII  EMPFEHLUNGEN',
      )
      y -= 30
      recs.forEach((r, idx) => {
        const qualLabel = r.qualifier
          ? formatRecommendationQualifier(r.qualifier)
          : ''
        const result = drawScheduleEntry({
          doc,
          page,
          fonts,
          y,
          index: idx + 1,
          title: lang === 'en' ? r.title_en : r.title_de,
          meta: '',
          body: (lang === 'en' ? r.detail_en : r.detail_de) ?? '',
          qualifier: qualLabel,
        })
        page = result.page
        y = result.y
      })
      // Smart suggestions appended below the explicit recs (continues
      // the index across the section so the document reads as one
      // recommendations list).
      smartPicks.forEach((s, idx) => {
        const result = drawScheduleEntry({
          doc,
          page,
          fonts,
          y,
          index: recs.length + idx + 1,
          title: lang === 'en' ? s.titleEn : s.titleDe,
          meta: lang === 'en' ? 'SMART · WHY' : 'SMART · WARUM',
          body: `${lang === 'en' ? s.bodyEn : s.bodyDe}  ·  ${lang === 'en' ? s.reasoningEn : s.reasoningDe}`,
          qualifier: 'LEGAL · CALCULATED',
        })
        page = result.page
        y = result.y
      })
    }

    if (facts.length > 0) {
      ;({ page, y } = ensureSpace(doc, page, y, 80))
      y -= 12
      drawSectionHeader(
        page,
        fonts,
        y,
        lang === 'en' ? 'IX  KEY DATA' : 'IX  ECKDATEN',
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
  // v1.0.6 Bug 2 — renumbered to X; if the list is truncated to 30,
  // the eyebrow surfaces "showing last 30 of N" so the reader knows
  // the export is partial.
  if (events.length > 0) {
    let { page, y } = startPage(doc)
    drawSectionHeader(
      page,
      fonts,
      y,
      lang === 'en' ? 'X  AUDIT LOG' : 'X  AUDITSPUR',
    )
    y -= 18
    if (events.length > 30) {
      page.drawText(
        safe(
          lang === 'en'
            ? `Showing last 30 of ${events.length} events.`
            : `Letzte 30 von ${events.length} Ereignissen.`,
        ),
        {
          x: MARGIN,
          y,
          size: 9,
          font: fonts.serifItalic,
          color: CLAY,
          opacity: 0.7,
        },
      )
      y -= 14
    }
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
  // v1.0.6 Bug 2 — every page now carries the locked Vorläufig footer
  // text, not just page 1. The Phase-13 legal shield messaging must
  // travel with the exported brief; the original PDF dropped it from
  // pages 2..N. Page 1 already prints the same line as part of the
  // cover composition (drawTitlePage), so we skip page 0 here to
  // avoid double-printing.
  const allPages = doc.getPages()
  const today = formatDate(new Date().toISOString(), lang)
  const footer = `${lang === 'en' ? 'Generated with Planning Matrix' : 'Generiert mit Planning Matrix'}  ·  planning-matrix.app  ·  ${today}`
  const vorlaeufig =
    lang === 'en'
      ? 'Preliminary - to be confirmed by a certified architect (Bauvorlageberechtigte/r).'
      : 'Vorläufig - bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.'
  // v1.0.13 — skip the existing y=28/y=44 footers on pages 1 (cover)
  // and 2 (TOC). Those pages have their own MARGIN+14 footers
  // rendered by renderCoverPage / renderTocPage. Body pages 3+ keep
  // the v1.0.6 footer styling unchanged for this checkpoint sprint.
  allPages.forEach((p, i) => {
    if (i <= 1) return // skip cover + TOC
    p.drawText(safe(vorlaeufig), {
      x: MARGIN,
      y: 44,
      size: 8,
      font: fonts.serifItalic,
      color: CLAY,
      maxWidth: PAGE_WIDTH - MARGIN * 2,
    })
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

  // v1.0.14 Bug 28 fix — back-fill the TOC body THEN draw cover + TOC
  // footers AFTER total page count is known. v1.0.13's placeholder-
  // then-mask approach left visible "X / ?" residue above the
  // PAPER-mask rectangle; the Path A split renders footer ONLY after
  // we know the total, so no placeholder is ever drawn.
  const totalPages = allPages.length
  renderTocPage(tocPage, editorialFonts, pdfStrings, {
    pageNumbers: computeTocPageNumbers(state),
    docNo,
    totalPages,
    tocPageNumber: 2,
  })
  renderCoverFooter(coverPage, editorialFonts, pdfStrings, {
    bauherrName,
    totalPages,
  })
  renderTocFooter(tocPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    tocPageNumber: 2,
  })

  return await doc.save()
}

/**
 * v1.0.13 — best-effort per-section page indices for the TOC.
 * Body sections still flow inline with ensureSpace breaks (v1.0.12
 * behaviour, untouched this sprint), so the actual page indices vary
 * with state size. For Königsallee-sized projects the executive
 * (TOP-3) lands page 3, areas page 4, costs page 5, timeline page 6,
 * procedures+ start page 7+. Sections not yet present in the body
 * (verification, glossary) point at the last-known body page.
 *
 * v1.0.14+ replaces this approximation with real per-section page
 * tracking when each section gets its own dedicated renderer.
 */
function computeTocPageNumbers(
  state: Partial<ProjectState>,
): {
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
} {
  // Heuristic page-shift: each "explicit" section adds one page; the
  // inline-flow body sections (procedures..audit) crowd on ~3 pages.
  const hasTop3 = (state.recommendations ?? []).length > 0
  const hasAreas = !!state.areas
  const exec = 3
  const areas = exec + (hasTop3 ? 1 : 0)
  const costs = areas + (hasAreas ? 1 : 0)
  const timeline = costs + 1
  // Inline flow: procedures + documents + team + recommendations +
  // keyData typically fit pages 7-9 for medium projects.
  const procedures = timeline + 1
  const documents = procedures
  const team = procedures + 1
  const recommendations = team
  const keyData = recommendations + 1
  // Verification + glossary are v1.0.14+ scope; point at last-known
  // page so the TOC entries render but don't lie about page numbers.
  const verification = keyData
  const glossary = keyData
  return {
    executive: exec,
    areas,
    costs,
    timeline,
    procedures,
    documents,
    team,
    recommendations,
    keyData,
    verification,
    glossary,
  }
}


// ── Page builders ──────────────────────────────────────────────────

// v1.0.12 Bug 25 — recommendation qualifier display normalization.
//
// The Phase 13 §6.B.01 qualifier-write gate downgrades any persona-
// emitted DESIGNER+VERIFIED claim to DESIGNER+ASSUMED (audit signal:
// "model attempted designer-source on a derived rec without an
// actual architect verification"). Storing DESIGNER+ASSUMED is the
// right audit state — it preserves the attempted-but-blocked
// posture — but rendering "DESIGNER · ASSUMED" on the result-page
// recommendation card mis-signals to the bauherr that an architect
// has touched the project when none has.
//
// Render-time normalization: when source=DESIGNER + quality=ASSUMED
// AND no actual designer verification has fired (i.e., the qualifier
// was set by the gate's downgrade path, not by a human designer),
// display as "LEGAL · CALCULATED" — the qualifier that matches the
// recommendation's actual derivation provenance (persona model
// computation against state). The DB row is unchanged.
//
// Future enhancement: if state.designer_verifications gains an
// explicit per-rec ledger, we can disambiguate "true DESIGNER+ASSUMED"
// (architect explicitly assumed a value) from "gate-downgraded
// DESIGNER+ASSUMED" (persona attempted DESIGNER+VERIFIED, gate
// enforced ASSUMED). Until then, the safer assumption is
// gate-downgraded — that's the only path that produces this state
// today.
function formatRecommendationQualifier(q: {
  source: string
  quality: string
}): string {
  if (q.source === 'DESIGNER' && q.quality === 'ASSUMED') {
    return 'LEGAL · CALCULATED'
  }
  return `${q.source} · ${q.quality}`
}

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

// v1.0.6 Bug 2 — Costs page (III). Mirrors src/features/result/components/
// tabs/CostTimelineTab.tsx. Same heuristic engine (buildCostBreakdown +
// resolveInputs), same per-row rationale (findCostRationale), same
// "Computed from: …" inputs line. Each row prints the label, the
// rationale below it, and the EUR range right-aligned.
function drawCostsPage(
  doc: PDFDocument,
  fonts: BrandFonts,
  project: ProjectRow,
  state: Partial<ProjectState>,
  lang: 'de' | 'en',
): void {
  let { page, y } = startPage(doc)
  drawSectionHeader(
    page,
    fonts,
    y,
    lang === 'en' ? 'III  COSTS' : 'III  KOSTEN',
  )
  y -= 30
  const procedures = state.procedures ?? []
  const primaryRationale =
    procedures.find((p) => p.status === 'erforderlich')?.rationale_de ??
    procedures[0]?.rationale_de ??
    ''
  const procedure = detectProcedure(primaryRationale)
  const corpus = (state.facts ?? [])
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  const klasse = detectKlasse(corpus)
  // v1.0.11 Bug 24 — per-template field map first, corpus regex
  // fallback. See CostTimelineTab.tsx for the same wiring + rationale.
  const areaSqm =
    resolveAreaSqmByTemplate(state.facts, state.templateId) ??
    detectAreaSqm(corpus)
  const opts = { areaSqm, bundesland: project.bundesland }
  const cost = buildCostBreakdown(procedure, klasse, opts)
  const inputs = resolveInputs(procedure, klasse, opts)
  const inputsLabel = describeCostInputs(inputs, lang)

  const rows: Array<{
    key: 'architekt' | 'tragwerksplanung' | 'vermessung' | 'energieberatung' | 'behoerdengebuehren'
    labelDe: string
    labelEn: string
  }> = [
    { key: 'architekt', labelDe: 'Architekt:in (LP 1–4)', labelEn: 'Architect (LP 1–4)' },
    { key: 'tragwerksplanung', labelDe: 'Tragwerksplanung', labelEn: 'Structural engineering' },
    { key: 'vermessung', labelDe: 'Vermessung', labelEn: 'Surveying' },
    { key: 'energieberatung', labelDe: 'Energieberatung', labelEn: 'Energy consultation' },
    { key: 'behoerdengebuehren', labelDe: 'Behördengebühren', labelEn: 'Authority fees' },
  ]
  for (const row of rows) {
    ;({ page, y } = ensureSpace(doc, page, y, 36))
    const rationale = findCostRationale(row.key, project.bundesland)
    page.drawText(safe(lang === 'en' ? row.labelEn : row.labelDe), {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.interMedium,
      color: INK,
    })
    page.drawText(safe(formatEurRange(cost[row.key], lang)), {
      x: PAGE_WIDTH - MARGIN - 140,
      y,
      size: 11,
      font: fonts.serifItalic,
      color: CLAY_DEEP,
    })
    y -= 13
    if (rationale) {
      page.drawText(
        safe(lang === 'en' ? rationale.rationaleEn : rationale.rationaleDe),
        {
          x: MARGIN,
          y,
          size: 9,
          font: fonts.serifItalic,
          color: CLAY,
          opacity: 0.85,
          maxWidth: PAGE_WIDTH - MARGIN * 2 - 160,
        },
      )
      y -= 12
    }
    y -= 6
  }
  // Total row
  page.drawLine({
    start: { x: MARGIN, y: y + 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
    thickness: 0.5,
    color: INK,
    opacity: 0.18,
  })
  y -= 8
  page.drawText(safe(lang === 'en' ? 'Total (estimated)' : 'Summe (geschätzt)'), {
    x: MARGIN,
    y,
    size: 12,
    font: fonts.interMedium,
    color: INK,
  })
  page.drawText(safe(formatEurRange(cost.total, lang)), {
    x: PAGE_WIDTH - MARGIN - 140,
    y,
    size: 12,
    font: fonts.interMedium,
    color: CLAY_DEEP,
  })
  y -= 22
  // Inputs caption — verbatim parity with the in-app tooltip.
  page.drawText(
    safe(
      `${lang === 'en' ? 'Computed from' : 'Berechnet aus'}: ${inputsLabel}`,
    ),
    {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.serifItalic,
      color: CLAY,
      opacity: 0.85,
      maxWidth: PAGE_WIDTH - MARGIN * 2,
    },
  )
}

// v1.0.6 Bug 2 — Timeline page (IV). Mirrors the Procedure Duration
// section of CostTimelineTab. Five phases (Preparation / Submission /
// Review / Corrections / Approval) plus total.
function drawTimelinePage(
  doc: PDFDocument,
  fonts: BrandFonts,
  lang: 'de' | 'en',
): void {
  let { page, y } = startPage(doc)
  drawSectionHeader(
    page,
    fonts,
    y,
    lang === 'en' ? 'IV  TIMELINE' : 'IV  ZEITRAHMEN',
  )
  y -= 30
  const totalWeight = totalPhaseWeight()
  for (const phase of PROCEDURE_PHASES) {
    ;({ page, y } = ensureSpace(doc, page, y, 28))
    const widthPct = Math.round((phase.weight / totalWeight) * 100)
    page.drawText(safe(lang === 'en' ? phase.labelEn : phase.labelDe), {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.interMedium,
      color: INK,
    })
    page.drawText(safe(lang === 'en' ? phase.rangeEn : phase.rangeDe), {
      x: PAGE_WIDTH - MARGIN - 140,
      y,
      size: 11,
      font: fonts.serifItalic,
      color: CLAY_DEEP,
    })
    y -= 12
    // Bar
    page.drawRectangle({
      x: MARGIN,
      y: y + 2,
      width: ((PAGE_WIDTH - MARGIN * 2 - 160) * widthPct) / 100,
      height: 4,
      color: CLAY,
      opacity: 0.55,
    })
    y -= 18
  }
  // Total
  page.drawLine({
    start: { x: MARGIN, y: y + 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
    thickness: 0.5,
    color: INK,
    opacity: 0.18,
  })
  y -= 8
  page.drawText(safe(lang === 'en' ? 'Total duration' : 'Gesamtdauer'), {
    x: MARGIN,
    y,
    size: 12,
    font: fonts.interMedium,
    color: INK,
  })
  page.drawText(safe(lang === 'en' ? '~ 4–6 months' : 'ca. 4–6 Monate'), {
    x: PAGE_WIDTH - MARGIN - 140,
    y,
    size: 12,
    font: fonts.interMedium,
    color: CLAY_DEEP,
  })
  y -= 22
  page.drawText(
    safe(
      lang === 'en'
        ? 'subject to authority workload'
        : 'abhängig von der Auslastung der Behörde',
    ),
    {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.serifItalic,
      color: CLAY,
      opacity: 0.85,
    },
  )
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
