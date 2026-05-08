// ───────────────────────────────────────────────────────────────────────
// Phase 10.1 → Phase 11 — Citation linter (per-Bundesland firewall)
//
// Permanent safety net for the wrong-Bundesland citation bug. Scans
// every model-emitted text field on the respond tool input AFTER Zod
// validation but BEFORE the response leaves the function. Findings
// log to public.event_log as `citation.violation` events; the
// response itself is NEVER blocked — the linter is observability,
// not gating.
//
// Architecture: REJECT-WHEN-NOT-HOME-STATE.
//
//   Layer A (5 rules, no homeBundesland tag) — Bayern STRUCTURAL
//   mistakes that are wrong regardless of the active state:
//     • "Anlage 1 BayBO" / "Annex 1 BayBO" — BayBO has no Anlage 1.
//     • "§ N BayBO" — BayBO uses Art., not §.
//     • "MBO" — model law, never geltendes Recht (warning only).
//     • "relevante Bauordnung" placeholder (warning only).
//
//   Layer B (16 rules, each tagged with `homeBundesland`) — citations
//   to a Bundesland's LBO/BO that fire for projects OUTSIDE that
//   state. Every Bundesland is covered, including Bayern: a Bayern
//   citation in a NRW project flags as wrong-Bundesland.
//
// The `lintCitations(input, activeBundesland)` function takes the
// active project's Bundesland and skips any Layer-B pattern whose
// `homeBundesland` matches — that pattern's home state is the
// active state, so its citations are correct. Layer-A patterns
// always run.
//
// False-positive discipline:
//   • "Anlage 1 BayBO" anchors to BayBO. The Münchner Stellplatz-
//     satzung StPlS 926 has its own correct "Anlage 1" reference
//     (StPlS 926 Anlage 1 Nr. 1.1) that must NOT trip the linter.
//   • Cross-references to BauGB / BauNVO / GEG with "§" are fine —
//     they don't end in "BayBO".
//   • Layer-B patterns use word boundaries and require specific
//     Bundesland-identifying suffixes (e.g. "LBO BW", not plain
//     "LBO"). Known limitation: paraphrased long forms ("die
//     hessische Bauordnung" with lowercase article, "Bauordnung
//     des Landes Hessen") are NOT all caught — telemetry will
//     surface the gaps.
// ───────────────────────────────────────────────────────────────────────

import type { RespondToolInput } from '../../../src/types/respondTool.ts'
import { normalizeBundeslandCode } from '../../../src/legal/legalRegistry.ts'
import type { BundeslandCode } from '../../../src/legal/states/_types.ts'

export type CitationSeverity = 'error' | 'warning'

export interface CitationViolation {
  /** The regex pattern source string (for telemetry grouping). */
  pattern: string
  /** The exact substring that matched. */
  match: string
  /** ±25 chars surrounding the match — context for human review. */
  context: string
  severity: CitationSeverity
  /** Human-readable reason explaining what's wrong. */
  reason: string
  /** Which model-emitted text field the match was in. Examples:
   *  'message_de', 'message_en', 'recommendations_delta[<id>].detail_de',
   *  'procedures_delta[<id>].rationale_en',
   *  'documents_delta[<id>].title_de',
   *  'extracted_facts[<key>].evidence'. */
  field: string
}

interface ForbiddenPattern {
  regex: RegExp
  severity: CitationSeverity
  reason: string
  /**
   * When set, this pattern is SKIPPED if the active project's
   * `projects.bundesland` matches — i.e., this is a "wrong-Bundesland"
   * pattern that should NOT fire for projects in this very state.
   *
   * Layer-A structural patterns (Anlage 1 BayBO, § N BayBO, MBO,
   * placeholder) leave this undefined: those mistakes are wrong
   * regardless of the active Bundesland.
   *
   * Layer-B Bundesland-firewall patterns each carry their home
   * code: e.g., `BauO NRW` carries `homeBundesland = 'nrw'` so
   * a NRW project can cite BauO NRW without flagging.
   */
  homeBundesland?: BundeslandCode
}

// ── Reference: canonical Bayern + München citations ────────────────────
//
// Documentation only. Sourced from bayern.ts (BayBO articles cited there
// verbatim) and muenchen.ts (StPlS 926 + Erhaltungssatzungen + Münchner
// Baumschutzverordnung). When BAYERN_BLOCK gains a new article, append
// the canonical token here so future positive-gate code (and reviewers)
// have a single allowlist. Order = order of appearance in bayern.ts.
export const BAYERN_ALLOWED_CITATIONS: readonly string[] = [
  // BayBO core articles
  'Art. 2 Abs. 3 BayBO',
  'Art. 2 Abs. 4 BayBO',
  'Art. 6 BayBO',
  'Art. 12 BayBO',
  'Art. 44a BayBO',
  'Art. 46 Abs. 6 BayBO',
  'Art. 47 BayBO',
  'Art. 57 BayBO',
  'Art. 57 Abs. 1 Nr. 1 a BayBO',
  'Art. 57 Abs. 1 Nr. 1 b BayBO',
  'Art. 57 Abs. 1 Nr. 3 b BayBO',
  'Art. 57 Abs. 1 Nr. 18 BayBO',
  'Art. 57 Abs. 3 Nr. 3 BayBO',
  'Art. 57 Abs. 4 BayBO',
  'Art. 57 Abs. 5 BayBO',
  'Art. 57 Abs. 7 BayBO',
  'Art. 58 BayBO',
  'Art. 58a BayBO',
  'Art. 59 BayBO',
  'Art. 60 BayBO',
  'Art. 61 BayBO',
  'Art. 62 BayBO',
  'Art. 64 BayBO',
  'Art. 65 BayBO',
  'Art. 66 BayBO',
  'Art. 69 BayBO',
  'Art. 76 BayBO',
  'Art. 81 Abs. 1 Nr. 4 b BayBO',
  'Art. 82c BayBO',
  // BayDSchG
  'BayDSchG Art. 6',
  // München-specific (StPlS 926, Erhaltungssatzungen via BauGB)
  'StPlS 926 Anlage 1 Nr. 1.1',
  'StPlS 926 § 3 Abs. 2',
  'StPlS 926 § 3 Abs. 4',
  'StPlS 926 § 4 Abs. 3',
  'BauGB § 172',
  // Federal-law tokens that legitimately appear next to Bayern citations
  'BauGB § 30',
  'BauGB § 34',
  'BauGB § 35',
  'BauGB § 246e',
  'BauNVO § 19',
  'GEG § 8',
  'BauGB § 31 Abs. 3',
  'BauGB § 34 Abs. 3b',
] as const

// ── Forbidden patterns ────────────────────────────────────────────────
//
// Two layers, evaluated in order:
//
//   Layer A — Bayern-specific structural mistakes (5 rules).
//   Layer B — non-Bayern Bundesland firewall (15 rules: every LBO/BO
//             of every Bundesland except Bayern).
//
// All regex MUST carry the `g` flag (the matcher loops via `regex.exec`)
// and use word boundaries to avoid mid-token false positives.
const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  // ── Layer A: Bayern structural mistakes (audit Phase 10.1) ─────────
  {
    regex: /Anlage\s+1\s+BayBO/gi,
    severity: 'error',
    reason:
      'BayBO has no Anlage 1 — verfahrensfreie Vorhaben are listed directly in Art. 57. Anlage 1 is a BbgBO/MBO/older-NRW structure.',
  },
  {
    regex: /Annex\s+1\s+BayBO/gi,
    severity: 'error',
    reason:
      'English translation of "Anlage 1 BayBO" — same defect: BayBO has no Anlage 1. Cite BayBO Art. 57 with Absatz/Nummer.',
  },
  {
    regex: /§\s*\d+(?:\s*Abs\.\s*\d+)?(?:\s*Nr\.\s*\d+\w?)?\s*BayBO/g,
    severity: 'error',
    reason:
      'BayBO uses "Art." not "§" for its own provisions. Replace "§ NN BayBO" with "BayBO Art. NN".',
  },
  {
    regex: /Musterbauordnung|\bMBO\b/g,
    severity: 'warning',
    reason:
      'MBO is the Bauministerkonferenz model and not geltendes Recht in any Bundesland. May be mentioned historically; never cite as Rechtsgrundlage.',
  },
  {
    regex: /relevante\s+(Bauordnung|Vorschrift)|einschl[äa]gige\s+(Bauordnung|Vorschrift)/gi,
    severity: 'warning',
    reason:
      'Generic placeholder ("die relevante Bauordnung") avoids the Bayern-specific anchor. Either cite a concrete BayBO Article, or hedge with explicit Bayern-Bezug.',
  },

  // ── Layer B: per-Bundesland firewall (16 rules) ────────────────────
  // Each entry rejects citations to a Bundesland's LBO/BO unless that
  // Bundesland is the active state. Both the abbreviation and the long
  // form are matched (case-insensitive, global, word-boundary).
  // `homeBundesland` makes the rule skip when projects.bundesland
  // matches.
  {
    regex: /\bBayBO\b|\bBayerische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BayBO (Bayern) does not apply when the active project is not in Bayern.',
    homeBundesland: 'bayern',
  },
  {
    regex: /\bLBO[\s-]+BW\b|\bLandesbauordnung\s+Baden[\s-]?W[üu]rttemberg\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBO BW (Baden-Württemberg) does not apply when the active project is not in Baden-Württemberg.',
    homeBundesland: 'bw',
  },
  {
    regex: /\bBauO\s+NRW\b|\bBauordnung\s+Nordrhein[\s-]?Westfalen\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BauO NRW (Nordrhein-Westfalen) does not apply when the active project is not in Nordrhein-Westfalen.',
    homeBundesland: 'nrw',
  },
  {
    regex: /\bHBO\b|\bHessische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — HBO (Hessen) does not apply when the active project is not in Hessen.',
    homeBundesland: 'hessen',
  },
  {
    regex: /\bNBauO\b|\bNieders[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — NBauO (Niedersachsen) does not apply when the active project is not in Niedersachsen.',
    homeBundesland: 'niedersachsen',
  },
  {
    regex: /\bS[äa]chsBO\b|\bS[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — SächsBO (Sachsen) does not apply when the active project is not in Sachsen.',
    homeBundesland: 'sachsen',
  },
  {
    regex: /\bLBauO\s+RLP\b|\bLandesbauordnung\s+Rheinland[\s-]?Pfalz\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBauO RLP (Rheinland-Pfalz) does not apply when the active project is not in Rheinland-Pfalz.',
    homeBundesland: 'rlp',
  },
  {
    regex: /\bLBO\s+SH\b|\bLandesbauordnung\s+Schleswig[\s-]?Holstein\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBO SH (Schleswig-Holstein) does not apply when the active project is not in Schleswig-Holstein.',
    homeBundesland: 'sh',
  },
  {
    regex: /\bLBO\s+MV\b|\bLandesbauordnung\s+Mecklenburg[\s-]?Vorpommern\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBO MV (Mecklenburg-Vorpommern) does not apply when the active project is not in Mecklenburg-Vorpommern.',
    homeBundesland: 'mv',
  },
  {
    regex: /\bBremLBO\b|\bBremische\s+Landesbauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BremLBO (Bremen) does not apply when the active project is not in Bremen.',
    homeBundesland: 'bremen',
  },
  {
    regex: /\bHBauO\b|\bHamburgische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — HBauO (Hamburg) does not apply when the active project is not in Hamburg.',
    homeBundesland: 'hamburg',
  },
  {
    regex: /\bLBO\s+Saarland\b|\bLandesbauordnung\s+(des\s+)?Saarland(es)?\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBO Saarland does not apply when the active project is not in Saarland.',
    homeBundesland: 'saarland',
  },
  {
    regex: /\bTh[üu]rBO\b|\bTh[üu]ringer\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — ThürBO (Thüringen) does not apply when the active project is not in Thüringen.',
    homeBundesland: 'thueringen',
  },
  {
    regex: /\bBauO\s+LSA\b|\bBauordnung\s+Sachsen[\s-]?Anhalt\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BauO LSA (Sachsen-Anhalt) does not apply when the active project is not in Sachsen-Anhalt.',
    homeBundesland: 'sachsen-anhalt',
  },
  {
    regex: /\bBbgBO\b|\bBrandenburgische\s+Bauordnung\b|\bBauordnung\s+Brandenburg\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BbgBO (Brandenburg) does not apply when the active project is not in Brandenburg.',
    homeBundesland: 'brandenburg',
  },
  {
    regex: /\bBauO\s+Bln\b|\bBauordnung\s+(f[üu]r\s+)?Berlin\b|\bBerliner\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — Berliner Bauordnung does not apply when the active project is not in Berlin.',
    homeBundesland: 'berlin',
  },
]

const CONTEXT_WINDOW = 25

/**
 * Scan a single piece of text for forbidden citation patterns.
 *
 * Layer-A patterns (no `homeBundesland` tag) always run.
 * Layer-B patterns (one per Bundesland) are skipped when their
 * `homeBundesland` matches `activeBundesland` — that pattern's
 * home state is the active state, so the citation is correct.
 *
 * Implementation note: regex is reset (`lastIndex = 0`) before use
 * because each pattern uses the `g` flag for global matching. Without
 * the reset, repeated calls on the same regex object would skip past
 * earlier matches.
 */
function lintText(
  text: string,
  field: string,
  activeBundesland: BundeslandCode | null,
): CitationViolation[] {
  if (!text) return []
  const violations: CitationViolation[] = []
  for (const { regex, severity, reason, homeBundesland } of FORBIDDEN_PATTERNS) {
    if (homeBundesland && homeBundesland === activeBundesland) continue
    regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      const start = Math.max(0, m.index - CONTEXT_WINDOW)
      const end = Math.min(text.length, m.index + m[0].length + CONTEXT_WINDOW)
      violations.push({
        pattern: regex.source,
        match: m[0],
        context: text.slice(start, end),
        severity,
        reason,
        field,
      })
      // Defensive: if a regex matches a zero-length string, advance
      // manually to prevent an infinite loop.
      if (m.index === regex.lastIndex) regex.lastIndex += 1
    }
  }
  return violations
}

// ── Text-collection helper ─────────────────────────────────────────────
//
// Walks the toolInput shape defined in src/types/respondTool.ts and
// yields every model-emitted text field that the firewall must scan.
// Centralised so future fields (e.g. roles_delta.rationale_*) can be
// added in one place.
type LintInput = Pick<
  RespondToolInput,
  | 'message_de'
  | 'message_en'
  | 'recommendations_delta'
  | 'procedures_delta'
  | 'documents_delta'
  | 'extracted_facts'
>

function* collectModelTexts(
  input: LintInput,
): Iterable<{ field: string; text: string }> {
  if (input.message_de) {
    yield { field: 'message_de', text: input.message_de }
  }
  if (input.message_en) {
    yield { field: 'message_en', text: input.message_en }
  }

  for (const r of input.recommendations_delta ?? []) {
    if (r.op !== 'upsert') continue
    if (r.title_de) {
      yield { field: `recommendations_delta[${r.id}].title_de`, text: r.title_de }
    }
    if (r.title_en) {
      yield { field: `recommendations_delta[${r.id}].title_en`, text: r.title_en }
    }
    if (r.detail_de) {
      yield { field: `recommendations_delta[${r.id}].detail_de`, text: r.detail_de }
    }
    if (r.detail_en) {
      yield { field: `recommendations_delta[${r.id}].detail_en`, text: r.detail_en }
    }
  }

  for (const p of input.procedures_delta ?? []) {
    if (p.op !== 'upsert') continue
    if (p.rationale_de) {
      yield { field: `procedures_delta[${p.id}].rationale_de`, text: p.rationale_de }
    }
    if (p.rationale_en) {
      yield { field: `procedures_delta[${p.id}].rationale_en`, text: p.rationale_en }
    }
  }

  for (const d of input.documents_delta ?? []) {
    if (d.op !== 'upsert') continue
    if (d.title_de) {
      yield { field: `documents_delta[${d.id}].title_de`, text: d.title_de }
    }
    if (d.title_en) {
      yield { field: `documents_delta[${d.id}].title_en`, text: d.title_en }
    }
  }

  for (const f of input.extracted_facts ?? []) {
    if (f.evidence) {
      yield { field: `extracted_facts[${f.key}].evidence`, text: f.evidence }
    }
  }
}

/**
 * Lint every model-emitted text field on a respond-tool input.
 *
 * `activeBundesland` is the project's `projects.bundesland` value
 * (will be normalised + cast). The matching Layer-B pattern is
 * skipped — that state's citations are legitimate for the active
 * project. Layer-A structural patterns always run.
 *
 * Returns an empty array when nothing is flagged. Accepts the full
 * RespondToolInput (or any subset that names message_de / message_en
 * / *_delta / extracted_facts) so callers can simply pass `toolInput`
 * through.
 */
export function lintCitations(
  input: LintInput,
  activeBundesland?: string | null,
): CitationViolation[] {
  const code = activeBundesland
    ? (normalizeBundeslandCode(activeBundesland) as BundeslandCode)
    : null
  const violations: CitationViolation[] = []
  for (const { field, text } of collectModelTexts(input)) {
    violations.push(...lintText(text, field, code))
  }
  return violations
}

/** For tests: expose the pattern count so a consumer can guard against
 *  accidentally shipping with the list emptied. */
export const FORBIDDEN_PATTERN_COUNT = FORBIDDEN_PATTERNS.length

// ── Layer C — positive-list enforcement (v1.0.5 / audit B3) ───────────
//
// Layer A/B above are NEGATIVE filters: a model emission that matches a
// forbidden pattern is flagged. Without this Layer C, the model can
// emit a fabricated paragraph number ("BayBO Art. 99") and only the
// Vorläufig footer flags it as preliminary — that's rhetorical defense,
// not technical defense. Layer C adds POSITIVE-LIST enforcement: every
// citation the model emits in a delta-bearing item must match an entry
// in the active state's `allowedCitations`. Items whose citations
// fail the check have their qualifier downgraded to DESIGNER+ASSUMED
// in-place (mirrors factPlausibility's mutate-and-return-warnings
// posture). Fail-soft: the turn proceeds; the Vorläufig footer
// renders on the result page.
//
// MATCHING SHAPE — and where this is WEAKER than full strictness.
//
// `allowedCitations` is an array of formatted strings ('Art. 57
// Abs. 1 Nr. 1 a BayBO', 'BayDSchG Art. 6', '§ 6 HBO', 'BauGB § 30',
// 'StPlS 926 Anlage 1 Nr. 1.1', etc.). The model emits citations in
// inconsistent ordering ('BayBO Art. 57' vs 'Art. 57 BayBO'),
// inconsistent capitalisation, and inconsistent whitespace. Direct
// string equality won't work.
//
// The chosen normalisation: parse each entry to a (law, number) tuple
// — where `law` is the lowercase law-name token (`baybo`, `hbo`,
// `baugb`, `stpls 926`, etc.) and `number` is the lowercased Art./§/
// Anlage number (`57`, `6`, `30`, `82c`). The tuple is the cache key.
// At runtime, the same parser runs over every model-emitted citation;
// if its (law, number) is NOT in the allow-list set, the containing
// item is downgraded.
//
// **Limit:** sub-Absatz fabrications ('Art. 57 Abs. 99 Nr. 5 BayBO')
// are NOT caught at this granularity — Art. 57 IS in the allow-list,
// so the (BayBO, 57) tuple matches. The audit's load-bearing case
// is fabricated ARTICLE numbers ('Art. 99'); those ARE caught.
// Sub-Absatz fabrication is a v1.1+ sharpening if it surfaces.
//
// **Empty allow-list (the 11 minimum-stub states):** Layer C
// short-circuits — without a positive list to check against, the
// only sound posture is "no enforcement." The Vorläufig footer +
// Layer A/B + the persona's own discipline are the defenses for
// stub states. Documented; not silently skipped.

import type { RespondToolInput as ResponseToolInputForLayerC } from '../../../src/types/respondTool.ts'
import { resolveStateDelta as resolveStateDeltaForLayerC } from '../../../src/legal/legalRegistry.ts'

const KNOWN_LAW_TOKEN_RE =
  /\b(BayBO|BauGB|BauNVO|BayDSchG|GEG|StPlS\s*\d+|HBO|HBauO|NBauO|BauO\s*NRW|LBO(?:\s+BW|\s+SH|\s+MV|\s+Saarland)?|S[äa]chsBO|LBauO\s+RLP|BremLBO|BauO\s+LSA|BbgBO|BauO\s+Bln|Th[üu]rBO)\b/i
const ANCHOR_NUMBER_RE = /(?:Art\.|§|Anlage)\s*(\d+[a-z]?)/gi

interface ParsedCitation {
  law: string
  number: string
}

function normaliseLaw(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Parse a single allow-list entry into a (law, number) tuple.
 * Returns null if no recognisable law-token + anchor-number is
 * present — empty entries / future-proofing strings just don't
 * contribute to the set.
 */
function parseAllowedCitationEntry(s: string): ParsedCitation | null {
  const lawMatch = s.match(KNOWN_LAW_TOKEN_RE)
  // ANCHOR_NUMBER_RE is global — pull out the first match only.
  ANCHOR_NUMBER_RE.lastIndex = 0
  const anchorMatch = ANCHOR_NUMBER_RE.exec(s)
  if (!lawMatch || !anchorMatch) return null
  return {
    law: normaliseLaw(lawMatch[1]),
    number: anchorMatch[1].toLowerCase(),
  }
}

const ALLOW_KEY_CACHE = new Map<string, Set<string>>()

function getAllowKeySet(allowedCitations: ReadonlyArray<string>, cacheKey: string): Set<string> {
  const cached = ALLOW_KEY_CACHE.get(cacheKey)
  if (cached) return cached
  const set = new Set<string>()
  for (const entry of allowedCitations) {
    const parsed = parseAllowedCitationEntry(entry)
    if (parsed) set.add(`${parsed.law}|${parsed.number}`)
  }
  ALLOW_KEY_CACHE.set(cacheKey, set)
  return set
}

/**
 * Yield every (law, number, match) triple found in `text`. The
 * extractor scans for anchor+number occurrences and looks for the
 * NEAREST law-token within ±40 chars. This catches both word-orders
 * the model uses ("Art. 57 BayBO" and "BayBO Art. 57"), plus
 * BauGB/BauNVO/GEG cross-references and StPlS/Anlage forms.
 */
function* extractCitationsFromText(
  text: string,
): Iterable<ParsedCitation & { match: string; index: number }> {
  ANCHOR_NUMBER_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = ANCHOR_NUMBER_RE.exec(text)) !== null) {
    const start = Math.max(0, m.index - 40)
    const end = Math.min(text.length, m.index + m[0].length + 40)
    const ctx = text.slice(start, end)
    const lawMatch = ctx.match(KNOWN_LAW_TOKEN_RE)
    if (!lawMatch) continue
    yield {
      law: normaliseLaw(lawMatch[1]),
      number: m[1].toLowerCase(),
      match: m[0],
      index: m.index,
    }
    if (m.index === ANCHOR_NUMBER_RE.lastIndex) ANCHOR_NUMBER_RE.lastIndex += 1
  }
}

export type AllowListField =
  | 'recommendation'
  | 'procedure'
  | 'document'
  | 'role'
  | 'extracted_fact'

export interface CitationAllowListEvent {
  field: AllowListField
  /** Recommendation/procedure/document/role id, or fact `key`. */
  item_id: string
  fabricated: { law: string; number: string; match: string }[]
  reason: string
}

const REASON_PREFIX = 'citation not in allow-list'

function fmtFabricated(fab: { law: string; number: string }[]): string {
  return fab.map((f) => `${f.law.toUpperCase()} ${f.number}`).join(', ')
}

/**
 * Aggregate the texts on a single delta-item into a single string +
 * extract every citation. Returns the fabricated (law, number) tuples
 * that are NOT in the active allow-list set.
 */
function fabricatedCitationsForTexts(
  texts: Array<string | undefined>,
  allowSet: Set<string>,
): { law: string; number: string; match: string }[] {
  const seen = new Set<string>()
  const fabricated: { law: string; number: string; match: string }[] = []
  for (const t of texts) {
    if (!t) continue
    for (const cite of extractCitationsFromText(t)) {
      const key = `${cite.law}|${cite.number}`
      if (allowSet.has(key)) continue
      if (seen.has(key)) continue
      seen.add(key)
      fabricated.push({ law: cite.law, number: cite.number, match: cite.match })
    }
  }
  return fabricated
}

/**
 * v1.0.5 / audit B3 — Layer C positive-list enforcement.
 *
 * Mutates `toolInput` in place:
 *   - For each delta-item with at least one citation NOT in the
 *     active state's allow-list, downgrade its qualifier to
 *     DESIGNER+ASSUMED (recommendation: nested `qualifier`;
 *     procedures/documents/roles: top-level source/quality on the
 *     upsert; extracted_facts: top-level source/quality).
 *   - The Vorläufig footer then renders for that item on the
 *     result page (per VorlaeufigFooter's broadened isPending).
 *
 * Returns the events for event_log. Empty when no fabrications
 * found OR the active state has no allow-list (stub states).
 *
 * Fail-soft: never rejects the turn. Mirrors factPlausibility.
 */
export function enforceCitationAllowList(
  toolInput: ResponseToolInputForLayerC,
  activeBundesland: string | null | undefined,
): CitationAllowListEvent[] {
  const code = activeBundesland ? normalizeBundeslandCode(activeBundesland) : null
  if (!code) return []
  const state = resolveStateDeltaForLayerC(code)
  if (!state.allowedCitations.length) return []
  const allowSet = getAllowKeySet(state.allowedCitations, code)
  if (allowSet.size === 0) return []

  const events: CitationAllowListEvent[] = []
  const reasonSuffix = ` (active=${code})`

  // recommendations_delta upserts: qualifier nested as { source, quality }
  for (const r of toolInput.recommendations_delta ?? []) {
    if (r.op !== 'upsert') continue
    const fab = fabricatedCitationsForTexts(
      [r.title_de, r.title_en, r.detail_de, r.detail_en],
      allowSet,
    )
    if (fab.length === 0) continue
    const reason = `${REASON_PREFIX}: ${fmtFabricated(fab)}${reasonSuffix}`
    events.push({ field: 'recommendation', item_id: r.id, fabricated: fab, reason })
    r.qualifier = { source: 'DESIGNER', quality: 'ASSUMED' }
  }

  // procedures_delta / documents_delta / roles_delta upserts:
  // source / quality / reason are TOP-LEVEL on the upsert.
  for (const p of toolInput.procedures_delta ?? []) {
    if (p.op !== 'upsert') continue
    const fab = fabricatedCitationsForTexts(
      [p.title_de, p.title_en, p.rationale_de, p.rationale_en],
      allowSet,
    )
    if (fab.length === 0) continue
    const reason = `${REASON_PREFIX}: ${fmtFabricated(fab)}${reasonSuffix}`
    events.push({ field: 'procedure', item_id: p.id, fabricated: fab, reason })
    p.source = 'DESIGNER'
    p.quality = 'ASSUMED'
    p.reason = p.reason ? `${p.reason} · ${reason}` : reason
  }
  for (const d of toolInput.documents_delta ?? []) {
    if (d.op !== 'upsert') continue
    const fab = fabricatedCitationsForTexts(
      [d.title_de, d.title_en],
      allowSet,
    )
    if (fab.length === 0) continue
    const reason = `${REASON_PREFIX}: ${fmtFabricated(fab)}${reasonSuffix}`
    events.push({ field: 'document', item_id: d.id, fabricated: fab, reason })
    d.source = 'DESIGNER'
    d.quality = 'ASSUMED'
    d.reason = d.reason ? `${d.reason} · ${reason}` : reason
  }
  for (const r of toolInput.roles_delta ?? []) {
    if (r.op !== 'upsert') continue
    const fab = fabricatedCitationsForTexts(
      [r.title_de, r.title_en, r.rationale_de, r.rationale_en],
      allowSet,
    )
    if (fab.length === 0) continue
    const reason = `${REASON_PREFIX}: ${fmtFabricated(fab)}${reasonSuffix}`
    events.push({ field: 'role', item_id: r.id, fabricated: fab, reason })
    r.source = 'DESIGNER'
    r.quality = 'ASSUMED'
    r.reason = r.reason ? `${r.reason} · ${reason}` : reason
  }

  // extracted_facts: source / quality top-level, evidence is the
  // citation-bearing field.
  for (const f of toolInput.extracted_facts ?? []) {
    const fab = fabricatedCitationsForTexts([f.evidence], allowSet)
    if (fab.length === 0) continue
    const reason = `${REASON_PREFIX}: ${fmtFabricated(fab)}${reasonSuffix}`
    events.push({ field: 'extracted_fact', item_id: f.key, fabricated: fab, reason })
    f.source = 'DESIGNER'
    f.quality = 'ASSUMED'
    f.reason = f.reason ? `${f.reason} · ${reason}` : reason
  }

  return events
}

// ── Event-log wiring (Phase 10.1 commit 6) ────────────────────────────

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

const NOOP_TRACE_UUID = '00000000-0000-0000-0000-000000000000'

interface LogCitationViolationsArgs {
  supabase: SupabaseClient
  /** Auth user id from supabase.auth.getUser(). RLS on event_log
   *  requires user_id IS NULL OR user_id = auth.uid(); we pass it
   *  through explicitly so the row joins back to the auth user. */
  userId: string
  projectId: string
  /** Per-turn request id (UUID). Doubles as session_id when no
   *  client-side session is available — every server-emitted event
   *  in this turn shares this id, mirroring the per-tab semantics on
   *  the client side. */
  requestId: string
  /** logs.traces FK. Skipped when noopTracer is active (all-zeros UUID)
   *  to avoid violating the FK. */
  traceId: string | null
  violations: CitationViolation[]
}

/**
 * Insert one event_log row per violation. Best-effort: an insert
 * failure is warn-logged and swallowed — the user's response must
 * never be blocked by an observability-pipeline glitch. Same posture
 * as logTurnEvent in persistence.ts.
 *
 * Each row has:
 *   source        = 'system'  (matches event_log CHECK constraint)
 *   name          = 'citation.violation'
 *   attributes    = { pattern, match, context, severity, reason, field,
 *                     total_violations_in_turn }
 *   trace_id      = tracer.trace_id (or NULL when noop)
 *   session_id    = requestId
 *
 * The match string is short (the matched citation, ~10-30 chars) and
 * the context is bounded to ±25 chars. No user PII flows through here.
 */
export async function logCitationViolations(
  args: LogCitationViolationsArgs,
): Promise<void> {
  if (args.violations.length === 0) return

  const safeTraceId =
    args.traceId && args.traceId !== NOOP_TRACE_UUID ? args.traceId : null

  const now = new Date().toISOString()
  const rows = args.violations.map((v) => ({
    session_id: args.requestId,
    user_id: args.userId,
    project_id: args.projectId,
    source: 'system' as const,
    name: 'citation.violation',
    attributes: {
      pattern: v.pattern,
      match: v.match,
      context: v.context,
      severity: v.severity,
      reason: v.reason,
      field: v.field,
      total_violations_in_turn: args.violations.length,
    },
    client_ts: now,
    trace_id: safeTraceId,
  }))

  const { error } = await args.supabase.from('event_log').insert(rows)
  if (error) {
    console.warn(
      JSON.stringify({
        component: 'chat-turn',
        event: 'citation_lint_log_drop',
        severity: 'warn',
        project_id: args.projectId,
        violations_count: args.violations.length,
        sql_error_code: error.code ?? null,
        sql_error_message: error.message,
        hint: 'event_log insert failed — turn proceeded but the citation.violation rows were lost.',
      }),
    )
  }
}
