// ───────────────────────────────────────────────────────────────────────
// Phase 10.1 — Citation linter
//
// Permanent safety net for the wrong-Bundesland citation bug. Scans the
// model's user-visible text (`message_de` + `message_en`) for known-bad
// citation patterns AFTER Zod validation but BEFORE the response leaves
// the function. Findings are logged to public.event_log as
// `citation.violation` events; the response itself is NEVER blocked —
// the linter is observability, not gating. Telemetry drives the next
// iteration of the prompt content (and, eventually, the legalRegistry
// refactor flagged in PHASE_10_1_FINDINGS.md §6).
//
// Designed to be permanent infrastructure. When Phase 11 expands to
// Berlin / NRW / Brandenburg, add per-Bundesland forbidden lists here
// and have the caller pass the active Bundesland in. The current shape
// hard-codes Bayern because München is the only active city
// (legalContext/compose.ts comment).
//
// False-positive discipline:
//   • Pattern `/Anlage 1 BayBO/i` — anchors to BayBO. The Münchner
//     Stellplatzsatzung 926 has its own correct "Anlage 1" reference
//     (StPlS 926 Anlage 1 Nr. 1.1) that must NOT trip the linter.
//   • Pattern `/§\s*\d+\s*BayBO/` — BayBO uses Art., not §. Cross-
//     references to BauGB/BauNVO with § are fine because they don't
//     end in "BayBO".
// ───────────────────────────────────────────────────────────────────────

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
  /** Which message field the match was in. */
  field: 'message_de' | 'message_en'
}

interface ForbiddenPattern {
  regex: RegExp
  severity: CitationSeverity
  reason: string
}

/**
 * Bayern-context forbidden patterns. Order does not matter — every
 * pattern is checked against every input text. Each pattern's regex
 * MUST be sticky-free and lookahead-free to keep the matcher simple.
 */
const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
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
    regex: /Bauordnung\s+NRW|BauO\s+NRW/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — Planning Matrix advises Bayern projects. Cite BayBO, not the Nordrhein-Westfalen Bauordnung.',
  },
  {
    regex: /Bauordnung\s+Brandenburg|BbgBO/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — Planning Matrix advises Bayern projects. Cite BayBO, not the Brandenburgische Bauordnung.',
  },
  {
    regex: /Bauordnung\s+Berlin|BauO\s+Bln/gi,
    severity: 'error',
    reason:
      'Wrong Bundesland — Planning Matrix advises Bayern projects. Cite BayBO, not the Berliner Bauordnung.',
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
function lintText(
  text: string,
  field: 'message_de' | 'message_en',
): CitationViolation[] {
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

/**
 * Lint both `message_de` and `message_en` from a respond-tool input.
 * Returns an empty array when nothing is flagged.
 */
export function lintCitations(args: {
  message_de: string | null | undefined
  message_en: string | null | undefined
}): CitationViolation[] {
  const violations: CitationViolation[] = []
  if (args.message_de) {
    violations.push(...lintText(args.message_de, 'message_de'))
  }
  if (args.message_en) {
    violations.push(...lintText(args.message_en, 'message_en'))
  }
  return violations
}

/** For tests: expose the pattern count so a consumer can guard against
 *  accidentally shipping with the list emptied. */
export const FORBIDDEN_PATTERN_COUNT = FORBIDDEN_PATTERNS.length
