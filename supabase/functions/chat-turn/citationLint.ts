// ───────────────────────────────────────────────────────────────────────
// Phase 10.1 — Citation linter (Bundesland firewall)
//
// Permanent safety net for the wrong-Bundesland citation bug. Scans every
// model-emitted text field on the respond tool input (message_de,
// message_en, recommendations_delta, procedures_delta, documents_delta,
// extracted_facts.evidence) AFTER Zod validation but BEFORE the response
// leaves the function. Findings are logged to public.event_log as
// `citation.violation` events; the response itself is NEVER blocked —
// the linter is observability, not gating. A future phase will flip
// this to blocking once the false-positive rate is understood.
//
// Architecture: WHITELIST + REJECT-OTHER-BUNDESLAND.
//
//   1. BAYERN_ALLOWED_CITATIONS is a reference list of canonical Bayern
//      citation tokens (see bayern.ts + muenchen.ts as the source of
//      truth). Documentation only; not used as a positive gate today.
//   2. FORBIDDEN_PATTERNS is the active reject list. Two layers:
//      (a) The five Anlage/MBO/§-vs-Art./placeholder rules — Bayern-
//          specific structural mistakes the persona MUST avoid.
//      (b) Fifteen non-Bayern Landesbauordnungen (every Bundesland
//          except Bayern), each with abbreviation AND long-form
//          regex alternatives. These reject any citation to a wrong
//          Bundesland's building code.
//
// False-positive discipline:
//   • Pattern `/Anlage 1 BayBO/i` — anchors to BayBO. The Münchner
//     Stellplatzsatzung 926 has its own correct "Anlage 1" reference
//     (StPlS 926 Anlage 1 Nr. 1.1) that must NOT trip the linter.
//   • Pattern `/§\s*\d+\s*BayBO/` — BayBO uses Art., not §. Cross-
//     references to BauGB/BauNVO with § are fine because they don't
//     end in "BayBO".
//   • The 15 LBO-firewall patterns use word boundaries and require
//     specific Bundesland-identifying suffixes (e.g. "LBO BW" — not
//     plain "LBO" — because plain "LBO" is also a generic). Known
//     limitation: paraphrased forms ("die hessische Bauordnung" with
//     lowercase definite article, "Bauordnung des Landes Hessen")
//     are NOT all caught — telemetry will surface the gaps.
// ───────────────────────────────────────────────────────────────────────

import type { RespondToolInput } from '../../../src/types/respondTool.ts'

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

  // ── Layer B: non-Bayern Bundesland firewall (15 rules) ─────────────
  // Each entry rejects citations to a wrong Bundesland's building code.
  // Both the abbreviation and the long form are matched (case-insensitive,
  // global, word-boundary).
  {
    regex: /\bLBO[\s-]+BW\b|\bLandesbauordnung\s+Baden[\s-]?W[üu]rttemberg\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBO BW (Baden-Württemberg) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bBauO\s+NRW\b|\bBauordnung\s+Nordrhein[\s-]?Westfalen\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BauO NRW (Nordrhein-Westfalen) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bHBO\b|\bHessische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — HBO (Hessen) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bNBauO\b|\bNieders[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — NBauO (Niedersachsen) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bS[äa]chsBO\b|\bS[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — SächsBO (Sachsen) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bLBauO\s+RLP\b|\bLandesbauordnung\s+Rheinland[\s-]?Pfalz\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBauO RLP (Rheinland-Pfalz) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bLBO\s+SH\b|\bLandesbauordnung\s+Schleswig[\s-]?Holstein\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBO SH (Schleswig-Holstein) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bLBO\s+MV\b|\bLandesbauordnung\s+Mecklenburg[\s-]?Vorpommern\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBO MV (Mecklenburg-Vorpommern) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bBremLBO\b|\bBremische\s+Landesbauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BremLBO (Bremen) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bHBauO\b|\bHamburgische\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — HBauO (Hamburg) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bLBO\s+Saarland\b|\bLandesbauordnung\s+(des\s+)?Saarland(es)?\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — LBO Saarland is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bTh[üu]rBO\b|\bTh[üu]ringer\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — ThürBO (Thüringen) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bBauO\s+LSA\b|\bBauordnung\s+Sachsen[\s-]?Anhalt\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BauO LSA (Sachsen-Anhalt) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bBbgBO\b|\bBrandenburgische\s+Bauordnung\b|\bBauordnung\s+Brandenburg\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — BbgBO (Brandenburg) is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
  {
    regex: /\bBauO\s+Bln\b|\bBauordnung\s+(f[üu]r\s+)?Berlin\b|\bBerliner\s+Bauordnung\b/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — Berliner Bauordnung is not anwendbares Recht for a Bayern project. Cite BayBO instead.',
  },
]

const CONTEXT_WINDOW = 25

/**
 * Scan a single piece of text for forbidden citation patterns.
 *
 * Implementation note: regex is reset (`lastIndex = 0`) before use
 * because each pattern uses the `g` flag for global matching. Without
 * the reset, repeated calls on the same regex object would skip past
 * earlier matches.
 */
function lintText(text: string, field: string): CitationViolation[] {
  if (!text) return []
  const violations: CitationViolation[] = []
  for (const { regex, severity, reason } of FORBIDDEN_PATTERNS) {
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
 * Lint every model-emitted text field on a respond-tool input. Returns
 * an empty array when nothing is flagged. Accepts the full RespondToolInput
 * (or any subset that names message_de / message_en / *_delta /
 * extracted_facts) so callers can simply pass `toolInput` through.
 */
export function lintCitations(input: LintInput): CitationViolation[] {
  const violations: CitationViolation[] = []
  for (const { field, text } of collectModelTexts(input)) {
    violations.push(...lintText(text, field))
  }
  return violations
}

/** For tests: expose the pattern count so a consumer can guard against
 *  accidentally shipping with the list emptied. */
export const FORBIDDEN_PATTERN_COUNT = FORBIDDEN_PATTERNS.length

// ── Event-log wiring (Phase 10.1 commit 6) ────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

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
