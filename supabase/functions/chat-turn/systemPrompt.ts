// ───────────────────────────────────────────────────────────────────────
// Phase 3 → Phase 11 — System prompt for chat-turn
//
// Two blocks at runtime:
//
//   1. composeLegalContext(bundesland)  — composed legal-context
//                              PREFIX from src/legal/compose.ts. Uses
//                              the Phase 11 StateDelta registry so
//                              `projects.bundesland` selects the
//                              state slice. Phase 11 commit 1 only
//                              registers Bayern; commits 2 + 3 add
//                              the other 15. Carries
//                              `cache_control: { type: 'ephemeral' }`
//                              in the multi-block system array. ~9–13k
//                              tokens for Bayern.
//
//   2. buildLiveStateBlock  — per-turn ~200–500 token state summary,
//                              NOT cached. Contains templateId, plot,
//                              areas, top facts, top-3, recent
//                              questions, last user input, last
//                              specialist. Same shape as before.
//
// Phase 11 invariant: `composeLegalContext('bayern')` is byte-for-byte
// identical to the pre-Phase-11 `COMPOSED_LEGAL_CONTEXT` const. The
// production wizard hardcodes 'bayern' (audit B04, held), so the
// production prefix is unchanged.
// ───────────────────────────────────────────────────────────────────────

import type { ProjectState, Specialist, TemplateId } from '../../../src/types/projectState.ts'
import { composeLegalContext } from '../../../src/legal/compose.ts'


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
      // v1.0.24 Bug K root-cause — prominent "OUTPUT LANGUAGE" lead
      // instruction. v1.0.22 added a runtime sanitizer
      // (germanLeakGuard.ts) that catches German morphology on EN
      // exports and replaces it with a placeholder; this prompt
      // instruction closes the upstream pipe so the persona stops
      // emitting German content in `_en` fields. The runtime guard
      // stays as belt-and-braces.
      '═══════════════════════════════════════════════════════════════',
      'OUTPUT LANGUAGE: ENGLISH (v1.0.24 ROOT-CAUSE)',
      '═══════════════════════════════════════════════════════════════',
      '',
      'All free-form text in your response MUST be in ENGLISH. This',
      'includes:',
      '  • message_en (the primary UI-facing field)',
      '  • title_en, detail_en, ctaLabel_en on recommendations',
      '  • rationale_en on procedures',
      '  • title_en on documents and roles',
      '  • thinking_label_en, likely_user_replies_en',
      '  • input_options[*].label_en',
      '',
      'Legal terms of art STAY IN GERMAN regardless of output language:',
      '  • § citations: "§ 64 BauO NRW", "Art. 58 BayBO", "§ 34 BauGB"',
      '  • Authority names: "Bauamt", "Bauvorlageberechtigte/r", "ÖbVI"',
      '  • Proper-noun anchors: "Bebauungsplan", "Sonderbau",',
      '    "Verfahrensfreiheit", "Denkmalschutz", "Erhaltungssatzung"',
      '',
      'Everything else — explanations, hedges, blockers, action items,',
      'risk descriptions — MUST be in formal British English (would/',
      'shall/should). Translate German verbs and grammatical structures;',
      'preserve only the legal anchors above as German.',
      '',
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

import { getTemplateBlock } from '../../../src/legal/templates/index.ts'

/**
 * Compose the multi-block system array as Anthropic expects it.
 *
 * Phase 10 → Phase 11 — two-block cache architecture, now bundesland-
 * aware via the StateDelta registry:
 *
 *   Block 1 (persona prefix) — cache_control: ephemeral.
 *     SHARED + FEDERAL + state.systemBlock + state.cityBlock?
 *           + PERSONA_BEHAVIOUR + TEMPLATE_SHARED. Warms ONCE per
 *     bundesland across all templates and projects (today only
 *     Bayern is in production; the wizard hardcodes 'bayern').
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
  bundesland: string | null | undefined,
) {
  return [
    {
      type: 'text' as const,
      text: composeLegalContext(bundesland),
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
