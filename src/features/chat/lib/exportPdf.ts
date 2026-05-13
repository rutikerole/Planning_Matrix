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
import { loadBrandFonts } from '@/lib/fontLoader'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
// v1.0.6 Bug 2 — PDF brief now mirrors the Cost & Timeline, Team &
// Stakeholders, and Suggestions/Recommendations surfaces. Imports use
// the same engines as the result-page tabs so the two surfaces cannot
// drift.
import {
  buildCostBreakdown,
  detectAreaSqm,
  detectKlasse,
  detectProcedure,
  formatEurRange,
  resolveAreaSqmByTemplate,
} from '@/features/result/lib/costNormsMuenchen'
// v1.0.13 → v1.0.14 — PDF Renaissance Part 2 imports. The
// PDF_CLAY / PDF_MARGIN / PDF_PAPER aliases that v1.0.13 used for
// the mask-and-redraw finalizePageFooters helper were dropped in
// the v1.0.14 Bug 28 Path A split (cover/TOC footers now render
// AFTER total page count is known, so no placeholder + no mask).
import {
  PAGE_HEIGHT as PDF_PAGE_HEIGHT,
  PAGE_WIDTH as PDF_PAGE_WIDTH,
  formatQualifier,
  resolveEditorialFonts,
  resolveSafeTextFn,
} from './pdfPrimitives'
import {
  deriveDocNo,
  formatCoverDate,
  renderCoverFooter,
  renderCoverPage,
  renderCoverQr,
} from './pdfSections/cover'
import { renderTocFooter, renderTocPage } from './pdfSections/toc'
import {
  inferPriority,
  renderExecutiveBody,
  renderExecutiveFooter,
  type ExecutiveRec,
} from './pdfSections/executive'
import {
  renderAreasBody,
  renderAreasFooter,
  type AreaRow,
} from './pdfSections/areas'
import {
  renderCostsBody,
  renderCostsFooter,
  type CostsData,
  type CostsItem,
} from './pdfSections/costs'
import {
  DEFAULT_TIMELINE_MILESTONE_WEEK,
  DEFAULT_TIMELINE_PHASES,
  DEFAULT_TIMELINE_TOTAL_WEEKS,
  renderTimelineBody,
  renderTimelineFooter,
} from './pdfSections/timeline'
import {
  renderProceduresBody,
  renderProceduresFooter,
  type ProcRow,
  type DocRow,
  type ProcStatus,
} from './pdfSections/procedures'
import {
  renderTeamBody,
  renderTeamFooter,
  type SpecialistRow,
} from './pdfSections/team'
import {
  renderRecsBody,
  renderRecsFooter,
  type RecRow,
} from './pdfSections/recommendations'
import {
  renderKeyDataBody,
  renderKeyDataFooter,
  type KeyDataRow,
} from './pdfSections/keyData'
import {
  renderVerificationBody,
  renderVerificationFooter,
} from './pdfSections/verification'
import {
  renderGlossaryBody,
  renderGlossaryFooter,
} from './pdfSections/glossary'
import {
  pdfStr,
  resolvePdfStrings,
  type PdfLang,
} from './pdfStrings'
import { getStateLocalization } from '@/legal/stateLocalization'
import { getStateCitations } from '@/legal/stateCitations'
import { sanitizeCrossStateBleed } from '@/legal/crossStateBleedGuard'
import {
  deriveGebaeudeklasse,
  deriveGkInputFromFacts,
  formatGebaeudeklasseValue,
} from '@/legal/deriveGebaeudeklasse'
import { pickSmartSuggestions } from '@/features/result/lib/smartSuggestionsMatcher'
import { computeConfidence } from '@/features/result/lib/computeConfidence'
import {
  intentFromTemplate,
  procedureLabel,
  procedureStatusLabel,
  resolveProcedure,
  type ProcedureCase,
  type ProcedureDecision,
} from '@/legal/resolveProcedure'
import {
  requiredDocumentsForCase,
  type DocumentCase,
  type RequiredDocument,
} from '@/legal/requiredDocuments'
import type { BundeslandCode } from '@/legal/states/_types'

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
const CLAY = rgb(0.51, 0.41, 0.32) // hsl(25 30% 38%)

const PAGE_WIDTH = 595.28 // A4 portrait in points
const MARGIN = 56

// v1.0.17 — STATE_LABELS_DE + STAKEHOLDERS_PDF retired alongside
// the v1.0.6 schedule-block path. Section VII (Team) now sources
// from pdfStrings team.role.* keys via pdfSections/team.ts.

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
  // v1.0.16 architectural fix — single source of truth. Sanitizer
  // factory lives in pdfPrimitives.ts (resolveSafeTextFn) and is the
  // same fn that EditorialFonts.safe carries to section renderers,
  // so body-page drawText calls (still in this file) and editorial
  // renderer drawText calls (in pdfSections/*.ts via drawSafeText)
  // are guaranteed to apply the same pipeline.
  safe = resolveSafeTextFn(fonts.usingFallback)

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
  // v1.0.18 Feature 2 — surface composite confidence score on cover.
  // Same number that the result-page header renders, sourced from
  // the single computeConfidence helper (qualifier-aggregate +
  // section-completeness weighted composite).
  const confidencePercent = computeConfidence(state as ProjectState)
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
    confidencePercent,
  })

  // v1.0.18 Feature 1 — QR code linking to the project's web URL.
  // Dynamic-import qrcode so the dependency only ships when the
  // user actually exports a PDF (matches the pdf-lib/fontkit
  // lazy-loading pattern).
  try {
    const QRCode = (await import('qrcode')).default
    const qrUrl = `https://planning-matrix.app/project/${project.id}`
    const qrPngBytes: Uint8Array = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 256,
    })
    const qrImage = await doc.embedPng(qrPngBytes)
    renderCoverQr(coverPage, editorialFonts, pdfStrings, qrImage)
  } catch (err) {
    // Non-fatal: if qrcode generation fails (e.g. environment without
    // the optional canvas dependency), the cover renders without the
    // QR. The smoke gate catches the absence on the production path.
    if (typeof console !== 'undefined') {
      console.warn('[exportPdf] QR code generation failed:', err)
    }
  }

  // TOC page (page 2) — body sections start on page 3. Approximate
  // page numbers for sections that still inline-flow through the
  // v1.0.12 body (verification + glossary point at the last-known
  // body page; v1.0.14+ adds dedicated pages).
  const tocPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])

  // ── Body: v1.0.15 Renaissance Part 2A — Executive + Areas ────
  // v1.0.15 retires the v1.0.12 drawTop3Page + drawBereichePage
  // schedule-block renderers in favour of the editorial-language
  // executive.ts + areas.ts pages. The body footer-loop below skips
  // these pages because their footers are drawn POST-page-count by
  // renderExecutiveFooter / renderAreasFooter (same Path A split as
  // the cover + TOC). The remaining v1.0.12 body sections (costs,
  // timeline, schedule blocks) are deferred to v1.0.16+ Renaissance
  // parts 2B/2C/2D per the user's strict scope guard.
  const bundeslandCodeUpper = (project.bundesland ?? '').toUpperCase()

  // ── v1.0.19 Bug 40 — canonical procedure decision (early stage) ─
  // Computed ONCE, threaded through Areas (Area B body), Procedures
  // (procedure card), Key Data (Verfahren Indikation row). All three
  // render the SAME procedure language; the contradiction that made
  // v1.0.18 unshippable to a NRW Bauamt clerk is structurally
  // impossible going forward.
  const factsEarly = state.facts ?? []
  const factBool = (key: string, fallback = false): boolean => {
    const f = factsEarly.find((x) => x.key === key)
    if (!f) return fallback
    return (
      f.value === true ||
      f.value === 'true' ||
      f.value === 'JA' ||
      f.value === 'ja'
    )
  }
  const factNum = (key: string): number | undefined => {
    const f = factsEarly.find((x) => x.key === key)
    if (!f) return undefined
    if (typeof f.value === 'number') return f.value
    const n = Number(f.value)
    return Number.isFinite(n) ? n : undefined
  }
  const procedureCase: ProcedureCase = {
    intent: intentFromTemplate(state.templateId ?? 'T-03'),
    bundesland: (project.bundesland ?? 'nrw') as BundeslandCode,
    eingriff_tragende_teile: factBool('eingriff_tragende_teile'),
    // Sanierung default: assume Außenhülle work unless explicitly
    // told otherwise — matches Königsallee façade-insulation case.
    eingriff_aussenhuelle: factBool('eingriff_aussenhuelle', true),
    denkmalschutz: factBool('denkmalschutz'),
    ensembleschutz: factBool('ensembleschutz'),
    aenderung_aeussere_erscheinung: factBool(
      'aenderung_aeussere_erscheinung',
    ),
    grenzstaendig: factBool('grenzstaendig'),
    in_gestaltungssatzung: factBool('in_gestaltungssatzung'),
    fassadenflaeche_m2: factNum('fassadenflaeche_m2'),
    // v1.0.21 Bug E — hard-blocker channels. When set, resolveProcedure
    // returns 'bauvoranfrage' with explicit blocker reasoning instead
    // of quietly emitting "vereinfachtes ERFORDERLICH".
    mk_gebietsart: factBool('mk_gebietsart'),
    bauvoranfrage_hard_blocker: factBool('bauvoranfrage_hard_blocker'),
    sonderbau_scope: factBool('sonderbau_scope'),
  }
  const procedureDecision: ProcedureDecision = resolveProcedure(procedureCase)
  // v1.0.21 Bug E — derive an explicit BLOCKER summary that the
  // Executive Top-3 + Procedure card surface prominently.
  const { detectHardBlockers } = await import('@/legal/resolveProcedure')
  const hardBlockers = detectHardBlockers(procedureCase)
  const blockerLeadDe =
    hardBlockers.length > 0
      ? `BLOCKER — Bauvoranfrage zur zuständigen Behörde erforderlich, bevor weitere Planung beginnt. Vorhaben in der bisher konzipierten Form möglicherweise unzulässig (${hardBlockers
          .map((b) => b.labelDe)
          .join(' · ')}).`
      : null
  const blockerLeadEn =
    hardBlockers.length > 0
      ? `BLOCKER — file a pre-decision query with the responsible authority before any further planning. Project as currently scoped may be inadmissible (${hardBlockers
          .map((b) => b.labelEn)
          .join(' · ')}).`
      : null

  let executivePage: PDFPage | null = null
  let executivePageNumber = 0
  // v1.0.16 Bug 31 fix — Executive's "Top 3" reads from the SAME
  // merged source as Section VIII body recommendations: stored
  // state.recommendations FIRST (rank-sorted), then smart-suggestion
  // matches appended. v1.0.15's executive read state.recommendations
  // only and rendered a single card on projects (like NRW × T-03
  // Königsallee) where the GEG rec was the only persisted entry —
  // the other two visible recs lived in smartPicks.
  const sortedRecs = (state.recommendations ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
  const smartPicksForExec = pickSmartSuggestions({
    project,
    state: state as ProjectState,
  })
  type ExecSource =
    | { kind: 'rec'; rec: NonNullable<ProjectState['recommendations']>[number] }
    | { kind: 'smart'; pick: ReturnType<typeof pickSmartSuggestions>[number] }
    | { kind: 'blocker'; title: string; body: string }
  const mergedSources: ExecSource[] = [
    ...sortedRecs.map((rec) => ({ kind: 'rec' as const, rec })),
    ...smartPicksForExec.map((pick) => ({ kind: 'smart' as const, pick })),
  ]
  // v1.0.21 Bug E — when hard blockers are active, prepend a BLOCKER
  // card to the Top-3 so the bauherr cannot miss the escalation. The
  // softer "Obtain B-Plan information" baseline reads as a routine
  // step; this card escalates explicitly.
  if (hardBlockers.length > 0) {
    const title =
      lang === 'en' ? 'BLOCKER — Bauvoranfrage required' : 'BLOCKER — Bauvoranfrage erforderlich'
    const body = lang === 'en' ? blockerLeadEn ?? '' : blockerLeadDe ?? ''
    mergedSources.unshift({ kind: 'blocker', title, body })
  }
  const topThreeSources = mergedSources.slice(0, 3)
  if (topThreeSources.length > 0) {
    executivePage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
    executivePageNumber = doc.getPageCount()
    const topThree: ExecutiveRec[] = topThreeSources.map((src) => {
      if (src.kind === 'rec') {
        const title = (lang === 'en' ? src.rec.title_en : src.rec.title_de) ?? ''
        const body = (lang === 'en' ? src.rec.detail_en : src.rec.detail_de) ?? ''
        return {
          title,
          body,
          priority: inferPriority(title, body),
          // v1.0.16 Bug 32 fix — use the shared formatQualifier so
          // DESIGNER+ASSUMED downgrades to LEGAL · CALCULATED here
          // exactly like Section VIII does (and like the result-page
          // SuggestionCard does).
          sourceLabel: src.rec.qualifier
            ? formatQualifier(src.rec.qualifier, pdfStrings)
            : undefined,
        }
      }
      if (src.kind === 'blocker') {
        // v1.0.21 Bug E — BLOCKER card forces priority high and tags
        // the qualifier LEGAL · ASSUMED so the bauherr reads it as
        // "the system cannot verify admissibility" rather than as a
        // calculated recommendation.
        return {
          title: src.title,
          body: src.body,
          priority: inferPriority(src.title, src.body),
          sourceLabel: formatQualifier({ source: 'LEGAL', quality: 'ASSUMED' }, pdfStrings),
        }
      }
      const title = (lang === 'en' ? src.pick.titleEn : src.pick.titleDe) ?? ''
      const body = (lang === 'en' ? src.pick.bodyEn : src.pick.bodyDe) ?? ''
      return {
        title,
        body,
        priority: inferPriority(title, body),
        sourceLabel: formatQualifier({ source: 'LEGAL', quality: 'CALCULATED' }, pdfStrings),
      }
    })
    renderExecutiveBody(executivePage, editorialFonts, pdfStrings, {
      templateLabel,
      bundeslandCode: bundeslandCodeUpper,
      topThree,
    })
  }

  // ── Areas (Section 02 · A · B · C status) ──────────────────────
  let areasPage: PDFPage | null = null
  let areasPageNumber = 0
  if (state.areas) {
    areasPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
    areasPageNumber = doc.getPageCount()
    const rows: AreaRow[] = (['A', 'B', 'C'] as const)
      .filter((k) => state.areas?.[k])
      .map((k) => {
        const a = state.areas![k]
        // v1.0.19 Bug 40 — Area B body now reflects the canonical
        // procedureDecision instead of persona-emitted reason text.
        // Area B's status follows the decision: verfahrensfrei →
        // ACTIVE; everything else where a decision was reached →
        // ACTIVE (architect signs off); bauvoranfrage → PENDING.
        if (k === 'B') {
          const decisionReason =
            (lang === 'en'
              ? procedureDecision.reasoning_en
              : procedureDecision.reasoning_de) +
            ` (${procedureDecision.citation})`
          const newState =
            procedureDecision.kind === 'bauvoranfrage' ? 'PENDING' : 'ACTIVE'
          return {
            key: k,
            title: pdfStr(pdfStrings, `areas.${k.toLowerCase()}.title`),
            state: newState as typeof a.state,
            reason: decisionReason,
          }
        }
        if (k === 'A') {
          // v1.0.19 Bug 44 — qualifier honesty. The system has not
          // verified the specific Bebauungsplan / Gestaltungssatzung
          // for this parcel. Until state carries a bebauungsplan_id
          // (v1.0.22+), Area A's planungsrechtliche assertion is
          // ASSUMED, not CALCULATED. Append a Stadtarchiv verification
          // caveat to the body.
          // v1.0.20 Polish 2 — qualifier label in caveat body is now
          // locale-resolved alongside the rest of the prose.
          // v1.0.21 Bug 23-PRIME — Stadtarchiv reference + Innenstadt
          // wording are state-derived. v1.0.20 hardcoded "Stadtarchiv
          // Düsseldorf — Königsallee lies in a regulated Innenstadt
          // zone" for every project regardless of bundesland; on a
          // Berlin project the Düsseldorf string surfaced verbatim
          // (Bug 23-PRIME from the v1.0.20 smoke walk).
          const assumedLabel = formatQualifier(
            { source: 'LEGAL', quality: 'ASSUMED' },
            pdfStrings,
          )
          const citations = getStateCitations(project.bundesland)
          const caveat =
            lang === 'en'
              ? `Verify specific Bebauungsplan and Gestaltungssatzung with Stadtarchiv ${citations.archivCity} — confirm any Erhaltungs- or Gestaltungssatzung that applies at the parcel. ${assumedLabel} until verified.`
              : `Konkreten Bebauungsplan und Gestaltungssatzung mit Stadtarchiv ${citations.archivCity} abklären — etwaige Erhaltungs- oder Gestaltungssatzung für das Grundstück prüfen. ${assumedLabel} bis verifiziert.`
          // v1.0.20 — \n\n paragraph break so the caveat renders as
          // its own block instead of an inline continuation.
          const reason = a.reason ? `${a.reason}\n\n${caveat}` : caveat
          return {
            key: k,
            title: pdfStr(pdfStrings, `areas.${k.toLowerCase()}.title`),
            state: a.state,
            reason,
          }
        }
        // k === 'C' — Bug 43 Abstandsflächen-Hinweis
        // v1.0.21 Bug 23-PRIME — § citation is state-derived. v1.0.19
        // hardcoded "§ 6 Abs. 8 BauO NRW" verbatim for every project
        // regardless of bundesland; on a Berlin project the NRW
        // citation surfaced on Area C. NRW retains the verbatim
        // 25-cm-Privileg wording because that specific clause is
        // NRW-unique; other states render a generic Abstandsflächen
        // pointer with the state-correct §.
        let reason = a.reason ?? ''
        if (
          procedureCase.eingriff_aussenhuelle &&
          (procedureCase.fassadenflaeche_m2 ?? 0) > 0
        ) {
          const citations = getStateCitations(project.bundesland)
          const hinweis =
            project.bundesland === 'nrw'
              ? lang === 'en'
                ? 'Abstandsflächen note: external insulation may project into Abstandsfläche. § 6 Abs. 8 BauO NRW permits up to 25 cm thermal-insulation projection without neighbour consent under conditions — verify with Bauamt + Nachbarbeteiligung if grenzständig.'
                : 'Abstandsflächen-Hinweis: Außendämmung kann in Abstandsfläche ragen. § 6 Abs. 8 BauO NRW erlaubt bis 25 cm Dämmungsprojektion ohne Nachbarunterschrift unter Auflagen — mit Bauamt + ggf. Nachbarbeteiligung verifizieren bei grenzständiger Lage.'
              : lang === 'en'
                ? `Abstandsflächen note: external insulation may project into Abstandsfläche. ${citations.abstandsFlaechenCitation} governs the setback rule for ${citations.labelEn} — verify the local insulation projection allowance with the Bauamt and Nachbarbeteiligung if grenzständig.`
                : `Abstandsflächen-Hinweis: Außendämmung kann in Abstandsfläche ragen. ${citations.abstandsFlaechenCitation} regelt die Abstandsflächen in ${citations.labelDe} — den landesspezifischen Dämmungs-Projektionsspielraum mit Bauamt und Nachbarbeteiligung abklären, insbesondere bei grenzständiger Lage.`
          // v1.0.20 — \n\n paragraph break so the Hinweis renders
          // as its own block, not inline with the area observation.
          reason = reason ? `${reason}\n\n${hinweis}` : hinweis
        }
        // v1.0.21 Bug 23-PRIME — runtime cross-state bleed guard on
        // persona-emitted reason text. Belt-and-braces: any state-
        // unique token from a state OTHER than project.bundesland is
        // logged + replaced with an honest generic fallback.
        const guardedReason = sanitizeCrossStateBleed(
          reason,
          (project.bundesland ?? 'bayern') as BundeslandCode,
        )
        return {
          key: k,
          title: pdfStr(pdfStrings, `areas.${k.toLowerCase()}.title`),
          state: a.state,
          reason: guardedReason,
        }
      })
    renderAreasBody(areasPage, editorialFonts, pdfStrings, {
      templateLabel,
      bundeslandCode: bundeslandCodeUpper,
      rows,
    })
  }

  // ── Page 5: Costs (Section 03) ─────────────────────────────────
  // v1.0.16 Renaissance Part 2B. Replaces v1.0.6's plain-text
  // drawCostsPage with the editorial pdfSections/costs.ts renderer.
  // The numeric engine (buildCostBreakdown + resolveAreaSqmByTemplate)
  // is unchanged — only the surface treatment is new, so the PDF +
  // result-page CostTimelineTab still consume identical data.
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
  const areaSqm =
    resolveAreaSqmByTemplate(state.facts, state.templateId) ??
    detectAreaSqm(corpus) ??
    0
  const costOpts = { areaSqm, bundesland: project.bundesland }
  const costBreakdown = buildCostBreakdown(procedure, klasse, costOpts)
  const costItems: CostsItem[] = [
    {
      labelKey: 'costs.items.architect',
      basisKey: 'costs.items.architect.basis',
      range: formatEurRange(costBreakdown.architekt, lang),
    },
    {
      labelKey: 'costs.items.structural',
      basisKey: 'costs.items.structural.basis',
      range: formatEurRange(costBreakdown.tragwerksplanung, lang),
    },
    {
      labelKey: 'costs.items.surveying',
      basisKey: 'costs.items.surveying.basis',
      range: formatEurRange(costBreakdown.vermessung, lang),
    },
    {
      labelKey: 'costs.items.energy',
      basisKey: 'costs.items.energy.basis',
      range: formatEurRange(costBreakdown.energieberatung, lang),
    },
    {
      labelKey: 'costs.items.authority',
      basisKey: 'costs.items.authority.basis',
      range: formatEurRange(costBreakdown.behoerdengebuehren, lang),
    },
  ]
  const costsData: CostsData = {
    areaSqm,
    bundeslandCode: bundeslandCodeUpper,
    templateLabel,
    items: costItems,
    total: formatEurRange(costBreakdown.total, lang),
  }
  const costsPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  const costsPageNumber = doc.getPageCount()
  renderCostsBody(costsPage, editorialFonts, pdfStrings, costsData)

  // ── Page 6: Timeline (Section 04) ──────────────────────────────
  // v1.0.16 Renaissance Part 2B. Replaces v1.0.6's plain-text
  // drawTimelinePage with the editorial Gantt-style pdfSections/
  // timeline.ts renderer. Phase set is the DEFAULT_TIMELINE_PHASES
  // (T-03 schedule); per-template parameterization is v1.0.17+.
  const timelinePage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  const timelinePageNumber = doc.getPageCount()
  renderTimelineBody(timelinePage, editorialFonts, pdfStrings, {
    templateLabel,
    bundeslandCode: bundeslandCodeUpper,
    phases: DEFAULT_TIMELINE_PHASES,
    totalWeeks: DEFAULT_TIMELINE_TOTAL_WEEKS,
    milestoneWeek: DEFAULT_TIMELINE_MILESTONE_WEEK,
  })

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

  // v1.0.17 Renaissance Part 3 — Sections V-XI editorial renderers.
  // The v1.0.6 schedule-block path (drawScheduleEntry + STAKEHOLDERS_PDF
  // + manual wrapText) is retired. Each section now renders on its own
  // page via the dedicated pdfSections/*.ts editorial renderer with
  // 2-pass footer (Path A pattern).

  // ── Page V: Procedures + VI: Documents (one page) ──────────────
  const proceduresPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  const proceduresPageNumber = doc.getPageCount()
  // v1.0.19 Bug 40 — procedure card sources from the canonical
  // procedureDecision, NOT from state.procedures. state.procedures
  // may carry persona-emitted entries that contradict the resolver;
  // the resolver wins for display consistency. Caveats render as
  // additional bullets in the body.
  const decisionStatus: ProcStatus =
    procedureDecision.kind === 'verfahrensfrei' ||
    procedureDecision.kind === 'genehmigungsfreigestellt'
      ? 'exempt'
      : procedureDecision.kind === 'bauvoranfrage'
        ? 'optional'
        : 'required'
  const decisionBody =
    (lang === 'en'
      ? procedureDecision.reasoning_en
      : procedureDecision.reasoning_de) +
    (procedureDecision.caveats.length > 0
      ? '\n\n' +
        procedureDecision.caveats
          .map(
            (c) =>
              '• ' + (lang === 'en' ? c.message_en : c.message_de),
          )
          .join('\n')
      : '')
  // v1.0.21 Bug E — when hard blockers are active, surface "Procedure
  // determination deferred" as the card title (instead of just
  // "Bauvoranfrage empfohlen") so the bauherr cannot mistake the row
  // for a routine procedure listing. The body already carries the
  // explicit blocker list from resolveProcedure.
  const procRowTitle =
    hardBlockers.length > 0
      ? (lang === 'en'
          ? `Procedure determination deferred · ${procedureDecision.citation}`
          : `Verfahrensbestimmung zurückgestellt · ${procedureDecision.citation}`)
      : procedureLabel(procedureDecision.kind, lang) + ' · ' + procedureDecision.citation
  const procRows: ProcRow[] = [
    {
      title: procRowTitle,
      body: decisionBody,
      status: decisionStatus,
      qualifier: {
        source: 'LEGAL',
        quality: procedureDecision.confidence,
      },
    },
  ]
  void procs // silence unused — superseded by canonical decision
  // v1.0.19 Bug 41+42 — auto-populate Documents from
  // requiredDocumentsForCase when state.docs is empty. The persona
  // doesn't pre-populate the mandatory-Bauvorlagen list; the
  // resolver does. state.docs (when present) overrides.
  const docCase: DocumentCase = {
    procedureKind: procedureDecision.kind,
    intent: procedureCase.intent,
    bundesland: procedureCase.bundesland,
    eingriff_tragende_teile: procedureCase.eingriff_tragende_teile,
    eingriff_aussenhuelle: procedureCase.eingriff_aussenhuelle,
    denkmalschutz: procedureCase.denkmalschutz,
    grenzstaendig: procedureCase.grenzstaendig,
    geg_trigger:
      procedureCase.eingriff_aussenhuelle &&
      (procedureCase.fassadenflaeche_m2 ?? 0) > 0,
    fassadenflaeche_m2: procedureCase.fassadenflaeche_m2,
  }
  const requiredDocs: RequiredDocument[] =
    docs.length > 0 ? [] : requiredDocumentsForCase(docCase)
  const statusLabelDe: Record<RequiredDocument['status'], string> = {
    required: 'ERFORDERLICH',
    conditional: 'BEDINGT',
    recommended: 'EMPFOHLEN',
  }
  const statusLabelEn: Record<RequiredDocument['status'], string> = {
    required: 'REQUIRED',
    conditional: 'CONDITIONAL',
    recommended: 'RECOMMENDED',
  }
  const docRows: DocRow[] =
    docs.length > 0
      ? docs.map((d) => ({
          title: (lang === 'en' ? d.title_en : d.title_de) ?? '',
        }))
      : requiredDocs.map((r) => {
          const statusLabel =
            lang === 'en' ? statusLabelEn[r.status] : statusLabelDe[r.status]
          const titleBase = lang === 'en' ? r.name_en : r.name_de
          const title = `${titleBase} · ${statusLabel}`
          const delivery = `${lang === 'en' ? r.delivery_en : r.delivery_de}${r.citation ? ` · ${r.citation}` : ''}`
          const conditionNote =
            r.status === 'conditional'
              ? lang === 'en'
                ? r.condition_note_en
                : r.condition_note_de
              : undefined
          return {
            title,
            status: r.status,
            delivery,
            conditionNote,
          }
        })
  renderProceduresBody(proceduresPage, editorialFonts, pdfStrings, {
    templateLabel,
    bundeslandCode: bundeslandCodeUpper,
    procedures: procRows,
    documents: docRows,
  })

  // ── Page VII: Team & Stakeholders ──────────────────────────────
  const teamPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  const teamPageNumber = doc.getPageCount()
  // v1.0.18 Bug 36 — render ALL specialists with needed/not-needed
  // badge + rationale. v1.0.17 filtered to r.needed only which
  // dropped not-needed specialists entirely.
  const specialistRows: SpecialistRow[] = roles
    .slice()
    .sort((a, b) => (a.needed === b.needed ? 0 : a.needed ? -1 : 1))
    .map((r) => ({
      title: (lang === 'en' ? r.title_en : r.title_de) ?? '',
      needed: r.needed,
      rationale:
        ((lang === 'en' ? r.rationale_en : r.rationale_de) ?? r.rationale_de ?? ''),
      badgeLabel: r.needed
        ? lang === 'en' ? 'NEEDED' : 'ERFORDERLICH'
        : lang === 'en' ? 'NOT NEEDED' : 'NICHT ERFORDERLICH',
    }))
  renderTeamBody(teamPage, editorialFonts, pdfStrings, {
    specialists: specialistRows,
  })

  // ── Page VIII: Recommendations (all, prioritised) ──────────────
  const recsPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  const recsPageNumber = doc.getPageCount()
  const allRecs = (state.recommendations ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
  const allSmartPicks = pickSmartSuggestions({
    project,
    state: state as ProjectState,
  })
  const recsRows: RecRow[] = [
    ...allRecs.map((r) => {
      const title = (lang === 'en' ? r.title_en : r.title_de) ?? ''
      const body = (lang === 'en' ? r.detail_en : r.detail_de) ?? ''
      return {
        title,
        body,
        qualifierLabel: r.qualifier
          ? formatQualifier(r.qualifier, pdfStrings)
          : formatQualifier({ source: 'LEGAL', quality: 'CALCULATED' }, pdfStrings),
        priority: inferPriority(title, body),
      }
    }),
    ...allSmartPicks.map((s) => {
      const title = (lang === 'en' ? s.titleEn : s.titleDe) ?? ''
      const body = `${lang === 'en' ? s.bodyEn : s.bodyDe}  ·  ${lang === 'en' ? s.reasoningEn : s.reasoningDe}`
      return {
        title,
        body,
        qualifierLabel: formatQualifier({ source: 'LEGAL', quality: 'CALCULATED' }, pdfStrings),
        priority: inferPriority(title, body),
      }
    }),
  ]
  renderRecsBody(recsPage, editorialFonts, pdfStrings, {
    templateLabel,
    bundeslandCode: bundeslandCodeUpper,
    rows: recsRows,
  })

  // ── Page IX: Key Data (facts table) ────────────────────────────
  const keyDataPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  const keyDataPageNumber = doc.getPageCount()
  // v1.0.19 Bug 40 — Verfahren Indikation row sources from the
  // canonical procedureDecision, not from state.facts. If facts
  // contains a verfahren_indikation entry, we suppress it here and
  // synthesize one from the resolver. All other facts pass through.
  const keyDataRows: KeyDataRow[] = facts
    .filter((f) => f.key !== 'verfahren_indikation')
    .map((f) => ({
      field: factLabel(f.key, lang).label,
      value: factValueWithUnit(f.key, f.value, lang),
      qualifier: f.qualifier,
    }))
  keyDataRows.push({
    field: lang === 'en' ? 'Procedure indication' : 'Verfahren Indikation',
    value:
      procedureLabel(procedureDecision.kind, lang).toLowerCase() +
      ' nach ' +
      procedureDecision.citation,
    qualifier: {
      source: 'LEGAL',
      quality: procedureDecision.confidence,
    },
  })
  // v1.0.22 Bug C — derived Gebäudeklasse row. Only inject when the
  // facts table has no explicit klasse-bearing fact (those already
  // render via the generic factLabel/factValueWithUnit path), so the
  // existing NRW fixture's explicit "Gebaeudeklasse 3" entry continues
  // to render unchanged. The derived row carries the MBO § 2 Abs. 3
  // reasoning inline and tags the qualifier CALCULATED or ASSUMED per
  // derivation discipline. Honest deferral phrase when Höhe AND
  // Geschosse are both missing — never a fabricated GK number.
  const hasExplicitKlasse = facts.some((f) =>
    /^(?:gebaeudeklasse|geb_klasse|gk_|klasse$)/i.test(f.key),
  )
  if (!hasExplicitKlasse) {
    const derived = deriveGebaeudeklasse(
      deriveGkInputFromFacts(
        facts as Array<{ key: string; value: unknown }>,
        state.templateId ?? null,
      ),
    )
    const gkValue = formatGebaeudeklasseValue(derived, lang)
    const reasoningSuffix =
      derived.klasse != null
        ? ' · ' + (lang === 'en' ? derived.reasoningEn : derived.reasoningDe)
        : ''
    keyDataRows.push({
      field: lang === 'en' ? 'Building class' : 'Gebäudeklasse',
      value: gkValue + reasoningSuffix,
      qualifier: {
        source: 'LEGAL',
        quality: derived.qualifier,
      },
    })
  }
  // Use the localization helper to silence the unused-import warning
  // (procedureStatusLabel is consumed by the smoke gate but not by
  // this assembly directly; renderers pull localized status pill
  // labels via pdfStrings 'proc.status.*' keys).
  void procedureStatusLabel
  renderKeyDataBody(keyDataPage, editorialFonts, pdfStrings, {
    templateLabel,
    bundeslandCode: bundeslandCodeUpper,
    rows: keyDataRows,
    // v1.0.18 Feature 3 — pass doc so the renderer can register
    // link annotations on § citations in the value column.
    doc,
  })

  // ── Page X: Verification (status panel + signature block) ──────
  const verificationPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  const verificationPageNumber = doc.getPageCount()
  let verifiedCount = 0
  let calculatedCount = 0
  let assumedCount = 0
  for (const f of facts) {
    if (f.qualifier?.quality === 'VERIFIED') verifiedCount++
    else if (f.qualifier?.quality === 'CALCULATED') calculatedCount++
    else if (f.qualifier?.quality === 'ASSUMED') assumedCount++
  }
  renderVerificationBody(verificationPage, editorialFonts, pdfStrings, {
    templateLabel,
    bundeslandCode: bundeslandCodeUpper,
    // v1.0.20 Polish 3 — pre-printed Bauherr name above the
    // third signature line.
    bauherrName,
    verifiedCount,
    calculatedCount,
    assumedCount,
  })

  // ── Page XI: Glossary ──────────────────────────────────────────
  const glossaryPage = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT])
  const glossaryPageNumber = doc.getPageCount()
  renderGlossaryBody(glossaryPage, editorialFonts, pdfStrings, {
    bundeslandCode: bundeslandCodeUpper,
  })

  // v1.0.17 — Audit log REMOVED from PDF. Per the user's intent
  // (originally tabled in v1.0.14, finalized here): audit history
  // is client-internal value, not part of the deliverable. The
  // in-app History view (chat surface) retains the full audit
  // trail unchanged. PDF now ends at Section 11 (Glossary).
  // The `events` BuildArgs parameter is retained for backward
  // compatibility — callers still pass it; the assembly just no
  // longer consumes it.
  void events

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
  // v1.0.13 — skip the y=28/y=44 footers on pages 1 (cover) and 2
  // (TOC). v1.0.15 also skips the executive + areas pages (their
  // footers are drawn by renderExecutiveFooter / renderAreasFooter
  // AFTER total page count is known — same Path A split as cover).
  const editorialPages = new Set<PDFPage>()
  if (executivePage) editorialPages.add(executivePage)
  if (areasPage) editorialPages.add(areasPage)
  editorialPages.add(costsPage)
  editorialPages.add(timelinePage)
  editorialPages.add(proceduresPage)
  editorialPages.add(teamPage)
  editorialPages.add(recsPage)
  editorialPages.add(keyDataPage)
  editorialPages.add(verificationPage)
  editorialPages.add(glossaryPage)
  allPages.forEach((p, i) => {
    if (i <= 1) return // skip cover + TOC
    if (editorialPages.has(p)) return // skip v1.0.15 editorial pages
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
  // v1.0.18 Feature 4 — validity stamp. generatedAt + 30 days, per-
  // locale formatted ("11 June 2026" / "11. Juni 2026").
  const validUntilDate = new Date()
  validUntilDate.setUTCDate(validUntilDate.getUTCDate() + 30)
  const validUntilLabel = formatCoverDate(validUntilDate.toISOString(), lang as PdfLang)
  renderCoverFooter(coverPage, editorialFonts, pdfStrings, {
    bauherrName,
    totalPages,
    validUntilLabel,
  })
  renderTocFooter(tocPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    tocPageNumber: 2,
  })

  // v1.0.15 — executive + areas footers in the second pass.
  if (executivePage) {
    renderExecutiveFooter(executivePage, editorialFonts, pdfStrings, {
      docNo,
      totalPages,
      pageNumber: executivePageNumber,
    })
  }
  if (areasPage) {
    renderAreasFooter(areasPage, editorialFonts, pdfStrings, {
      docNo,
      totalPages,
      pageNumber: areasPageNumber,
    })
  }
  renderCostsFooter(costsPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    pageNumber: costsPageNumber,
  })
  renderTimelineFooter(timelinePage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    pageNumber: timelinePageNumber,
  })
  renderProceduresFooter(proceduresPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    pageNumber: proceduresPageNumber,
  })
  renderTeamFooter(teamPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    pageNumber: teamPageNumber,
  })
  renderRecsFooter(recsPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    pageNumber: recsPageNumber,
  })
  renderKeyDataFooter(keyDataPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    pageNumber: keyDataPageNumber,
  })
  renderVerificationFooter(verificationPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    pageNumber: verificationPageNumber,
  })
  renderGlossaryFooter(glossaryPage, editorialFonts, pdfStrings, {
    docNo,
    totalPages,
    pageNumber: glossaryPageNumber,
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

// v1.0.16 Bug 32 — formatQualifier moved to
// pdfPrimitives.ts and renamed formatQualifier so the executive
// renderer + body Section VIII + future v1.0.17 renderers all
// consume the same DESIGNER+ASSUMED → LEGAL · CALCULATED normalization.

// v1.0.17 — startPage / ensureSpace / drawSectionHeader /
// drawScheduleEntry / wrapText / formatDateTime all retired with
// the v1.0.6 schedule-block path and audit log removal. Editorial
// renderers use the drawWrappedText primitive + Path-A 2-pass
// footer pattern.

function formatDate(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
