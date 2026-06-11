import type { ProjectRow } from '@/types/db'
import type { Procedure, ProjectState } from '@/types/projectState'
import { deriveBaselineProcedure } from './deriveBaselineProcedure'
import { detectProcedure, type ProcedureType } from './costNormsMuenchen'
import {
  buildProcedureCase,
  classifyVerdictDirection,
  procedureLabel,
  resolveProcedure,
  type ProcedureDecision,
} from '@/legal/resolveProcedure'

export interface ResolvedProcedures {
  procedures: Procedure[]
  /** True when persona-emitted; false when rendering the baseline. */
  isFromState: boolean
}

const NOW = (): string => new Date().toISOString()

/**
 * Sprint 1 (RED-1) — convert the canonical ProcedureDecision into a Procedure
 * the result surfaces render. This is how At-a-Glance / Executive Read /
 * Procedure tab inherit the verdict-fact-driven decision (e.g. § 65 reguläres
 * for a Sonderbau project) instead of the template-intent baseline.
 */
function procedureFromDecision(decision: ProcedureDecision): Procedure {
  const suffix = decision.citation ? ` · ${decision.citation}` : ''
  return {
    id: 'P-Decision',
    title_de: `${procedureLabel(decision.kind, 'de')}${suffix}`,
    title_en: `${procedureLabel(decision.kind, 'en')}${suffix}`,
    status:
      decision.kind === 'verfahrensfrei' ? 'nicht_erforderlich' : 'erforderlich',
    rationale_de: decision.reasoning_de,
    rationale_en: decision.reasoning_en,
    qualifier: {
      source: 'LEGAL',
      quality: decision.confidence,
      setAt: NOW(),
      setBy: 'system',
      reason:
        'Verfahren aus den erhobenen Projektfakten abgeleitet — zu bestätigen durch die Architekt:in.',
    },
  }
}

/**
 * Phase 8.5 (A.3) — pure variant of useResolvedProcedures (Phase 8.1).
 * Used by the PDF builder + any other non-React caller so React + PDF render
 * the same data.
 *
 * Sprint 1 (RED-1) — FACTS-FIRST. Resolution order:
 *   1. persona-emitted state.procedures (structured) — unchanged;
 *   2. NEW: when the persona computed a procedure verdict (verfahren_indikation
 *      fact) OR a Sonderbau signal (anzahl_sonderbau_tatbestaende ≥ 1), derive
 *      the primary procedure from the canonical resolveProcedure() decision, so
 *      every result surface matches the PDF / Key Data / Legal landscape;
 *   3. template-intent baseline (deriveBaselineProcedure) — fallback ONLY when
 *      no computed signal exists (zero behaviour change for those projects).
 *
 * Before this, step 2 didn't exist: a project whose persona wrote the verdict as
 * a FACT (not as a structured state.procedures entry) fell straight to the
 * template baseline, so a GK5 + Sonderbau MFH showed "§ 64 simplified · likely"
 * on every narrative surface while Key Data showed the correct § 65.
 *
 * T-05 sprint (pinned design, Phase-0.3 fix) — DECISION-FIRST on every
 * surface. The old order let a non-empty persona state.procedures list BYPASS
 * the canonical resolveProcedure entirely (web tab showed the persona's § 61
 * card while the PDF resolver said § 64 — the Sachsen split). Now:
 *   1. persona structured LBO-verdict entries are a VERDICT INPUT to
 *      buildProcedureCase (rank 2 of the pinned hierarchy) — absorbed by the
 *      decision card, never rendered as a competing verdict;
 *   2. persona entries that are ADDITIONAL REGIMES (DSchG-Erlaubnis, water
 *      law, tree protection) render as supplementary procedures UNDER the
 *      decision — never collapsed, never dropped;
 *   3. the intent baseline fires ONLY when no signal of any kind exists
 *      (abbruch always resolves — its branch has an honest no-information
 *      baseline, so the regular-§ template pack can never leak onto T-05).
 * No surface bypasses the decision: tab, markdown export (shares this path
 * per YELLOW-2) and the PDF all derive from the SAME ProcedureDecision.
 */
export function isLboVerdictProcedure(p: Procedure): boolean {
  const title = `${p.title_de ?? ''} ${p.title_en ?? ''}`
  const rationale = `${p.rationale_de ?? ''} ${p.rationale_en ?? ''}`
  return (
    classifyVerdictDirection(title) !== null ||
    classifyVerdictDirection(rationale) !== null ||
    /bauvoranfrage|vorbescheid|baugenehmigungsverfahren|building[- ]?permit procedure/i.test(title)
  )
}

export function resolveProcedures(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedProcedures {
  const persona = state.procedures ?? []
  const overlays = persona.filter((p) => !isLboVerdictProcedure(p))
  const personaHadVerdict = overlays.length < persona.length

  const pcase = buildProcedureCase(project, state)
  const hasVerdict = !!pcase.verfahren_indikation?.trim()
  const hasSonderbau = (pcase.sonderbau_count ?? 0) >= 1
  if (hasVerdict || hasSonderbau || personaHadVerdict || pcase.intent === 'abbruch') {
    const decision = resolveProcedure(pcase)
    return {
      procedures: [procedureFromDecision(decision), ...overlays],
      // persona-grounded when the verdict came from persona facts/procedures —
      // the "likely" badge belongs to resolver-only/baseline paths.
      isFromState: hasVerdict || personaHadVerdict,
    }
  }

  return {
    procedures: deriveBaselineProcedure({
      intent: project.intent,
      bundesland: project.bundesland,
    }),
    isFromState: false,
  }
}

export interface SelectedProcedures {
  primary: Procedure | undefined
  fallback: Procedure | undefined
  /** T-05 sprint — additional regimes (DSchG-Erlaubnis etc.) rendered UNDER
   *  the decision card; never collapsed into it, never dropped. */
  supplementary: Procedure[]
}

/** Structured verdict identity: status + normalised title (§-verdict), NOT
 *  free-text rationale. Two §64-erforderlich entries with different rationale
 *  strings share a key and collapse to one. */
const verdictKey = (p: Procedure): string =>
  `${p.status}::${(p.title_de ?? '').toLowerCase().replace(/\s+/g, ' ').trim()}`

/**
 * YELLOW-2 (T-04 walk) — THE single canonical procedure SELECTION shared by the
 * Procedure tab and the markdown export: ONE primary card (the required
 * verdict, else the first) + an optional fallback one-liner shown ONLY when it
 * is a genuinely DIFFERENT verdict. The markdown previously listed every raw
 * state.procedures row, so persona over-emission of two identical §-verdicts
 * (same verdict, two rationale strings: "warehouse → office" / "Lager → Büro")
 * rendered as two cards while the PDF/tab showed one. Dedup is on the
 * structured verdict key, never the rationale text.
 */
export function selectProcedures(procedures: Procedure[]): SelectedProcedures {
  // T-05 sprint (Phase-0.3) — DECISION-FIRST primary: when the canonical
  // decision card is present it IS the primary, unconditionally. The old
  // erforderlich-promotion sort could promote a mislabeled persona entry
  // (the Sachsen walk's "erforderlich"-tagged § 61 card) over the decision;
  // with the decision pinned first that sort applies only to legacy persona-
  // only lists (none produced by resolveProcedures anymore).
  const decision = procedures.find((p) => p.id === 'P-Decision')
  const primary =
    decision ??
    procedures.find((p) => p.status === 'erforderlich') ??
    procedures[0]
  const fallback =
    primary && !decision
      ? procedures.find(
          (p) => p.id !== primary.id && verdictKey(p) !== verdictKey(primary),
        )
      : undefined
  const supplementary = primary
    ? procedures.filter((p) => p.id !== primary.id && p.id !== fallback?.id)
    : []
  return { primary, fallback, supplementary }
}

/**
 * Sprint 0 addendum (P1-A sibling) — THE single cost procedure-type resolver.
 *
 * The four cost surfaces previously resolved the procedure multiplier three
 * different ways: Cost tab + PDF read raw `state.procedures` (→ 'unknown' when
 * empty); At-a-Glance went through `resolveProcedures`; Executive Read inlined
 * its own baseline fallback. They agreed numerically ONLY because the baseline
 * procedure rationale happens to map to detectProcedure='unknown' (mult 1.0,
 * verified) — a latent desync that a single rationale edit or a detectProcedure
 * tweak would silently expose across surfaces. This makes the procedure axis a
 * single source of truth, mirroring resolveCostAreaSqm for the area axis.
 *
 * Resolution: the canonical `resolveProcedures` (persona procedures when
 * present, else the labelled "wahrscheinlich · pending architect" baseline),
 * the primary procedure (erforderlich, else first), then the cost engine's
 * detectProcedure heuristic. Cost and the procedure label shown to the bauherr
 * now come from the same place and cannot drift.
 */
export function resolveCostProcedureType(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ProcedureType {
  const { procedures } = resolveProcedures(project, state)
  const primary =
    procedures.find((p) => p.status === 'erforderlich') ?? procedures[0]
  // Campaign Phase 5a — read the STRUCTURED kind from the procedure TITLE (which is
  // procedureLabel(kind) for the decision path / the localization procedure name
  // for the baseline), NOT the free rationale prose. The rationale is a fallback
  // only when the title yields no kind. This stops "Vereinfachtes
  // Baugenehmigungsverfahren" rationales from being mis-read; the T-01 baseline
  // keeps a 1.0 multiplier (art58_vereinfacht and unknown are both 1.0) → no cost
  // shift. (All four cost surfaces still call THIS one resolver → they still agree.)
  const fromTitle = detectProcedure(primary?.title_de ?? '')
  return fromTitle !== 'unknown' ? fromTitle : detectProcedure(primary?.rationale_de ?? '')
}
