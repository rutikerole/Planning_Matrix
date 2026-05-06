// ───────────────────────────────────────────────────────────────────────
// Phase 3 — System prompt for chat-turn (thin shim post-refactor)
//
// Two blocks at runtime:
//
//   1. PERSONA_BLOCK_V1     — re-exports the composed legal context
//                              (`legalContext/compose.ts`) so existing
//                              consumers (index.ts, streaming.ts) keep
//                              the same import. Carries
//                              `cache_control: { type: 'ephemeral' }`
//                              in the multi-block system array. ~9–12k
//                              tokens after Phase 3.
//
//   2. buildLiveStateBlock  — per-turn ~200–500 token state summary,
//                              NOT cached. Contains templateId, plot,
//                              areas, top facts, top-3, recent
//                              questions, last user input, last
//                              specialist. Same shape as before.
//
// Phase 3 split the persona into 4 ordered slices (shared / federal /
// bayern / muenchen) under legalContext/. Phase 5 pivoted the active
// city slice from Erlangen to München; the Erlangen slice is parked
// (sleeping) — see compose.ts. The composed string is one flat
// constant, so the prompt-cache semantics are unchanged.
// ───────────────────────────────────────────────────────────────────────

import type { ProjectState, Specialist, TemplateId } from '../../../src/types/projectState.ts'
import { COMPOSED_LEGAL_CONTEXT } from './legalContext/compose.ts'

/**
 * Phase 3 — re-export of the composed prefix. Existing consumers
 * (index.ts, streaming.ts) import `PERSONA_BLOCK_V1` from here and
 * see no behavioural change; the caching marker still attaches to
 * this single string in `buildSystemBlocks` below.
 */
export const PERSONA_BLOCK_V1 = COMPOSED_LEGAL_CONTEXT

// Keep the legacy in-place persona below as `_LEGACY_PERSONA_BLOCK_V1`
// for one release cycle, gated behind a comment, so the diff in this
// commit is purely additive (re-export + dead-code-marker). It is no
// longer reachable via any import; lint will flag it after the next
// dead-code sweep.


// ── Live state block (Block 2 — uncached) ──────────────────────────────

export interface BuildLiveStateInput {
  templateId: TemplateId
  intent: string
  hasPlot: boolean
  plotAddress: string | null
  bundesland: string
  state: ProjectState
  /** The most recent user message text, raw — null when priming the first turn. */
  lastUserMessageText: string | null
  lastSpecialist: Specialist | null
}

/**
 * Compose the per-turn live state block. Kept compact (~200–500 tokens
 * typical) so the cached persona block dominates the cost.
 *
 * Format choice: text with bullet rows, not JSON. The model parses it
 * cleanly either way; bullet rows are easier to eyeball in logs.
 */
export function buildLiveStateBlock(input: BuildLiveStateInput): string {
  const { templateId, intent, hasPlot, plotAddress, bundesland, state, lastUserMessageText, lastSpecialist } = input

  const lines: string[] = []

  lines.push(`templateId: ${templateId}`)
  lines.push(`intent: ${intent}`)
  lines.push(`bundesland: ${bundesland}`)
  if (hasPlot && plotAddress) {
    lines.push(`plot: { hasPlot: true, address: ${JSON.stringify(plotAddress)} }`)
  } else {
    lines.push(`plot: { hasPlot: false }`)
  }

  // Areas
  const a = state.areas?.A?.state ?? 'PENDING'
  const b = state.areas?.B?.state ?? 'PENDING'
  const c = state.areas?.C?.state ?? 'PENDING'
  lines.push(`areas: { A: ${a}, B: ${b}, C: ${c} }`)

  // Recent facts — newest first, capped at 8.
  const facts = (state.facts ?? []).slice(-8).reverse()
  if (facts.length > 0) {
    lines.push(`facts (most recent ${facts.length}):`)
    for (const f of facts) {
      const v = typeof f.value === 'string' ? `"${f.value}"` : JSON.stringify(f.value)
      const ev = f.evidence ? `, evidence: ${JSON.stringify(f.evidence)}` : ''
      lines.push(`  • ${f.key} = ${v}  [${f.qualifier.source}/${f.qualifier.quality}${ev}]`)
    }
  } else {
    lines.push(`facts: (none yet)`)
  }

  // Recommendations — top 3 by rank.
  const recs = (state.recommendations ?? [])
    .slice()
    .sort((x, y) => x.rank - y.rank)
    .slice(0, 3)
  if (recs.length > 0) {
    lines.push(`recommendations (top-3):`)
    for (const r of recs) {
      lines.push(`  ${r.rank}. ${r.title_de}`)
    }
  } else {
    lines.push(`recommendations: (none yet)`)
  }

  // Recently asked questions — last 8 fingerprints.
  const asked = (state.questionsAsked ?? []).slice(-8)
  if (asked.length > 0) {
    lines.push(`questionsAsked (last ${asked.length}):`)
    for (const q of asked) {
      lines.push(`  • ${q.fingerprint}`)
    }
  } else {
    lines.push(`questionsAsked: (none yet)`)
  }

  // Conversation tail — minimal.
  if (lastUserMessageText) {
    const truncated = lastUserMessageText.length > 240
      ? lastUserMessageText.slice(0, 237) + '...'
      : lastUserMessageText
    lines.push(`last user input: ${JSON.stringify(truncated)}`)
  } else {
    lines.push(`last user input: (none — first turn)`)
  }

  if (lastSpecialist) {
    lines.push(`last specialist: ${lastSpecialist}`)
  }

  return lines.join('\n')
}

/**
 * Phase 3.7 #79 — locale-aware addendum. Tells the model whether to
 * make `message_en` first-class native English or just a backup mirror.
 * Lives OUTSIDE the cached PERSONA_BLOCK so the prompt cache stays
 * warm; the addendum is small enough that the per-turn cost is
 * negligible (~150 tokens, well below the 1024-token cache-write
 * threshold). Cache-read tokens on the second turn of a fresh
 * conversation are the gate for "did this break the cache?" — if they
 * stay non-zero, this addendum is safely positioned.
 */
export function buildLocaleBlock(locale: 'de' | 'en' | undefined): string {
  if (locale === 'en') {
    return [
      '═══════════════════════════════════════════════════════════════',
      'NUTZER-LOCALE',
      '═══════════════════════════════════════════════════════════════',
      'Der Nutzer hat die Oberfläche auf ENGLISCH umgeschaltet. Die UI',
      'rendert message_en als Hauptinhalt; message_de wird im Hintergrund',
      'mitgespeichert (Audit + Locale-Switch).',
      '',
      'PFLICHT: message_en muss eine vollwertige, native englische',
      'Antwort sein — keine mechanische Übersetzung, sondern eigenständig',
      'formuliert in formellem britischem Englisch ("Mr/Ms ...", "would",',
      '"shall"). Behalten Sie die Sie-Register-Strenge des deutschen',
      'Originals bei. Zitieren Sie deutsche Normen unverändert',
      '("Art. 58 BayBO", "§ 34 BauGB") — übersetzen Sie sie nicht.',
      '',
      'message_de bleibt formales Deutsch (Sie). Beide Felder bilden',
      'denselben semantischen Inhalt ab.',
      '',
      'PFLICHT für ALLE natürlichsprachlichen Felder, wenn gesetzt:',
      '  • likely_user_replies (DE) UND likely_user_replies_en (EN)',
      '  • thinking_label_de (DE) UND thinking_label_en (EN)',
      '  • input_options[*].label_de (DE) UND label_en (EN)',
      '  • recommendations_delta[*].title_de/title_en, detail_de/detail_en,',
      '    ctaLabel_de/ctaLabel_en',
      '  • procedures_delta[*].title_de/title_en, rationale_de/rationale_en',
      '  • documents_delta[*].title_de/title_en',
      '  • roles_delta[*].title_de/title_en',
      'Die UI zeigt dem Bauherrn ausschließlich die englischen Felder.',
      'Lassen Sie KEIN englisches Feld leer, wenn die deutsche Variante',
      'gesetzt ist — sonst sieht der EN-Nutzer deutschen Text.',
    ].join('\n')
  }
  return [
    '═══════════════════════════════════════════════════════════════',
    'NUTZER-LOCALE',
    '═══════════════════════════════════════════════════════════════',
    'Der Nutzer arbeitet auf DEUTSCH. message_de ist primär.',
    'message_en bleibt eine vollwertige englische Spiegelung im Sinne',
    'der Audit- und Locale-Switch-Anforderung.',
    '',
    'Auch wenn der Nutzer auf DEUTSCH arbeitet, liefern Sie bei jedem',
    'Feld mit DE/EN-Paar (input_options.label_de/_en, recommendations,',
    'procedures, documents, roles, likely_user_replies/_en,',
    'thinking_label_de/_en) IMMER beide Sprachfassungen — der Bauherr',
    'kann jederzeit auf Englisch wechseln.',
  ].join('\n')
}

import { getTemplateBlock } from './legalContext/templates/index.ts'

/**
 * Compose the multi-block system array as Anthropic expects it.
 *
 * Phase 10 — two-block cache architecture:
 *
 *   Block 1 (persona prefix) — cache_control: ephemeral.
 *     SHARED + FEDERAL + BAYERN + MUENCHEN + PERSONA_BEHAVIOUR +
 *     TEMPLATE_SHARED. Warms ONCE across all templates and projects.
 *
 *   Block 2 (per-template tail) — cache_control: ephemeral.
 *     getTemplateBlock(templateId). Warms PER TEMPLATE, hits cache
 *     on second+ turns within a template.
 *
 *   Block 3 (locale-aware addendum) — NOT cached. Per-turn locale.
 *
 *   Block 4 (live state block) — NOT cached. Per-turn project state.
 *
 * Anthropic supports up to 4 cache_control markers per request; we
 * use 2. The split keeps the long stable prefix hot regardless of
 * which template is active (better cache economics than a single
 * rebuilt prefix per template).
 */
export function buildSystemBlocks(
  liveStateText: string,
  locale: 'de' | 'en' | undefined,
  templateId: TemplateId,
) {
  return [
    {
      type: 'text' as const,
      text: PERSONA_BLOCK_V1,
      cache_control: { type: 'ephemeral' as const },
    },
    // Phase 10 — per-template tail, cached separately.
    {
      type: 'text' as const,
      text: getTemplateBlock(templateId),
      cache_control: { type: 'ephemeral' as const },
    },
    // Phase 3.7 #79 — locale-aware addendum. NOT cached.
    {
      type: 'text' as const,
      text: buildLocaleBlock(locale),
    },
    {
      type: 'text' as const,
      text: liveStateText,
    },
  ]
}
