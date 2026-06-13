// ───────────────────────────────────────────────────────────────────────
// v1.0.19 — Canonical procedure resolver.
//
// Single source of truth for "which Verfahrensart applies to this
// case". v1.0.18 had THREE renderers (Areas B body / Procedures card
// / Key Data Verfahren Indikation row) each deriving the procedure
// independently from different state fields — producing internally
// contradictory PDFs (page 4 said verfahrensfrei, page 7 said § 64
// vereinfachtes ERFORDERLICH, page 10 said verfahrensfrei). A Bauamt
// clerk would reject such a brief as inconsistent.
//
// This module owns the decision. exportPdf calls resolveProcedure
// ONCE and threads the ProcedureDecision through all three renderers.
//
// SCOPE NOTE. v1.0.19 ships NRW Sanierung baseline + stubs for
// other Bundesländer + other intents (returning generic 'standard'
// with caveats). Bayern's existing detectProcedure path in
// costNormsMuenchen.ts is deliberately NOT migrated this sprint —
// Bayern SHA invariant locks BAYERN_DELTA + MUENCHEN_BLOCK +
// composeLegalContext. v1.0.20+ unifies once the resolver covers
// every state-intent combination.
//
// NRW SANIERUNG DECISION TREE (for the Königsallee fixture case):
//
//   denkmalschutz OR ensembleschutz → 'standard'    (§ 65 + DSchG)
//   eingriff_tragende_teile        → 'vereinfachtes' (§ 64)
//   aenderung_aeussere_erscheinung → 'vereinfachtes' (§ 64)
//   eingriff_aussenhuelle (only)   → 'verfahrensfrei' (§ 62)
//   otherwise                       → 'bauvoranfrage'  (§ 71)
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'
import type { ProjectState, TemplateId } from '@/types/projectState'
import type { ProjectRow } from '@/types/db'
import { getStateLocalization } from './stateLocalization'
import { STATE_CORPUS_PROCEDURE } from './corpusCitations.generated'

/**
 * T-05 sprint — the state's OWNER-SIDE Beseitigung/Abbruch §. Corpus pick
 * (abbruch_beseitigung heading, enforcement §§ excluded by the generator)
 * first; states without a clean corpus pick (BW/NI/BB/RLP) fall back to the
 * hand-coded free § — never a fabricated §, possibly '' for stubs.
 */
export function beseitigungCitationFor(bundesland: BundeslandCode): string {
  return (
    STATE_CORPUS_PROCEDURE[bundesland]?.beseitigung ??
    getStateLocalization(bundesland).procedure.free?.citation ??
    ''
  )
}

export type ProcedureKind =
  | 'verfahrensfrei' // § 62/61 BauO — no permit needed
  | 'genehmigungsfreigestellt' // § 63 — notification, 1-month wait
  | 'anzeige' // T-05 — Anzeige: notification + statutory wait, NOT a permit and NOT Freistellung. Wording is intent-aware (fix/t07-prewalk item 1): only abbruch reads as Beseitigungs-/Abbruchanzeige.
  | 'kenntnisgabe' // fix/t07-prewalk item 3 — § 51 LBO BW Kenntnisgabeverfahren: BW-specific institute, Bauvorlagen to the Gemeinde + waiting period, no permit decision. First-class so a BW verdict can never fall to the vereinfachtes baseline (the T-05-Sachsen anzeige class).
  | 'vereinfachtes' // § 64 — simplified permit
  | 'standard' // § 65 — full permit
  | 'bauvoranfrage' // § 71 — precursor query

export type ProcedureIntent =
  | 'sanierung'
  | 'neubau'
  | 'umnutzung'
  | 'anbau'
  | 'aufstockung'
  | 'abbruch'
  | 'sonstiges'

/**
 * Map TemplateId → intent. T-01/T-02 are Neubau; T-03 is Sanierung;
 * T-04 is Umnutzung; T-05 is Abbruch; T-06 is Aufstockung; T-07 is
 * Anbau; T-08 catch-all is Sonstiges.
 */
export function intentFromTemplate(templateId: TemplateId): ProcedureIntent {
  switch (templateId) {
    case 'T-01':
    case 'T-02':
      return 'neubau'
    case 'T-03':
      return 'sanierung'
    case 'T-04':
      return 'umnutzung'
    case 'T-05':
      return 'abbruch'
    case 'T-06':
      return 'aufstockung'
    case 'T-07':
      return 'anbau'
    case 'T-08':
    default:
      return 'sonstiges'
  }
}

export interface ProcedureCaveat {
  kind:
    | 'gestaltungssatzung'
    | 'bebauungsplan_specific'
    | 'denkmalschutz_check'
    | 'abstand_pruefung'
    | 'nachbarbeteiligung'
    | 'verdikt_konflikt' // T-05 — grounded verdict signals disagree; architect must resolve
  message_de: string
  message_en: string
}

export interface ProcedureCase {
  intent: ProcedureIntent
  bundesland: BundeslandCode
  /** Eingriff in tragende Teile (structural). */
  eingriff_tragende_teile: boolean
  /** Eingriff in Gebäudehülle (façade insulation, window swap, etc.). */
  eingriff_aussenhuelle: boolean
  denkmalschutz: boolean
  ensembleschutz: boolean
  /** Wesentliche Änderung der äußeren Erscheinung — independent of
   *  whether the work touches the façade physically. */
  aenderung_aeussere_erscheinung?: boolean
  grenzstaendig?: boolean
  in_gestaltungssatzung?: boolean
  fassadenflaeche_m2?: number
  // v1.0.21 Bug E — hard-blocker fact channels. When any of these is
  // set, the resolver short-circuits to a 'bauvoranfrage' decision
  // with explicit blocker reasoning so the Procedure tab + PDF page 7
  // + Top-3 cannot quietly emit "Simplified building permit · REQUIRED"
  // on an inadmissible project.
  /** MK-Gebietsart (Kerngebiet) — admissibility depends on §§ 7
   *  BauNVO + local Bebauungsplan, must be cleared before any
   *  procedure determination. */
  mk_gebietsart?: boolean
  /** Composite hard-blocker flag set by upstream Planungsrecht
   *  reasoning (e.g. by the chat persona) — used as an escape hatch
   *  when the specific blocker isn't enumerated here yet. */
  bauvoranfrage_hard_blocker?: boolean
  /** Sprint 1 (RED-1) — number of Sonderbau triggers the persona computed
   *  (e.g. anzahl_sonderbau_tatbestaende = 2 for a Großgarage + KiTa). ≥ 1
   *  forces the full regular procedure (§ 65 BauO NRW etc.) and removes
   *  Genehmigungsfreistellung (§ 63) and the simplified procedure (§ 64) from
   *  eligibility — the German Baurecht rule a GK5 + Sonderbau building must
   *  follow. Replaces the dead boolean that keyed off a fact the persona never
   *  wrote (the prior factBool read was always false), so the rule never fired. */
  sonderbau_count?: number
  /** v1.0.28 Bug 52 — the persona's synthesized procedure conclusion
   *  (e.g. "verfahrensfrei nach § 62 BauO NRW"), read from the
   *  `verfahren_indikation` / `PROCEDURE.TYPE` fact. When it states the
   *  permit-free direction, the resolver honors it instead of the
   *  template-blind generic branch (which would emit the regular permit
   *  for an Abbruch and contradict the state-correct persona fact). */
  verfahren_indikation?: string
  /** T-05 sprint — pinned verdict-conflict channel. Set by buildProcedureCase
   *  when the canonical/bespoke FACT verdict and the persona's STRUCTURED
   *  procedures verdict classify to different directions. The conservative
   *  verdict is already in verfahren_indikation; the resolver downgrades the
   *  decision to ASSUMED and flags it for architect verification — never a
   *  silent tie-break. */
  verfahren_konflikt?: { fact: string; persona: string }
  /** T-05 sprint — tri-state freestanding fact (gebaeude_freistehend).
   *  undefined = not captured either way. */
  gebaeude_freistehend?: boolean
  /** T-05 sprint — Gebäudeklasse number parsed from the canonical
   *  `gebaeudeklasse` fact ("GK 3" → 3); undefined when not captured. */
  gebaeudeklasse_num?: number
  /** T-05 sprint 2.75 — Vollabbruch vs Teilabbruch (canonical `abbruch_typ`
   *  fact). A Teilabbruch is an ÄNDERUNG of the building, not a Beseitigung —
   *  it must never take the demolition tiers. undefined = not captured
   *  (treated as Vollabbruch family, the conservative demolition default). */
  abbruch_typ?: 'vollabbruch' | 'teilabbruch'
}

/**
 * v1.0.28 Bug 52 — pull a citation token from the persona's
 * verfahren_indikation string ("verfahrensfrei nach § 62 BauO NRW" →
 * "§ 62 BauO NRW"; "BayBO Art. 57" → "BayBO Art. 57"). Returns null when
 * no recognizable citation is present.
 */
export function extractProcedureCitation(s: string): string | null {
  // T-01 RED-1 (Part B) — the optional trailing law-name token must START
  // UPPERCASE so a multi-word law name is still captured ("BauO NRW",
  // "LBauO M-V", "BauO Bln") but a verbose parenthetical / lowercase
  // continuation is NOT swallowed. Previously `(?:\s+\S+)?` greedily ate
  // "(vereinfachtes" out of "§ 66 LBauO (vereinfachtes Genehmigungsverfahren)",
  // yielding the mangled "§ 66 LBauO (vereinfachtes". Backward-compatible for
  // every existing honored value (BayBO Art. nn uses the art branch below).
  const para = s.match(
    /§\s*\d+[a-z]?(?:\s+Abs\.\s*\d+)?\s+\S+(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]*)?/u,
  )
  if (para) return para[0].replace(/\s+/g, ' ').trim()
  const art = s.match(/BayBO\s+Art\.\s*\d+[a-z]?/u)
  if (art) return art[0]
  return null
}

/**
 * Sprint 0 (P2-C / RED-1) — THE single resolver for the persona's
 * procedure-type verdict out of project facts. RED-1 was the PDF and the
 * result page disagreeing because each read the verdict differently: the
 * PDF gained a free-form shape-scan (T-01 fix), but the result page still
 * hardcoded four keys and fell through to a generic "Landesbauordnung
 * {Land}" stub on any other key the model emits (procedure_likely,
 * verfahren, verfahrensart_hypothese …). Both surfaces now call THIS, so
 * the verdict can never drift between them again.
 *
 * Resolution order:
 *   1. the four canonical keys, in priority order (verfahren_indikation
 *      wins over verfahren.typ — preserves the established precedence);
 *   2. a shape-scan backstop matching any free-form verdict key the
 *      persona emits. Key match is case- and dot/underscore-insensitive
 *      and anchored, so non-verdict keys (verfahren_genehmigungspflichtig,
 *      procedure_freistellung_excluded) are excluded.
 */
const PROCEDURE_VERDICT_KEY =
  /^(verfahren(typ|indikation|sart\w*)?|procedure(likely|type|typ|vereinfacht\w*)?)$/

const EXPLICIT_VERDICT_KEYS = [
  'verfahren_indikation',
  'PROCEDURE.TYPE',
  'verfahren.typ',
  'verfahren_typ',
] as const

/**
 * T-05 sprint — tolerant BESPOKE verdict-key fallback. The Sachsen/Leipzig
 * walk proved the persona persists its procedure verdict under descriptive
 * keys the anchored shape-scan can never match (`abbruch_verfahrensfrei_
 * sachsbo` = "verfahrensfrei nach § 61 SächsBO (vorläufig)") — so the verdict
 * was invisible and the generic §-64 fallback contradicted the consultation.
 * Match is deliberately CONSERVATIVE, two-factor:
 *   1. the normalized KEY must contain a verdict token (verfahrensfrei /
 *      anzeigepflicht / verfahrensart / verfahrensweg) and must NOT contain a
 *      non-verdict marker (frage/hinweis/ausschluss/ausgeschlossen/excluded —
 *      e.g. `procedure_freistellung_excluded`, `verfahrensfrei_hinweis`);
 *   2. the VALUE must itself classify to a procedure direction
 *      (classifyVerdictDirection !== null) — a key match alone never fires.
 */
const BESPOKE_VERDICT_KEY_TOKEN =
  /(verfahrensfrei|anzeigepflicht|verfahrensart|verfahrensweg|kenntnisgabe)/
const BESPOKE_VERDICT_KEY_BLOCK =
  /(frage|hinweis|ausschluss|ausgeschlossen|excluded|begruendung)/

export function resolveVerfahrensIndikation(
  facts: ReadonlyArray<{ key: string; value: unknown }> | undefined,
): string | undefined {
  if (!facts || facts.length === 0) return undefined
  const asStr = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim().length > 0 ? v : undefined
  // 1. Canonical keys, in priority order.
  for (const key of EXPLICIT_VERDICT_KEYS) {
    const hit = asStr(facts.find((f) => f.key === key)?.value)
    if (hit) return hit
  }
  // 2. Free-form shape-scan backstop (RED-1): first fact whose normalized
  //    key matches the verdict-key shape and carries a non-empty string.
  const scan = facts.find(
    (f) =>
      PROCEDURE_VERDICT_KEY.test(f.key.toLowerCase().replace(/[._]/g, '')) &&
      asStr(f.value) !== undefined,
  )
  if (asStr(scan?.value)) return asStr(scan?.value)
  // 3. T-05 sprint — bespoke verdict-shaped keys (two-factor, see above).
  const bespoke = facts.find((f) => {
    const k = f.key.toLowerCase().replace(/[._\s-]/g, '')
    if (!BESPOKE_VERDICT_KEY_TOKEN.test(k)) return false
    if (BESPOKE_VERDICT_KEY_BLOCK.test(k)) return false
    const v = asStr(f.value)
    return v !== undefined && classifyVerdictDirection(v) !== null
  })
  return asStr(bespoke?.value)
}

// ───────────────────────────────────────────────────────────────────────
// T-05 sprint — verdict DIRECTION classification + the pinned verdict
// hierarchy (canonical fact > persona structured procedures > resolver-from-
// facts > intent baseline) with conservative conflict resolution.
// ───────────────────────────────────────────────────────────────────────

export type VerdictDirection =
  | 'free'
  | 'anzeige'
  | 'kenntnisgabe' // fix/t07-prewalk item 3 — § 51 LBO BW institute, same duty weight as anzeige
  | 'simplified'
  | 'regular'

/** Higher = more procedural duty. Conflicts resolve to the HIGHER rank. */
const DIRECTION_RANK: Record<VerdictDirection, number> = {
  free: 0,
  anzeige: 1,
  kenntnisgabe: 1,
  simplified: 2,
  regular: 3,
}

/**
 * Classify a free-form verdict string to a procedure direction, or null when
 * it does not read like a verdict. Negation-aware for the free direction
 * ("nicht verfahrensfrei" must not classify as free); checked free-first so
 * "verfahrensfrei — keine förmliche Anzeige" is free, not anzeige.
 */
// fix/t07-walk1 item 1b — a verfahrensfrei/permit-free token is NOT a free
// VERDICT when the prose says the project EXCEEDS the permit-free threshold.
// The Hessen walk's rationale "Brutto-Rauminhalt … übersteigt jede
// verfahrensfreie Schwelle" / "exceeds any verfahrensfreie threshold" was read
// as 'free'. Same root as genehmigungsfrei(?!gestellt): a token mention is not
// a verdict. Catches an exceedance cue within a clause of a free token, either
// order; deliberately does NOT touch BELOW/within mentions ("unterhalb der
// verfahrensfreien Schwelle" stays free — that project IS permit-free).
const FREE_TOKEN_SRC = '(?:verfahrensfrei\\w*|genehmigungsfrei\\w*|permit[- ]?free|procedure[- ]?free)'
const EXCEED_SRC =
  '(?:übersteig\\w*|überschreit\\w*|überschritt\\w*|oberhalb|jenseits|hinaus|exceed\\w*|beyond|above|\\bover\\b|gr[öo]ßer|larger|too\\s+(?:big|large))'
const EXCEEDS_FREE = new RegExp(`${EXCEED_SRC}[^.;\\n]{0,40}?${FREE_TOKEN_SRC}`)
const FREE_EXCEEDS = new RegExp(`${FREE_TOKEN_SRC}[^.;\\n]{0,40}?${EXCEED_SRC}`)

export function classifyVerdictDirection(s: string): VerdictDirection | null {
  const t = s.toLowerCase()
  const freeNegated =
    /(nicht|kein[e]?|not)\s+(verfahrensfrei|genehmigungsfrei|permit[- ]?free|procedure[- ]?free)/.test(t) ||
    EXCEEDS_FREE.test(t) ||
    FREE_EXCEEDS.test(t)
  if (
    !freeNegated &&
    /verfahrensfrei|verfahrensfreiheit|genehmigungsfrei(?!gestellt|stellung)|permit[- ]?free|procedure[- ]?free|no permit (?:required|needed)/.test(t)
  ) {
    return 'free'
  }
  // fix/t07-prewalk item 3 — checked BEFORE anzeige so a combined statement
  // ("Kenntnisgabe … keine Anzeige …") classifies to the actual institute.
  if (/kenntnisgabe/.test(t)) return 'kenntnisgabe'
  if (/anzeigepflichtig|anzeigeverfahren|abbruchanzeige|beseitigungsanzeige|notification (?:required|procedure|requirement)/.test(t)) {
    return 'anzeige'
  }
  if (/vereinfacht|simplified/.test(t)) return 'simplified'
  if (/regul[äa]r|standard|full[- ]?permit|regular building permit|baugenehmigungsverfahren/.test(t)) {
    return 'regular'
  }
  return null
}

/**
 * Extract an LBO procedure verdict from the persona's STRUCTURED
 * state.procedures entries (rank 2 of the pinned hierarchy). Direction is read
 * from the TITLE first (the structured verdict), falling back to the rationale.
 * When entries disagree among themselves, the MOST CONSERVATIVE direction wins
 * (never silently the friendliest). Returns the §-bearing text of the chosen
 * entry so extractProcedureCitation can pull the citation. Overlay regimes
 * (DSchG-Erlaubnis, water law, tree protection — no LBO direction) return
 * nothing here and stay supplementary procedures; they are never consumed.
 */
export function extractPersonaProcedureVerdict(
  procedures:
    | ReadonlyArray<{
        title_de?: string
        title_en?: string
        rationale_de?: string
        rationale_en?: string
      }>
    | undefined,
): { text: string; dir: VerdictDirection } | undefined {
  if (!procedures || procedures.length === 0) return undefined
  let best: { dir: VerdictDirection; text: string } | undefined
  for (const p of procedures) {
    const title = `${p.title_de ?? ''} ${p.title_en ?? ''}`.trim()
    const rationale = `${p.rationale_de ?? ''} ${p.rationale_en ?? ''}`.trim()
    const dir =
      classifyVerdictDirection(title) ?? classifyVerdictDirection(rationale)
    if (!dir) continue
    const text = `${title} ${rationale}`.trim()
    if (!best || DIRECTION_RANK[dir] > DIRECTION_RANK[best.dir]) {
      best = { dir, text }
    }
  }
  // fix/t07-walk1 item 1a — return the SELECTED direction alongside the text.
  // The conflict detector must reuse THIS direction (title-first) and never
  // re-classify the title+rationale blob (the rationale's explanatory prose —
  // e.g. "exceeds the verfahrensfreie threshold" — was being read as a second,
  // contradictory verdict → phantom conflict). One entry, one classification.
  return best
}

// v1.0.21 Bug E — describe an active hard blocker for the renderer.
export interface ProcedureHardBlocker {
  /** Slug for the blocker type. */
  kind: 'mk_gebietsart' | 'denkmalschutz' | 'bauvoranfrage_hard_blocker'
  labelDe: string
  labelEn: string
}

export function detectHardBlockers(c: ProcedureCase): ProcedureHardBlocker[] {
  const out: ProcedureHardBlocker[] = []
  if (c.mk_gebietsart) {
    out.push({
      kind: 'mk_gebietsart',
      labelDe: 'MK-Gebietsart (Kerngebiet — § 7 BauNVO + B-Plan-Klärung)',
      labelEn: 'MK use-type (Kerngebiet — § 7 BauNVO + B-Plan clarification)',
    })
  }
  if (c.denkmalschutz) {
    out.push({
      kind: 'denkmalschutz',
      labelDe: 'Denkmalschutz (denkmalrechtliche Erlaubnis vor Bauantrag)',
      labelEn: 'Denkmalschutz (heritage consent required before permit)',
    })
  }
  // Sprint 1 (RED-1) — Sonderbau is NO LONGER a bauvoranfrage hard blocker.
  // A Sonderbau-Tatbestand does not defer the procedure to a pre-inquiry; it
  // forces the FULL regular procedure (§ 65), which IS knowable. That rule is
  // applied in resolveProcedure() via c.sonderbau_count, before the verdict
  // branches, so a Sonderbau project resolves to standard (§ 65) — not the
  // template-default § 64 it silently fell through to before.
  if (
    c.bauvoranfrage_hard_blocker &&
    !out.some(
      (b) => b.kind === 'mk_gebietsart' || b.kind === 'denkmalschutz',
    )
  ) {
    out.push({
      kind: 'bauvoranfrage_hard_blocker',
      labelDe: 'Planungsrechtlicher Hard Blocker (Bauvoranfrage erforderlich)',
      labelEn: 'Planning-law hard blocker (pre-decision required)',
    })
  }
  return out
}

export interface ProcedureDecision {
  kind: ProcedureKind
  citation: string
  /** German one-sentence rationale (rendered as Area B body / procedure card body). */
  reasoning_de: string
  /** English one-sentence rationale. */
  reasoning_en: string
  /** Qualifier hint for the PDF qualifier pill. */
  confidence: 'CALCULATED' | 'ASSUMED'
  /** fix/t07-prewalk item 1 — the case intent, stamped once by
   *  resolveProcedure() so label consumers render the intent-correct anzeige
   *  wording. Optional for compat; absent intent renders NEUTRAL wording
   *  (the demolition variant is opt-in by intent, never a default). */
  intent?: ProcedureIntent
  caveats: ReadonlyArray<ProcedureCaveat>
}

/**
 * Localized label for a ProcedureKind.
 *
 * fix/t07-prewalk item 1 — the anzeige label is INTENT-AWARE: the T-05 sprint
 * authored the single kind table assuming anzeige is only reachable from
 * abbruch, but the verdict keyword branch makes it reachable from ANY intent
 * (T-07 Bayern Art. 57 Abs. 7, BB § 62 BbgBO Bauanzeige are instructed
 * wording). A non-demolition Anzeige must never read "(Abbruchanzeige)" /
 * "(demolition notice)". Absent intent renders the neutral variant — the
 * demolition wording is opt-IN by intent, never a default.
 */
export function procedureLabel(
  kind: ProcedureKind,
  lang: 'de' | 'en',
  intent?: ProcedureIntent,
): string {
  if (kind === 'anzeige') {
    if (intent === 'abbruch') {
      return lang === 'de'
        ? 'Anzeigeverfahren (Abbruchanzeige)'
        : 'Notification procedure (demolition notice)'
    }
    return lang === 'de' ? 'Anzeigeverfahren' : 'Notification procedure'
  }
  const labels: Record<Exclude<ProcedureKind, 'anzeige'>, { de: string; en: string }> = {
    verfahrensfrei: {
      // T-05 sprint — dropped the "(Anzeige)" parenthetical: verfahrensfrei
      // means NO notification; the notification duty is its own kind now.
      de: 'Verfahrensfrei',
      en: 'Permit-free',
    },
    genehmigungsfreigestellt: {
      de: 'Genehmigungsfreigestellt',
      en: 'Notification-only',
    },
    kenntnisgabe: {
      de: 'Kenntnisgabeverfahren',
      en: 'Kenntnisgabe (notification) procedure',
    },
    vereinfachtes: {
      de: 'Vereinfachtes Baugenehmigungsverfahren',
      en: 'Simplified building permit',
    },
    standard: {
      de: 'Reguläres Baugenehmigungsverfahren',
      en: 'Standard building permit',
    },
    bauvoranfrage: { de: 'Bauvoranfrage empfohlen', en: 'Preliminary inquiry recommended' },
  }
  return labels[kind][lang]
}

/** Status label for the procedure card pill. */
export function procedureStatusLabel(
  kind: ProcedureKind,
  lang: 'de' | 'en',
): string {
  if (kind === 'verfahrensfrei' || kind === 'genehmigungsfreigestellt') {
    return lang === 'de' ? 'VERFAHRENSFREI' : 'PERMIT-FREE'
  }
  // T-05 — an Anzeige is a duty but not a permit; "REQUIRED" on the card
  // must not read as "Baugenehmigung required".
  if (kind === 'anzeige') {
    return lang === 'de' ? 'ANZEIGEPFLICHTIG' : 'NOTIFICATION REQUIRED'
  }
  // fix/t07-prewalk item 3 — Kenntnisgabe is likewise a duty, not a permit.
  if (kind === 'kenntnisgabe') {
    return lang === 'de' ? 'KENNTNISGABEPFLICHTIG' : 'NOTIFICATION REQUIRED'
  }
  return lang === 'de' ? 'ERFORDERLICH' : 'REQUIRED'
}

/**
 * Resolve the procedure decision for a given case.
 *
 * v1.0.21 Bug E — hard blockers short-circuit. If MK-Gebietsart,
 * Denkmalschutz, Sonderbau-Scope, or a generic
 * bauvoranfrage_hard_blocker fact is set, the resolver returns a
 * 'bauvoranfrage' decision with explicit blocker reasoning that lists
 * every blocker found, and tags the qualifier ASSUMED (not
 * CALCULATED) because the system has no calculation when blocked.
 * This prevents the v1.0.20 regression where Berlin × T-01 with two
 * hard blockers still rendered "Simplified building permit · REQUIRED".
 *
 * NRW Sanierung baseline is fully encoded after the hard-blocker
 * short-circuit. Other Bundesländer + other intents return a
 * conservative 'standard' decision with a bebauungsplan_specific
 * caveat so the brief is honest about the resolver not yet covering
 * the case.
 */
/**
 * Four-class campaign Phase 1b — honor a verdict whose cited § CONTRADICTS the
 * 'simplified' default of the NRW-neubau / sanierung / umnutzung branches. Those
 * branches return vereinfachtes regardless of the verdict (same default-masks-
 * verdict root as Phase 1, in a sweep blind spot — its fixtures only inject
 * simplified verdicts). If the persona's verdict cites the state's FREE or
 * REGULAR § (so it contradicts the simplified default), return THAT decision;
 * null otherwise — a simplified-§ verdict or no verdict keeps the branch's
 * existing simplified output, so the common path does NOT drift. Symmetric §-read.
 */
function honorContradictingVerdict(
  viRaw: string,
  bundesland: BundeslandCode,
): ProcedureDecision | null {
  const cite = extractProcedureCitation(viRaw)
  if (!cite) return null
  const loc = getStateLocalization(bundesland).procedure
  const n = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase()
  const vc = n(cite)
  if (loc.free?.citation?.trim() && n(loc.free.citation) === vc) {
    return {
      kind: 'verfahrensfrei',
      citation: cite,
      reasoning_de: `Verfahrensfrei nach ${cite} — kein Bauantrag und keine förmliche Anzeige erforderlich; Verfahrensfreiheit mit der unteren Bauaufsichtsbehörde bestätigen.`,
      reasoning_en: `Permit-free under ${cite} — no building application and no formal notification required; confirm the permit-free status with the lower building authority.`,
      confidence: 'CALCULATED',
      caveats: [{ kind: 'bebauungsplan_specific', message_de: 'Verfahrensfreiheit vor Arbeitsbeginn mit der unteren Bauaufsichtsbehörde bestätigen.', message_en: 'Confirm permit-free status with the lower building authority before work begins.' }],
    }
  }
  if (loc.regular.citation.trim() && n(loc.regular.citation) === vc) {
    return {
      kind: 'standard',
      citation: cite,
      reasoning_de: `Reguläres Baugenehmigungsverfahren (${cite}) — vollständige bauaufsichtliche Prüfung. Bauantrag mit allen Bauvorlagen erforderlich.`,
      reasoning_en: `Standard (full) building-permit procedure (${cite}) — full building-authority review. A building application with all required documents is needed.`,
      confidence: 'CALCULATED',
      caveats: [{ kind: 'bebauungsplan_specific', message_de: 'Verfahrensart mit dem lokalen Bauamt bestätigen; Prüfumfang je nach Gebäudeklasse und Sonderbau-Tatbestand.', message_en: 'Confirm the procedure with the local building authority; review scope depends on the building class and any Sonderbau scope.' }],
    }
  }
  return null
}

export function resolveProcedure(c: ProcedureCase): ProcedureDecision {
  // fix/t07-prewalk item 1 — stamp the case intent once, at the single public
  // entry, so every label consumer renders the intent-correct anzeige wording.
  let d: ProcedureDecision = { ...decideProcedure(c), intent: c.intent }
  // ── T-05 sprint — abbruch × Denkmal: DSchG-Erlaubnis OVERLAY, not a hard
  // blocker. Demolition of a listed building needs heritage consent under the
  // state DSchG IN ADDITION to (and independent of) the LBO tier — routing it
  // to bauvoranfrage (the generic hard-blocker path) was legally imprecise,
  // and a bare "verfahrensfrei" without the DSchG qualifier would be the
  // worst silent-wrong this template can produce. The decision keeps its LBO
  // kind; the reasoning LEADS with the DSchG duty so no surface can render
  // "verfahrensfrei" unqualified. detectHardBlockers stays unchanged for
  // every other intent (denkmal carve-out is abbruch-only, see decideProcedure).
  if (c.intent === 'abbruch' && c.denkmalschutz) {
    d = {
      ...d,
      reasoning_de: `Denkmalschutz erfasst — die Beseitigung erfordert VOR Beginn eine denkmalrechtliche Erlaubnis nach dem Landes-Denkmalschutzgesetz; die LBO-Einstufung ersetzt diese Erlaubnis nicht. ${d.reasoning_de}`,
      reasoning_en: `Heritage protection applies — demolition requires heritage consent under the state DSchG BEFORE any work begins; the LBO classification does not replace that consent. ${d.reasoning_en}`,
      caveats: [
        {
          kind: 'denkmalschutz_check',
          message_de:
            'Denkmalrechtliche Erlaubnis bei der unteren Denkmalschutzbehörde beantragen — eigenständige Voraussetzung neben der LBO-Einstufung.',
          message_en:
            'Apply for heritage consent at the lower heritage authority — an independent precondition alongside the LBO classification.',
        },
        ...d.caveats,
      ],
    }
  }
  // ── T-05 sprint — pinned verdict-conflict rule: when grounded signals
  // disagreed (buildProcedureCase set verfahren_konflikt), the conservative
  // path is already decided above; here the qualifier is DOWNGRADED and the
  // conflict is flagged for architect verification — never a silent tie-break.
  if (c.verfahren_konflikt) {
    const trunc = (s: string): string => (s.length > 90 ? `${s.slice(0, 89)}…` : s)
    d = {
      ...d,
      confidence: 'ASSUMED',
      caveats: [
        {
          kind: 'verdikt_konflikt',
          message_de: `Widersprüchliche Verfahrenssignale erkannt (Faktenlage: „${trunc(c.verfahren_konflikt.fact)}" vs. Beratungsverlauf: „${trunc(c.verfahren_konflikt.persona)}") — konservativer Pfad angesetzt; verbindliche Einstufung durch Architekt:in bzw. Bauaufsicht erforderlich.`,
          message_en: `Conflicting procedure signals detected (facts: "${trunc(c.verfahren_konflikt.fact)}" vs. consultation: "${trunc(c.verfahren_konflikt.persona)}") — the more conservative path is shown; a binding classification by the architect or building authority is required.`,
        },
        ...d.caveats,
      ],
    }
  }
  return d
}

function decideProcedure(c: ProcedureCase): ProcedureDecision {
  // v1.0.21 Bug E — hard blockers first; no procedure can be decided
  // until they are cleared. T-05 sprint: for ABBRUCH the denkmalschutz
  // blocker is carved out — Denkmal demolition is handled as a DSchG
  // overlay on the LBO decision (see resolveProcedure wrapper), not as a
  // bauvoranfrage deferral. All other intents and blocker kinds unchanged.
  const blockers = detectHardBlockers(c).filter(
    (b) => !(c.intent === 'abbruch' && b.kind === 'denkmalschutz'),
  )
  if (blockers.length > 0) {
    const blockerListDe = blockers.map((b) => b.labelDe).join(' · ')
    const blockerListEn = blockers.map((b) => b.labelEn).join(' · ')
    return {
      kind: 'bauvoranfrage',
      citation:
        c.bundesland === 'nrw'
          ? '§ 71 BauO NRW (Bauvoranfrage)'
          : c.bundesland === 'bayern'
            ? 'BayBO Art. 71 (Vorbescheid)'
            : 'state-specific Voranfrage/Vorbescheid §',
      reasoning_de: `Verfahrensbestimmung zurückgestellt — Hard Blocker identifiziert: ${blockerListDe}. Verfahren kann erst nach Klärung der Zulässigkeit durch die zuständige Behörde (Bauvoranfrage) bestimmt werden.`,
      reasoning_en: `Procedure determination deferred — hard blocker(s) identified: ${blockerListEn}. The procedure cannot be set until the responsible authority confirms admissibility via a pre-decision (Bauvoranfrage / Vorbescheid).`,
      confidence: 'ASSUMED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Vorhabenkonzept kann unzulässig sein — vor jeder weiteren Planung Bauvoranfrage stellen.',
          message_en:
            'Project as currently scoped may be inadmissible — file a pre-decision (Bauvoranfrage) before any further planning.',
        },
      ],
    }
  }
  // Sprint 1 (RED-1) — SONDERBAU GATE. ≥ 1 Sonderbau-Tatbestand (Großgarage,
  // KiTa, Versammlungsstätte, …) forces the FULL regular procedure and removes
  // Genehmigungsfreistellung (§ 63) + the simplified procedure (§ 64) from
  // eligibility. This MUST run before the verfahrensfrei/vereinfacht verdict
  // branches: even if a fact mistakenly said "vereinfacht", a Sonderbau
  // building legally cannot use it. The Friedrichstraße T-02 walk proved the
  // gap — GK5 + 2 Sonderbau triggers, persona correctly said § 65, but the
  // resolver had no Sonderbau rule AND no reguläres branch, so it fell through
  // to the hardcoded NRW-neubau § 64. An explicit § 65 citation in the verdict
  // is honored; otherwise the state's regular-permit § is used.
  const viRaw = c.verfahren_indikation ?? ''
  // T-05 sprint — the Sonderbau gate forces the REGULAR BUILDING PERMIT,
  // which is a building-permit rule, not a demolition rule: demolishing a
  // building that WAS a Sonderbau does not per se trigger a Bauantrag. For
  // abbruch, a Sonderbau signal is handled conservatively inside the abbruch
  // branch (anzeige + verify caveat), never as "reguläres
  // Baugenehmigungsverfahren erforderlich". All other intents unchanged.
  if ((c.sonderbau_count ?? 0) >= 1 && c.intent !== 'abbruch') {
    const cited = extractProcedureCitation(viRaw)
    const reg = getStateLocalization(c.bundesland).procedure.regular
    const regCitation = reg.citation.trim()
    // The procedure IS the regular one (§ 65), so cite the regular §. The
    // verdict's own citation is used ONLY as a fallback for stub states with no
    // localized regular § — never to override it (a contradictory verdict that
    // said "§ 64 vereinfacht" must NOT make a Sonderbau-forced standard cite the
    // simplified §).
    const citation =
      regCitation ||
      cited ||
      'reguläres Baugenehmigungsverfahren — landesrechtliche Detail-Spezifika in Vorbereitung'
    const citeSuffix = regCitation || cited ? ` (${regCitation || cited})` : ''
    const n = c.sonderbau_count ?? 0
    return {
      kind: 'standard',
      citation,
      reasoning_de: `Mindestens ein Sonderbau-Tatbestand liegt vor (${n}) — das Vorhaben unterliegt zwingend dem regulären Baugenehmigungsverfahren${citeSuffix}. Genehmigungsfreistellung und vereinfachtes Verfahren sind ausgeschlossen.`,
      reasoning_en: `At least one Sonderbau trigger applies (${n}) — the project is subject to the full (regular) building-permit procedure${citeSuffix}. Permit exemption and the simplified procedure are excluded.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Sonderbau-Anforderungen (z. B. Brandschutzkonzept, Prüfsachverständige) mit der zuständigen Bauaufsicht abstimmen.',
          message_en:
            'Coordinate Sonderbau requirements (e.g. fire-safety concept, approved experts) with the responsible building authority.',
        },
      ],
    }
  }
  // v1.0.28 Bug 52 — honor the persona's verfahrensfrei conclusion BEFORE
  // the template-blind branches. The persona writes a verfahren_indikation
  // fact after its synthesis (e.g. T-05 Abbruch Bonn: "verfahrensfrei nach
  // § 62 BauO NRW"); the generic branch below would otherwise emit the
  // regular permit (§ 65) and contradict it — the exact T-05 smoke-walk
  // defect. We honor ONLY the permit-free direction (never to downgrade a
  // permit the resolver would require) so this can't weaken a real
  // obligation. Hard blockers above still take precedence.
  const vi = viRaw.toLowerCase()
  // T-05 sprint 2.5-B (caught by smoke-t01-composer): "genehmigungsfrei" must
  // NOT match Genehmigungsfreistellung/-freigestellt — Freistellung is a
  // notification+wait regime, not freedom; it has its own branch below.
  if (/verfahrensfrei|verfahrensfreiheit|permit[- ]?free|genehmigungsfrei(?!gestellt|stellung)|no permit (?:required|needed)/.test(vi)) {
    const cited = extractProcedureCitation(c.verfahren_indikation ?? '')
    const freeCitation =
      cited ?? getStateLocalization(c.bundesland).procedure.free?.citation ?? ''
    return {
      kind: 'verfahrensfrei',
      citation: freeCitation || (c.verfahren_indikation ?? '').trim(),
      reasoning_de: `Verfahrensfrei${freeCitation ? ` nach ${freeCitation}` : ''} — kein Bauantrag und keine förmliche Anzeige erforderlich. Pflichten ergeben sich aus dem Nebenrecht (z. B. Schadstoff- und Entsorgungsrecht); Verfahrensfreiheit mit der unteren Bauaufsichtsbehörde bestätigen.`,
      reasoning_en: `Permit-free${freeCitation ? ` under ${freeCitation}` : ''} — no building application and no formal notification required. Obligations arise from ancillary law (e.g. hazardous-materials and waste law); confirm the permit-free status with the lower building authority.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Verfahrensfreiheit vor Arbeitsbeginn mit der unteren Bauaufsichtsbehörde bestätigen — bei Sonderbau-Tatbeständen oder höherer Gebäudeklasse kann eine Genehmigungspflicht greifen.',
          message_en:
            'Confirm permit-free status with the lower building authority before work begins — a Sonderbau scope or higher building class can reinstate a permit requirement.',
        },
      ],
    }
  }
  // T-05 sprint 2.5-B — honor an explicit GENEHMIGUNGSFREISTELLUNG verdict.
  // Before this there was NO Freistellung branch: the free-branch regex
  // swallowed it as verfahrensfrei (lookahead bug above) and after that fix it
  // would have fallen to the intent baseline — masking the verdict either way.
  if (/genehmigungsfreistellung|genehmigungsfreigestellt|freistellungsverfahren|\bfreistellung\b/.test(vi)) {
    const cited = extractProcedureCitation(viRaw)
    const fsCitation =
      cited ?? STATE_CORPUS_PROCEDURE[c.bundesland]?.freistellung ?? ''
    return {
      kind: 'genehmigungsfreigestellt',
      citation: fsCitation || viRaw.trim(),
      reasoning_de: `Genehmigungsfreistellung${fsCitation ? ` nach ${fsCitation}` : ''} — kein Bauantrag, aber Vorlage bei der Gemeinde mit Wartefrist vor Baubeginn; Voraussetzungen (qualifizierter Bebauungsplan, keine Sonderbauten) müssen vollständig vorliegen.`,
      reasoning_en: `Permit exemption (Freistellung)${fsCitation ? ` under ${fsCitation}` : ''} — no building application, but submission to the municipality with a waiting period before construction; the preconditions (qualified Bebauungsplan, no Sonderbau scope) must be fully met.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Freistellungs-Voraussetzungen (qualifizierter B-Plan, Erschließung, kein Sonderbau) mit der Gemeinde bestätigen — fehlt eine, greift das Genehmigungsverfahren.',
          message_en:
            'Confirm the exemption preconditions (qualified B-Plan, infrastructure, no Sonderbau) with the municipality — if any is missing, the permit procedure applies.',
        },
      ],
    }
  }
  // fix/t07-prewalk item 3 — honor an explicit KENNTNISGABE verdict (§ 51
  // LBO BW institute). Checked BEFORE the anzeige branch so a Kenntnisgabe
  // statement that also mentions an Anzeige negation cannot mislabel, and
  // BEFORE simplified/regular. Without this branch the verdict fell to the
  // template-blind vereinfachtes baseline (the T-05-Sachsen anzeige class,
  // recurring) — contradicting the BW cell's instructed routing.
  if (/kenntnisgabe/.test(vi)) {
    const cited = extractProcedureCitation(viRaw)
    const kgCitation = cited ?? ''
    return {
      kind: 'kenntnisgabe',
      citation: kgCitation || viRaw.trim(),
      reasoning_de: `Kenntnisgabeverfahren${kgCitation ? ` nach ${kgCitation}` : ''} — keine Baugenehmigung; die Bauvorlagen werden der Gemeinde zur Kenntnis gebracht und die landesrechtliche Wartefrist vor Baubeginn ist einzuhalten. Die Voraussetzungen (insbesondere qualifizierter Bebauungsplan) müssen vollständig vorliegen.`,
      reasoning_en: `Kenntnisgabe procedure${kgCitation ? ` under ${kgCitation}` : ''} — no building permit; the building documents are submitted to the municipality for information and the statutory waiting period before construction applies. The preconditions (in particular a qualified Bebauungsplan) must be fully met.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Kenntnisgabe-Voraussetzungen (qualifizierter B-Plan, kein Sonderbau) mit der Gemeinde bestätigen — fehlt eine, greift das Genehmigungsverfahren.',
          message_en:
            'Confirm the Kenntnisgabe preconditions (qualified B-Plan, no Sonderbau scope) with the municipality — if any is missing, the permit procedure applies.',
        },
      ],
    }
  }
  // T-05 sprint — honor an explicit ANZEIGE verdict (anzeigepflichtig /
  // Abbruchanzeige / Beseitigungsanzeige). Checked AFTER verfahrensfrei (so
  // "verfahrensfrei — keine förmliche Anzeige" stays free) and BEFORE the
  // simplified/regular branches. A notification duty is its own kind — it is
  // neither a permit nor Freistellung, and shoehorning it into 'standard'
  // re-creates the §-64-on-a-demolition silent-wrong this sprint closes.
  //
  // fix/t07-prewalk item 1 — this branch is keyword-triggered and therefore
  // reachable from EVERY intent (T-07 Bayern Art. 57 Abs. 7 / BB § 62 BbgBO
  // instruct exactly this vocabulary). The Beseitigung prose and the state
  // DEMOLITION-§ fallback are correct ONLY for abbruch; a non-demolition
  // Anzeige gets neutral wording and never inherits the demolition §.
  if (/anzeigepflichtig|anzeigeverfahren|abbruchanzeige|beseitigungsanzeige|notification (?:required|procedure|requirement)/.test(vi)) {
    const cited = extractProcedureCitation(viRaw)
    const isDemolition = c.intent === 'abbruch'
    const anzCitation =
      cited ?? (isDemolition ? beseitigungCitationFor(c.bundesland) : '')
    return {
      kind: 'anzeige',
      citation: anzCitation || viRaw.trim(),
      reasoning_de: isDemolition
        ? `Anzeigepflichtige Beseitigung${anzCitation ? ` nach ${anzCitation}` : ''} — Anzeige bei der unteren Bauaufsichtsbehörde mit landesrechtlicher Wartefrist (häufig 1 Monat) vor Beginn; kein Bauantrag erforderlich. Standsicherheit angrenzender Gebäude und Nebenpflichten (Schadstoffe, Entsorgung) bleiben unberührt.`
        : `Anzeigepflichtiges Vorhaben${anzCitation ? ` nach ${anzCitation}` : ''} — Anzeige bei der zuständigen Behörde mit landesrechtlicher Wartefrist vor Beginn; kein Bauantrag erforderlich. Anzeigetatbestand, Frist und Unterlagen mit der unteren Bauaufsichtsbehörde bestätigen.`,
      reasoning_en: isDemolition
        ? `Notification-required demolition${anzCitation ? ` under ${anzCitation}` : ''} — notify the lower building authority and observe the statutory waiting period (often one month) before work begins; no building application is required. Stability of adjoining buildings and ancillary duties (pollutants, disposal) remain unaffected.`
        : `Notification-required project${anzCitation ? ` under ${anzCitation}` : ''} — notify the competent authority and observe the statutory waiting period before work begins; no building application is required. Confirm the notification basis, period and documents with the lower building authority.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Anzeigeform und Wartefrist sind landesrechtlich — Frist und Unterlagen mit der unteren Bauaufsichtsbehörde bestätigen.',
          message_en:
            'Notification form and waiting period are state law — confirm the period and required documents with the lower building authority.',
        },
      ],
    }
  }
  // v1.0.29 Bug 79 + Bug 73 — honor the persona's SIMPLIFIED-permit conclusion
  // the same way Bug 52 honors verfahrensfrei. The T-02 Hamburg walk's persona
  // concluded "Vereinfachtes Baugenehmigungsverfahren § 61 HBauO", but the
  // template-blind generic branch below emitted the REGULAR permit ("regulär")
  // with ASSUMED confidence — contradicting the state-correct persona fact on
  // PDF pages 4 + 7 and downgrading the qualifier. Honor the cited simplified
  // procedure with CALCULATED confidence (the persona reasoned it from intent +
  // Gebäudeklasse + non-Sonderbau across multiple rounds). Hard blockers +
  // verfahrensfrei above still take precedence; never used to downgrade a
  // permit the resolver would itself require.
  if (/vereinfacht|simplified/.test(vi)) {
    const cited = extractProcedureCitation(c.verfahren_indikation ?? '')
    const simpCitation = cited ?? ''
    return {
      kind: 'vereinfachtes',
      citation: simpCitation || (c.verfahren_indikation ?? '').trim(),
      reasoning_de: `Vereinfachtes Baugenehmigungsverfahren${simpCitation ? ` nach ${simpCitation}` : ''} — Bauantrag erforderlich; das Bauamt prüft Planungsrecht und örtliche Bauvorschriften, die bauvorlageberechtigte Person haftet für die übrige Materie.`,
      reasoning_en: `Simplified building permit${simpCitation ? ` under ${simpCitation}` : ''} — a building application is required; the authority reviews planning law and local building rules, the submission-authorized planner is liable for the remaining substance.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Anwendbarkeit des vereinfachten Verfahrens mit dem lokalen Bauamt bestätigen; bei Sonderbau-Tatbeständen greift das reguläre Verfahren.',
          message_en:
            'Confirm applicability of the simplified procedure with the local building authority; a Sonderbau scope reinstates the regular procedure.',
        },
      ],
    }
  }
  // Sprint 1 (RED-1) — honor the persona's REGULAR/standard verdict, the third
  // verdict direction (alongside verfahrensfrei + vereinfacht above). Before
  // this branch, a persona conclusion of "§ 65 BauO NRW — reguläres
  // Baugenehmigungsverfahren" matched NEITHER the verfahrensfrei nor the
  // vereinfacht regex and fell through to the template-default neubau branch
  // (§ 64), silently DOWNGRADING a stricter, correctly-computed obligation.
  // Honoring an upgrade to the full procedure can never weaken a requirement.
  // Guard against the simplified label, whose name also contains
  // "Baugenehmigungsverfahren".
  if (/regul[äa]r|standard|full[- ]?permit|regular building permit/.test(vi) && !/vereinfacht|simplified|frei/.test(vi)) {
    const cited = extractProcedureCitation(viRaw)
    const reg = getStateLocalization(c.bundesland).procedure.regular
    const citation = cited ?? (reg.citation.trim() || viRaw.trim())
    return {
      kind: 'standard',
      citation,
      reasoning_de: `Reguläres Baugenehmigungsverfahren${citation ? ` (${citation})` : ''} — vollständige bauaufsichtliche Prüfung. Bauantrag mit allen Bauvorlagen erforderlich.`,
      reasoning_en: `Standard (full) building-permit procedure${citation ? ` (${citation})` : ''} — full building-authority review. A building application with all required documents is needed.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Verfahrensart mit dem lokalen Bauamt bestätigen; Prüfumfang und Fachgutachten je nach Gebäudeklasse und Sonderbau-Tatbestand.',
          message_en:
            'Confirm the procedure with the local building authority; review scope and specialist reports depend on the building class and any Sonderbau scope.',
        },
      ],
    }
  }
  if (c.bundesland === 'nrw' && c.intent === 'sanierung') {
    // pre-test audit #3 — close the honor-contradicting-verdict HOLE for NRW
    // renovation. resolveNrwSanierung intercepts here, BEFORE the general-sanierung
    // honorContradictingVerdict (~l.567) can run, and it decides purely from FACTS
    // (eingriff_tragende_teile → vereinfachtes § 64) — never from the persona's
    // cited §. So an NRW renovation that cleared the hard-blocker + Sonderbau gates
    // but whose verdict cites the REGULAR § 65 / FREE § 62 BauO NRW was silently
    // shown as vereinfachtes § 64 (the exact CLASS-1 default-masks-verdict the
    // Phase-1b fix closed for every OTHER state's sanierung). Honor it here too.
    // Symmetric: a simplified-§ verdict or none → null → resolveNrwSanierung's
    // existing fact-driven output is unchanged (zero drift on the common path).
    const honored = honorContradictingVerdict(viRaw, c.bundesland)
    if (honored) return honored
    return resolveNrwSanierung(c)
  }
  if (c.bundesland === 'nrw' && c.intent === 'neubau') {
    const honored = honorContradictingVerdict(viRaw, c.bundesland)
    if (honored) return honored
    return {
      kind: 'vereinfachtes',
      citation: '§ 64 BauO NRW',
      reasoning_de:
        'Neubau löst Bauantragspflicht aus; Vereinfachtes Verfahren regelmäßig anwendbar.',
      reasoning_en:
        'New construction triggers building-permit obligation; simplified procedure typically applicable.',
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Konkreten Bebauungsplan und Gestaltungssatzung mit Bauamt verifizieren.',
          message_en:
            'Verify specific Bebauungsplan and Gestaltungssatzung with the local Bauamt.',
        },
      ],
    }
  }
  // T-03 thin-state propagation sprint — SANIERUNG (T-03), all states except
  // NRW (handled by resolveNrwSanierung above). Before this, resolveProcedure
  // had a renovation decision tree for NRW ONLY; every other state's sanierung
  // — all 11 thin states plus BW/Hessen/Niedersachsen whenever the persona
  // verdict didn't literally contain the keyword "vereinfacht" (e.g. a
  // citation-only "§ 63 LBauO M-V", or eingriff_tragende_teile=true with no
  // keyword) — fell through every branch to the generic fallback below, which
  // emits the REGULAR procedure (§ 64) at ASSUMED confidence. That silently
  // overwrote the persona's correct simplified verdict (the MV/Rostock walk:
  // chat said "vereinfachtes § 63 LBauO M-V", result showed "Standard § 64 ·
  // LEGAL·ASSUMED"). A renovation that cleared the hard-blocker + Sonderbau
  // gates is a non-Sonderbau permit case → the SIMPLIFIED procedure is the
  // correct baseline (mirrors the umnutzung branch / deriveBaselineProcedure
  // sanierung→simplified), and CALCULATED (intent + non-Sonderbau, with the
  // structural-intervention fact when present). The verfahrensfrei / vereinfacht
  // / regular keyword branches above still win whenever the persona stated one
  // explicitly, so an explicit verdict is never downgraded.
  if (c.intent === 'sanierung') {
    const honored = honorContradictingVerdict(viRaw, c.bundesland)
    if (honored) return honored
    const loc = getStateLocalization(c.bundesland)
    const simp = loc.procedure.simplified
    const simpCitation = simp.citation.trim()
    const hasCitation = simpCitation.length > 0
    const structural = c.eingriff_tragende_teile
    const citeDe = hasCitation ? ` (${simpCitation})` : ' (landesrechtliche Detail-Spezifika in Vorbereitung)'
    const citeEn = hasCitation ? ` (${simpCitation})` : ' (state-specific details being finalized)'
    return {
      kind: 'vereinfachtes',
      citation: hasCitation ? simpCitation : 'landesrechtliche Detail-Spezifika in Vorbereitung',
      reasoning_de: `${structural ? 'Eingriff in tragende Bauteile erfasst — ' : ''}Sanierung mit strukturellem oder genehmigungspflichtigem Eingriff; für nicht-Sonderbauten regelmäßig im vereinfachten Verfahren${citeDe}. Geringfügige Maßnahmen können verfahrensfrei sein — Verfahrensart mit dem lokalen Bauamt bestätigen.`,
      reasoning_en: `${structural ? 'Load-bearing intervention captured — ' : ''}A renovation with a structural or permit-triggering intervention; for non-Sonderbau cases typically via the simplified procedure${citeEn}. Minor measures may be permit-free — confirm the procedure with the local building authority.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Anwendbarkeit des vereinfachten Verfahrens mit dem lokalen Bauamt bestätigen; bei Sonderbau-Tatbeständen greift das reguläre Verfahren.',
          message_en:
            'Confirm applicability of the simplified procedure with the local building authority; a Sonderbau scope reinstates the regular procedure.',
        },
      ],
    }
  }
  // v1.0.30 Bug 90 + 91 + 92 — use-conversion (T-04). A use change that
  // cleared the hard-blocker gate above is a NON-Sonderbau permit case: the
  // building-permit obligation is CALCULATED (intent + non-Sonderbau, since a
  // Sonderbau scope would have short-circuited to bauvoranfrage), and for a
  // non-Sonderbau use change the SIMPLIFIED procedure is the correct baseline
  // (§ 63 SächsBO / § 64 BauO NRW etc.) — NOT the "(regulär)" new-build label
  // the generic branch below emits (Bug 91), and NOT ASSUMED (Bug 90). This
  // converges the PDF resolver with the web baseline, which already returns
  // loc.procedure.simplified for umnutzung (deriveBaselineProcedure.ts:98-107)
  // — Bug 92. The verfahrensfrei/vereinfacht keyword branches above still take
  // precedence whenever the persona stated one explicitly.
  if (c.intent === 'umnutzung') {
    const honored = honorContradictingVerdict(viRaw, c.bundesland)
    if (honored) return honored
    const loc = getStateLocalization(c.bundesland)
    const simp = loc.procedure.simplified
    const simpCitation = simp.citation.trim()
    const hasCitation = simpCitation.length > 0
    return {
      kind: 'vereinfachtes',
      citation: hasCitation
        ? simpCitation
        : 'landesrechtliche Detail-Spezifika in Vorbereitung',
      reasoning_de: hasCitation
        ? `Nutzungsänderung ist genehmigungspflichtig; für nicht-Sonderbauten regelmäßig im vereinfachten Verfahren (${simpCitation}). Verfahrensart und etwaige Sonderbau-Tatbestände mit dem lokalen Bauamt bestätigen.`
        : `Nutzungsänderung ist genehmigungspflichtig; für nicht-Sonderbauten regelmäßig im vereinfachten Verfahren — konkrete Verfahrensart (landesrechtliche Detail-Spezifika in Vorbereitung) mit dem lokalen Bauamt bestätigen.`,
      reasoning_en: hasCitation
        ? `A use change requires a building permit; for non-Sonderbau cases typically via the simplified procedure (${simpCitation}). Confirm the procedure type and any Sonderbau scope with the local building authority.`
        : `A use change requires a building permit; for non-Sonderbau cases typically via the simplified procedure (state-specific details being finalized) — confirm the procedure type with the local building authority.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Anwendbarkeit des vereinfachten Verfahrens mit dem lokalen Bauamt bestätigen; bei Sonderbau-Tatbeständen greift das reguläre Verfahren.',
          message_en:
            'Confirm applicability of the simplified procedure with the local building authority; a Sonderbau scope reinstates the regular procedure.',
        },
      ],
    }
  }
  // ── T-05 sprint Phase 2.5-A — NEUBAU / AUFSTOCKUNG / ANBAU intent branch.
  // The intent-branch audit proved these intents hit the generic standard-§-
  // ASSUMED fallback on every state without a dedicated branch (NRW neubau
  // excepted): a zero-verdict T-01/T-02/T-06/T-07 PDF said "Standard building
  // permit … as the starting point · ASSUMED" while the web baseline said
  // simplified — the same masking default + surface split the abbruch branch
  // closed for T-05. Doctrine (sweep + deriveBaselineProcedure + the sanierung/
  // umnutzung siblings): a residential project that cleared the hard-blocker +
  // Sonderbau gates is a non-Sonderbau permit case → SIMPLIFIED baseline,
  // CALCULATED (intent + non-Sonderbau). Explicit verdicts still win above;
  // honorContradictingVerdict covers free/regular contradictions.
  if (
    c.intent === 'neubau' ||
    c.intent === 'aufstockung' ||
    c.intent === 'anbau'
  ) {
    const honored = honorContradictingVerdict(viRaw, c.bundesland)
    if (honored) return honored
    const loc = getStateLocalization(c.bundesland)
    const simp = loc.procedure.simplified
    const simpCitation = simp.citation.trim()
    const hasCitation = simpCitation.length > 0
    const citeDe = hasCitation ? ` (${simpCitation})` : ' (landesrechtliche Detail-Spezifika in Vorbereitung)'
    const citeEn = hasCitation ? ` (${simpCitation})` : ' (state-specific details being finalized)'
    const isNeubau = c.intent === 'neubau'
    return {
      kind: 'vereinfachtes',
      citation: hasCitation ? simpCitation : 'landesrechtliche Detail-Spezifika in Vorbereitung',
      reasoning_de: isNeubau
        ? `Neubau ohne Sonderbau-Tatbestand — regelmäßig im vereinfachten Verfahren${citeDe}. Bei qualifiziertem Bebauungsplan kann die Genehmigungsfreistellung in Betracht kommen; Verfahrensart mit dem lokalen Bauamt bestätigen.`
        : `${c.intent === 'aufstockung' ? 'Aufstockung' : 'Anbau'} ist regelmäßig genehmigungspflichtig; für nicht-Sonderbauten typischerweise im vereinfachten Verfahren${citeDe}. Geringfügige Maßnahmen können verfahrensfrei sein — Verfahrensart mit dem lokalen Bauamt bestätigen.`,
      reasoning_en: isNeubau
        ? `New construction without a Sonderbau scope — typically via the simplified procedure${citeEn}. With a qualified Bebauungsplan the permit-exemption (Freistellung) route may be available; confirm the procedure with the local building authority.`
        : `${c.intent === 'aufstockung' ? 'A storey addition' : 'An extension'} typically requires a building permit; for non-Sonderbau cases via the simplified procedure${citeEn}. Minor measures may be permit-free — confirm the procedure with the local building authority.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Anwendbarkeit des vereinfachten Verfahrens mit dem lokalen Bauamt bestätigen; bei Sonderbau-Tatbeständen greift das reguläre Verfahren.',
          message_en:
            'Confirm applicability of the simplified procedure with the local building authority; a Sonderbau scope reinstates the regular procedure.',
        },
      ],
    }
  }
  // ── Four-class campaign Phase 1 — STRUCTURAL verdict honoring (root fix for
  // CLASS 1 + the CLASS-3 procedure-keyword fragility). A citation-only verdict
  // ("§ 63 LBauO M-V", no German keyword) reached here for neubau/aufstockung/
  // anbau/sonstiges and fell to the generic standard-§-ASSUMED below, masking the
  // persona's computed § on 78 cells. Classify it by COMPARING its cited § to the
  // state's free/simplified/regular §§ (all 16 states' §§ are DISTINCT, verified).
  // The read is SYMMETRIC — a regular § maps to standard, a simplified § to
  // vereinfachtes — so it can NEVER flip a correct standard verdict into a wrong
  // simplified one (the hunted regression). Placed AFTER hard-blocker + Sonderbau
  // + every keyword + NRW + sanierung + umnutzung branch (all unchanged) and
  // BEFORE the generic fallback, so its ONLY effect is to upgrade the masked
  // citation-only cases — zero output drift on existing branches. CALCULATED (the
  // persona cited a specific §). Falls through to generic only when the § matches
  // none of the state's procedure §§ (honest: a verdict we cannot classify).
  const verdictCite = extractProcedureCitation(viRaw)
  if (verdictCite) {
    const procLoc = getStateLocalization(c.bundesland).procedure
    const normCite = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase()
    const vc = normCite(verdictCite)
    const freeC = procLoc.free?.citation?.trim() ?? ''
    const simpC = procLoc.simplified.citation.trim()
    const regC = procLoc.regular.citation.trim()
    // T-05 sprint 2.5-B — the Freistellung § (corpus pack; stateLocalization
    // has no freistellung field) so a citation-only Freistellung-§ verdict
    // classifies instead of falling to the intent baseline.
    const fsC = STATE_CORPUS_PROCEDURE[c.bundesland]?.freistellung?.trim() ?? ''
    if (fsC && normCite(fsC) === vc) {
      return {
        kind: 'genehmigungsfreigestellt',
        citation: verdictCite,
        reasoning_de: `Genehmigungsfreistellung nach ${verdictCite} — kein Bauantrag, aber Vorlage bei der Gemeinde mit Wartefrist vor Baubeginn; Voraussetzungen mit der Gemeinde bestätigen.`,
        reasoning_en: `Permit exemption (Freistellung) under ${verdictCite} — no building application, but submission to the municipality with a waiting period; confirm the preconditions with the municipality.`,
        confidence: 'CALCULATED',
        caveats: [
          {
            kind: 'bebauungsplan_specific',
            message_de: 'Freistellungs-Voraussetzungen (qualifizierter B-Plan, kein Sonderbau) mit der Gemeinde bestätigen.',
            message_en: 'Confirm the exemption preconditions (qualified B-Plan, no Sonderbau) with the municipality.',
          },
        ],
      }
    }
    if (freeC && normCite(freeC) === vc) {
      return {
        kind: 'verfahrensfrei',
        citation: verdictCite,
        reasoning_de: `Verfahrensfrei nach ${verdictCite} — kein Bauantrag und keine förmliche Anzeige erforderlich; Verfahrensfreiheit mit der unteren Bauaufsichtsbehörde bestätigen.`,
        reasoning_en: `Permit-free under ${verdictCite} — no building application and no formal notification required; confirm the permit-free status with the lower building authority.`,
        confidence: 'CALCULATED',
        caveats: [
          {
            kind: 'bebauungsplan_specific',
            message_de: 'Verfahrensfreiheit vor Arbeitsbeginn mit der unteren Bauaufsichtsbehörde bestätigen — bei Sonderbau-Tatbeständen oder höherer Gebäudeklasse kann eine Genehmigungspflicht greifen.',
            message_en: 'Confirm permit-free status with the lower building authority before work begins — a Sonderbau scope or higher building class can reinstate a permit requirement.',
          },
        ],
      }
    }
    if (simpC && normCite(simpC) === vc) {
      return {
        kind: 'vereinfachtes',
        citation: verdictCite,
        reasoning_de: `Vereinfachtes Baugenehmigungsverfahren nach ${verdictCite} — Bauantrag erforderlich; das Bauamt prüft Planungsrecht und örtliche Bauvorschriften, die bauvorlageberechtigte Person haftet für die übrige Materie.`,
        reasoning_en: `Simplified building permit under ${verdictCite} — a building application is required; the authority reviews planning law and local building rules, the submission-authorized planner is liable for the remaining substance.`,
        confidence: 'CALCULATED',
        caveats: [
          {
            kind: 'bebauungsplan_specific',
            message_de: 'Anwendbarkeit des vereinfachten Verfahrens mit dem lokalen Bauamt bestätigen; bei Sonderbau-Tatbeständen greift das reguläre Verfahren.',
            message_en: 'Confirm applicability of the simplified procedure with the local building authority; a Sonderbau scope reinstates the regular procedure.',
          },
        ],
      }
    }
    if (regC && normCite(regC) === vc) {
      return {
        kind: 'standard',
        citation: verdictCite,
        reasoning_de: `Reguläres Baugenehmigungsverfahren (${verdictCite}) — vollständige bauaufsichtliche Prüfung. Bauantrag mit allen Bauvorlagen erforderlich.`,
        reasoning_en: `Standard (full) building-permit procedure (${verdictCite}) — full building-authority review. A building application with all required documents is needed.`,
        confidence: 'CALCULATED',
        caveats: [
          {
            kind: 'bebauungsplan_specific',
            message_de: 'Verfahrensart mit dem lokalen Bauamt bestätigen; Prüfumfang und Fachgutachten je nach Gebäudeklasse und Sonderbau-Tatbestand.',
            message_en: 'Confirm the procedure with the local building authority; review scope and specialist reports depend on the building class and any Sonderbau scope.',
          },
        ],
      }
    }
    // § matches none of the state's procedure §§ → fall through to the generic
    // standard-ASSUMED below (honest: a verdict we have, but cannot classify).
  }
  // ── T-05 sprint — ABBRUCH (demolition), the missing intent branch. Before
  // this, a demolition with no readable verdict fell through every branch to
  // the generic fallback below, which emitted "Standard building permit
  // (§ 64 …) as the starting point" — the Sachsen/Leipzig walk's silent-wrong.
  // The demolition verdict family is verfahrensfrei / anzeige /
  // genehmigungspflichtig-only-where-law-says (MBO family: small freestanding
  // buildings free, larger or attached ones notification + statutory wait).
  // ORDERING CONTRACT: this branch runs AFTER the Phase-1 citation-only
  // §-classifier — a citation-only verdict citing the state's free/
  // simplified/regular § resolves by its CLASS up there (the four-class
  // sweep caught this branch consuming a simplified-§ citation as the
  // demolition citation when it ran first). Only unclassifiable verdicts
  // (§ 63a-class beseitigung §§, prose) and no-verdict cases reach here.
  // The NO-INFORMATION baseline is the state's owner-side Beseitigung-§ with
  // honest verify framing at the CONSERVATIVE tier (anzeige) — NEVER the
  // regular building permit. Citation source: corpus abbruch_beseitigung pick
  // (corpusCitations.generated beseitigung), falling back to the state's free §.
  if (c.intent === 'abbruch') {
    // T-05 sprint 2.75 — TEILABBRUCH ROUTING. A partial demolition is an
    // ÄNDERUNG of the building (Bayern model: Art. 58/57 Abs. 1, NOT the
    // Art. 57 Abs. 5 Beseitigung tier) — letting it take the Beseitigung
    // path renders verfahrensfrei/Anzeige framing on a permit-shaped
    // intervention. Route to the simplified (Änderung) family with honest
    // framing; an explicit persona verdict still wins above this branch.
    if (c.abbruch_typ === 'teilabbruch') {
      const loc = getStateLocalization(c.bundesland)
      const simp = loc.procedure.simplified
      const simpCitation = simp.citation.trim()
      const hasCitation = simpCitation.length > 0
      return {
        kind: 'vereinfachtes',
        citation: hasCitation
          ? simpCitation
          : 'landesrechtliche Detail-Spezifika in Vorbereitung',
        reasoning_de: `Teilabbruch ist eine ÄNDERUNG des Gebäudes, kein Abbruch im Sinne der Beseitigungs-Vorschriften — regelmäßig genehmigungspflichtig, für nicht-Sonderbauten typischerweise im vereinfachten Verfahren${hasCitation ? ` (${simpCitation})` : ''}. Eingriffstiefe (tragende Teile, Brandwände) bestimmt den Prüfumfang.`,
        reasoning_en: `A partial demolition is an ALTERATION of the building, not a removal under the Beseitigung provisions — typically permit-required, for non-Sonderbau cases via the simplified procedure${hasCitation ? ` (${simpCitation})` : ''}. The intervention depth (load-bearing parts, fire walls) determines the review scope.`,
        confidence: 'CALCULATED',
        caveats: [
          {
            kind: 'bebauungsplan_specific',
            message_de:
              'Verfahrensart für den Teilabbruch mit dem lokalen Bauamt bestätigen; bei Eingriff in tragende Teile Standsicherheitsnachweis erforderlich.',
            message_en:
              'Confirm the procedure for the partial demolition with the local building authority; intervention in load-bearing parts requires a structural certificate.',
          },
        ],
      }
    }
    const cited = extractProcedureCitation(viRaw)
    const beseitigungCit = cited ?? beseitigungCitationFor(c.bundesland)
    const citDeSuffix = beseitigungCit ? ` (${beseitigungCit})` : ''
    const verifyCaveat: ProcedureCaveat = {
      kind: 'bebauungsplan_specific',
      message_de:
        'Landesrechtliche Schwellen (Gebäudeklasse, Höhe, umbauter Raum) und die Anzeigefrist mit der unteren Bauaufsichtsbehörde bestätigen.',
      message_en:
        'Confirm the state thresholds (building class, height, enclosed volume) and the notification period with the lower building authority.',
    }
    const attached =
      c.gebaeude_freistehend === false || c.grenzstaendig === true
    const gk = c.gebaeudeklasse_num
    // Sonderbau signal on the EXISTING building → conservative anzeige with an
    // explicit may-trigger-permit caveat (never silently "reguläres Verfahren").
    if ((c.sonderbau_count ?? 0) >= 1) {
      return {
        kind: 'anzeige',
        citation: beseitigungCit,
        reasoning_de: `Beseitigung eines Gebäudes mit Sonderbau-Merkmalen — konservativ als anzeigepflichtig${citDeSuffix} eingestuft. Je nach Landesrecht kann für Sonderbauten eine Genehmigungspflicht greifen.`,
        reasoning_en: `Demolition of a building with Sonderbau characteristics — conservatively classified as notification-required${beseitigungCit ? ` (${beseitigungCit})` : ''}. Depending on state law, a permit requirement can apply to Sonderbau structures.`,
        confidence: 'ASSUMED',
        caveats: [
          {
            kind: 'bebauungsplan_specific',
            message_de:
              'Sonderbau-Merkmale können eine Genehmigungspflicht für die Beseitigung auslösen — Einstufung mit der unteren Bauaufsichtsbehörde klären.',
            message_en:
              'Sonderbau characteristics can trigger a permit requirement for the demolition — clarify the classification with the lower building authority.',
          },
          verifyCaveat,
        ],
      }
    }
    // Freestanding + GK 1–3 captured → the MBO-family verfahrensfrei tier.
    if (c.gebaeude_freistehend === true && gk !== undefined && gk <= 3) {
      return {
        kind: 'verfahrensfrei',
        citation: beseitigungCit,
        reasoning_de: `Vollständige Beseitigung eines freistehenden Gebäudes der Gebäudeklasse ${gk} — nach${citDeSuffix || ' Landesrecht'} regelmäßig verfahrensfrei. Pflichten aus dem Nebenrecht (Standsicherheit angrenzender Bebauung, Schadstoffe, Entsorgung) bleiben bestehen.`,
        reasoning_en: `Complete demolition of a freestanding building class ${gk} building — typically procedure-free${beseitigungCit ? ` under ${beseitigungCit}` : ''}. Ancillary duties (stability of adjoining structures, pollutants, disposal) remain in force.`,
        confidence: 'CALCULATED',
        caveats: [verifyCaveat],
      }
    }
    // Attached/grenzständig OR GK > 3 → notification tier (statutory wait +
    // neighbour-stability duty for attached buildings).
    if (attached || (gk !== undefined && gk > 3)) {
      const nachbarCaveats: ProcedureCaveat[] = attached
        ? [
            {
              kind: 'nachbarbeteiligung',
              message_de:
                'Angebaute/grenzständige Lage — die Standsicherheit der Nachbarbebauung ist während und nach dem Abbruch durch qualifizierte Tragwerksplanung zu sichern (Bescheinigung regelmäßig Pflicht).',
              message_en:
                'Attached/parcel-edge situation — the stability of neighbouring buildings during and after demolition must be secured by qualified structural engineering (an attestation is typically mandatory).',
            },
          ]
        : []
      return {
        kind: 'anzeige',
        citation: beseitigungCit,
        reasoning_de: `Beseitigung ${attached ? 'eines angebauten bzw. grenzständigen Gebäudes' : `eines Gebäudes der Gebäudeklasse ${gk}`} — regelmäßig anzeigepflichtig${citDeSuffix}; Anzeige mit landesrechtlicher Wartefrist (häufig 1 Monat) vor Beginn. Kein Bauantrag erforderlich.`,
        reasoning_en: `Demolition of ${attached ? 'an attached or parcel-edge building' : `a building class ${gk} building`} — typically notification-required${beseitigungCit ? ` (${beseitigungCit})` : ''}; notify with the statutory waiting period (often one month) before work begins. No building application is required.`,
        confidence: 'CALCULATED',
        caveats: [...nachbarCaveats, verifyCaveat],
      }
    }
    // Facts unknown → CONSERVATIVE no-information baseline: treat as
    // notification-required until clarified; honest ASSUMED framing.
    return {
      kind: 'anzeige',
      citation: beseitigungCit,
      reasoning_de: `Beseitigung — je nach Gebäudegröße, -klasse und Lage verfahrensfrei oder anzeigepflichtig${citDeSuffix}. Bis zur Klärung konservativ als anzeigepflichtig behandelt; kein Bauantrag erforderlich.`,
      reasoning_en: `Demolition — procedure-free or notification-required${beseitigungCit ? ` (${beseitigungCit})` : ''} depending on building size, class and situation. Treated conservatively as notification-required until clarified; no building application is required.`,
      confidence: 'ASSUMED',
      caveats: [verifyCaveat],
    }
  }
  // Generic branch for unmigrated states/intents.
  //
  // v1.0.25 Bug 26 fix — was `§ 65 BauO ${c.bundesland.toUpperCase()}`,
  // which fabricated non-existent citations for every stub state
  // ("§ 65 BauO SACHSEN", "§ 65 BauO BERLIN", …) and shipped them to
  // the PDF Areas-B body, Procedure card, and Key-Data row. Now drives
  // the citation off getStateLocalization — the SAME source the result
  // tab's deriveBaselineProcedure.ts:57-68 already uses — so the PDF
  // and tab resolvers converge:
  //   • substantive states (NRW/BW/Hessen/Niedersachsen) → real
  //     regular-permit § from the localization pack;
  //   • stub states (empty pack citation) → honest "Detail-Spezifika
  //     in Vorbereitung" framing, NEVER a fabricated §.
  // Bayern never reaches this branch (it resolves via detectProcedure
  // in costNormsMuenchen.ts), so the Bayern SHA is untouched.
  const loc = getStateLocalization(c.bundesland)
  const reg = loc.procedure.regular
  const hasCitation = reg.citation.trim().length > 0
  return {
    kind: 'standard',
    citation: hasCitation
      ? reg.citation
      : `${reg.nameDe} — landesrechtliche Detail-Spezifika in Vorbereitung`,
    // Phase-C item #2 F7 — drop the redundant ${reg.nameDe} interpolation: the
    // sentence already names the procedure ("Reguläres Baugenehmigungsverfahren"),
    // and reg.nameDe is "Baugenehmigungsverfahren (regulär)", which doubled the
    // term ("Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren …".
    reasoning_de: hasCitation
      ? `Reguläres Baugenehmigungsverfahren (${reg.citation}) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen.`
      : `Verfahrensart für ${loc.labelDe} vorbehaltlich landesrechtlicher Detail-Spezifika (in Vorbereitung) — bitte mit dem lokalen Bauamt klären.`,
    reasoning_en: hasCitation
      ? `Standard building permit (${reg.citation}) as the starting point; confirm the specific procedure with the local building authority.`
      : `Procedure for ${loc.labelEn} subject to state-specific details (being finalized) — please confirm with the local building authority.`,
    confidence: 'ASSUMED',
    // Phase-C item #2 F8 — the "landesspezifische Detailregeln noch nicht
    // vollständig hinterlegt" caveat is honest only when we lack the regular §.
    // With a corpus/hand-coded § present (all 16 states), the reasoning already
    // hedges ("konkrete Verfahrensart … bestätigen"); the stale "not yet encoded"
    // bullet misrepresents real coverage, so it is emitted only when !hasCitation.
    caveats: hasCitation
      ? []
      : [
          {
            kind: 'bebauungsplan_specific',
            message_de:
              'Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt.',
            message_en:
              'Confirm specific procedure with the local building authority — state-specific detail rules not yet fully encoded.',
          },
        ],
  }
}

function resolveNrwSanierung(c: ProcedureCase): ProcedureDecision {
  if (c.denkmalschutz || c.ensembleschutz) {
    return {
      kind: 'standard',
      citation: '§ 65 BauO NRW + Denkmalschutzgesetz NRW',
      reasoning_de:
        'Denkmalschutz erfordert immer Baugenehmigung; zusätzlich Erlaubnis der Denkmalschutzbehörde.',
      reasoning_en:
        'Heritage protection always requires a building permit plus separate consent from the heritage authority.',
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'denkmalschutz_check',
          message_de:
            'Untere Denkmalbehörde Düsseldorf konsultieren; Erlaubnis vor Baubeginn.',
          message_en:
            'Consult the local heritage authority before construction begins.',
        },
      ],
    }
  }
  if (c.eingriff_tragende_teile) {
    return {
      kind: 'vereinfachtes',
      citation: '§ 64 BauO NRW',
      reasoning_de:
        'Eingriff in tragende Teile löst Bauantrag im vereinfachten Verfahren aus.',
      reasoning_en:
        'Intervention in load-bearing elements triggers a simplified building-permit application.',
      confidence: 'CALCULATED',
      caveats: [],
    }
  }
  if (c.aenderung_aeussere_erscheinung) {
    return {
      kind: 'vereinfachtes',
      citation: '§ 64 BauO NRW',
      reasoning_de:
        'Wesentliche Änderung der äußeren Erscheinung erfordert Bauantrag.',
      reasoning_en:
        'Substantial change to the external appearance requires a building permit.',
      confidence: 'CALCULATED',
      caveats: [],
    }
  }
  if (c.eingriff_aussenhuelle) {
    const caveats: ProcedureCaveat[] = [
      {
        kind: 'gestaltungssatzung',
        message_de:
          'In innerstädtischen Erhaltungs-/Gestaltungssatzungslagen kann eine Genehmigungspflicht bestehen — mit Stadtarchiv bzw. Bauamt verifizieren.',
        message_en:
          'A Gestaltungssatzung may apply in inner-city preservation zones — verify with Stadtarchiv or local Bauamt.',
      },
    ]
    if (c.grenzstaendig || (c.fassadenflaeche_m2 ?? 0) > 100) {
      caveats.push({
        kind: 'abstand_pruefung',
        message_de:
          'Bei grenznaher Lage Abstandsflächen prüfen — § 6 Abs. 8 BauO NRW erlaubt bis 25 cm Dämmungsprojektion ohne Nachbarunterschrift.',
        message_en:
          'Verify Abstandsflächen for parcel-edge cases — § 6 Abs. 8 BauO NRW permits up to 25 cm insulation projection without neighbour consent.',
      })
    }
    return {
      kind: 'verfahrensfrei',
      citation: '§ 62 BauO NRW',
      reasoning_de:
        'Fassadendämmung/Fensterwechsel ohne wesentliche Änderung der äußeren Erscheinung und ohne Eingriff in tragende Teile sind verfahrensfrei.',
      reasoning_en:
        'Façade insulation and window replacement without substantial change to the external appearance and without structural intervention are permit-free.',
      confidence: 'CALCULATED',
      caveats,
    }
  }
  return {
    kind: 'bauvoranfrage',
    citation: '§ 71 BauO NRW',
    reasoning_de:
      'Verfahrensart aus den vorliegenden Angaben nicht eindeutig ableitbar — Bauvoranfrage empfohlen.',
    reasoning_en:
      'Procedure not unambiguously derivable from available facts — preliminary inquiry recommended.',
    confidence: 'ASSUMED',
    caveats: [
      {
        kind: 'bebauungsplan_specific',
        message_de:
          'Konkrete Maßnahmen und Bebauungsplan mit Bauamt klären.',
        message_en:
          'Clarify specific scope and Bebauungsplan with the local building authority.',
      },
    ],
  }
}

// ───────────────────────────────────────────────────────────────────────
// Sprint 1 (RED-1) — SHARED ProcedureCase builder.
//
// Before this, exportPdf built the ProcedureCase inline and the result tabs
// (At-a-Glance / Executive Read / Procedure tab) didn't build one at all —
// they read the template baseline (deriveBaselineProcedure) and ignored the
// persona's computed verdict + Sonderbau facts entirely. That is why the same
// project showed "§ 65 reguläres" on Key Data / Legal landscape but
// "§ 64 simplified · likely" on every narrative surface. One builder, read by
// the PDF AND the result-page resolver, makes the surfaces converge on ONE
// decision derived facts-first.
//
// Fact reads are shape-tolerant (the persona emits free-form keys). Boolean
// fields use the STRICT affirmative whitelist (true/'true'/'JA'/'ja') — the
// original exportPdf semantics, so a descriptive value like
// "nicht bekannt an der Einheit" reads false, NOT true. The Sonderbau count
// reads the explicit count fact, with a NEGATION-AWARE trigger fallback so
// "sonderbau_trigger = nein — Gaststätte < 60 Gäste" is correctly read as
// "no Sonderbau", not as a trigger.
// ───────────────────────────────────────────────────────────────────────

interface FactLike {
  key: string
  value: unknown
}

/** Strict affirmative — boolean ProcedureCase fields (matches original exportPdf). */
function factAffirmative(v: unknown): boolean {
  return v === true || v === 'true' || v === 'JA' || v === 'ja'
}

/**
 * Tri-state read of a captured boolean fact, using the SAME affirmative parse
 * as buildProcedureCase's factBool — the single source of truth so the role
 * resolver and the procedure verdict can never disagree on a fact.
 *   absent            → undefined  (UNKNOWN — not captured either way)
 *   present & affirm. → true
 *   present & not     → false
 * resolveRoles needs the UNKNOWN case (factBool coerces it away), so it reads
 * here directly rather than through buildProcedureCase.
 */
export function readFactTriState(
  facts: ReadonlyArray<FactLike>,
  key: string,
): boolean | undefined {
  const f = facts.find((x) => x.key === key)
  if (!f) return undefined
  return factAffirmative(f.value)
}

/** A free-form Sonderbau-trigger value is "present" unless empty or it starts
 *  with a negation (nein/kein/nicht/no/false/keine/entfällt/—). */
function sonderbauTriggerPresent(v: unknown): boolean {
  if (v === true) return true
  if (typeof v === 'number') return v > 0
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase()
    if (t.length === 0) return false
    return !/^(false|nein|no|0|keine?|kein|none|nicht|n\/a|entf[äa]llt|-|–|—)\b/.test(t)
  }
  return false
}

/**
 * Count the Sonderbau triggers the persona computed. Shape-tolerant:
 *   1. an explicit count fact (key contains "sonderbau" AND "anzahl") wins;
 *   2. otherwise, the number of distinct AFFIRMATIVE Sonderbau-trigger facts
 *      (key contains "sonderbau", excluding the count key, value not negated).
 * Returns 0 when no Sonderbau signal is present.
 */
export function detectSonderbauCount(
  facts: ReadonlyArray<FactLike> | undefined,
): number {
  if (!facts || facts.length === 0) return 0
  for (const f of facts) {
    const k = f.key.toLowerCase().replace(/[._\s-]/g, '')
    if (k.includes('sonderbau') && k.includes('anzahl')) {
      const n =
        typeof f.value === 'number' ? f.value : parseInt(String(f.value), 10)
      if (Number.isFinite(n)) return n
    }
  }
  let count = 0
  for (const f of facts) {
    const k = f.key.toLowerCase().replace(/[._\s-]/g, '')
    if (
      k.includes('sonderbau') &&
      !k.includes('anzahl') &&
      sonderbauTriggerPresent(f.value)
    ) {
      count += 1
    }
  }
  return count
}

/**
 * Build the canonical ProcedureCase from a project + its state, reading the
 * persona's facts. THE single construction site — exportPdf and the result-page
 * resolveProcedures() both call this so the PDF and the web surfaces decide the
 * procedure from identical inputs.
 */
export function buildProcedureCase(
  project: Pick<ProjectRow, 'bundesland' | 'intent'>,
  state: Partial<ProjectState>,
): ProcedureCase {
  const facts: FactLike[] = state.facts ?? []
  const factBool = (key: string, fallback = false): boolean =>
    readFactTriState(facts, key) ?? fallback
  const factNum = (key: string): number | undefined => {
    const f = facts.find((x) => x.key === key)
    if (!f) return undefined
    if (typeof f.value === 'number') return f.value
    const n = Number(f.value)
    return Number.isFinite(n) ? n : undefined
  }
  // ── T-05 sprint — PINNED VERDICT HIERARCHY: canonical/bespoke FACT verdict
  // (rank 1, resolveVerfahrensIndikation incl. the bespoke-key fallback)
  // > persona STRUCTURED procedures verdict (rank 2) > resolver-from-facts
  // (the intent branches) > intent baseline. A genuine direction conflict
  // between rank 1 and rank 2 resolves to the MORE CONSERVATIVE signal and is
  // flagged via verfahren_konflikt (resolveProcedure downgrades + flags) —
  // never a silent tie-break.
  const factVerdict = resolveVerfahrensIndikation(facts)
  const persona = extractPersonaProcedureVerdict(state.procedures)
  let verdict = factVerdict ?? persona?.text
  let verfahren_konflikt: ProcedureCase['verfahren_konflikt']
  if (factVerdict && persona) {
    const df = classifyVerdictDirection(factVerdict)
    // fix/t07-walk1 item 1a — reuse the direction extractPersonaProcedureVerdict
    // already computed (title-first); do NOT re-classify persona.text. A persona
    // entry selected 'simplified' can never be re-read as 'free' by the rationale.
    const dp = persona.dir
    if (df && dp && df !== dp) {
      verdict =
        DIRECTION_RANK[df] >= DIRECTION_RANK[dp] ? factVerdict : persona.text
      verfahren_konflikt = { fact: factVerdict, persona: persona.text }
    }
  }
  // T-05 sprint — freestanding tri-state. Exact canonical key first, then a
  // normalized-key scan. Deliberately EXACT-normalized ("gebaeudefreistehend")
  // so `nachbargebaeude_freistehend` (the NEIGHBOUR's situation) never matches.
  const gebaeude_freistehend = ((): boolean | undefined => {
    const direct = readFactTriState(facts, 'gebaeude_freistehend')
    if (direct !== undefined) return direct
    const f = facts.find((x) => {
      const k = x.key.toLowerCase().replace(/[._\s-]/g, '')
      return k === 'gebaeudefreistehend' || k === 'buildingfreestanding'
    })
    return f ? factAffirmative(f.value) : undefined
  })()
  // T-05 sprint — GK number from the canonical `gebaeudeklasse` fact ("GK 3").
  const gebaeudeklasse_num = ((): number | undefined => {
    const f = facts.find((x) => {
      const k = x.key.toLowerCase().replace(/[._\s-]/g, '')
      return k === 'gebaeudeklasse' || k === 'buildingclass'
    })
    if (!f) return undefined
    const m = String(f.value).match(/(\d)/)
    return m ? Number(m[1]) : undefined
  })()
  // T-05 sprint 2.75 — Vollabbruch/Teilabbruch from the canonical abbruch_typ.
  const abbruch_typ = ((): 'vollabbruch' | 'teilabbruch' | undefined => {
    const f = facts.find(
      (x) => x.key.toLowerCase().replace(/[._\s-]/g, '') === 'abbruchtyp',
    )
    if (!f) return undefined
    const v = String(f.value).toLowerCase()
    if (/teil/.test(v)) return 'teilabbruch'
    if (/voll/.test(v)) return 'vollabbruch'
    return undefined
  })()
  return {
    intent: intentFromTemplate((state.templateId ?? 'T-03') as TemplateId),
    bundesland: (project.bundesland ?? 'nrw') as BundeslandCode,
    eingriff_tragende_teile: factBool('eingriff_tragende_teile'),
    eingriff_aussenhuelle: factBool('eingriff_aussenhuelle', true),
    denkmalschutz: factBool('denkmalschutz'),
    ensembleschutz: factBool('ensembleschutz'),
    aenderung_aeussere_erscheinung: factBool('aenderung_aeussere_erscheinung'),
    grenzstaendig: factBool('grenzstaendig'),
    in_gestaltungssatzung: factBool('in_gestaltungssatzung'),
    fassadenflaeche_m2: factNum('fassadenflaeche_m2'),
    mk_gebietsart: factBool('mk_gebietsart'),
    bauvoranfrage_hard_blocker: factBool('bauvoranfrage_hard_blocker'),
    sonderbau_count: detectSonderbauCount(facts),
    verfahren_indikation: verdict,
    verfahren_konflikt,
    gebaeude_freistehend,
    gebaeudeklasse_num,
    abbruch_typ,
  }
}
