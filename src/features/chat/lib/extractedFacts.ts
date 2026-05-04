// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 8 — Extracted-facts lookup for user-message impact lines
//
// MessageUser renders a tiny "Festgehalten → Wandhöhe · Vollgeschosse"
// line below the user's bubble when the *next* assistant turn extracted
// facts. Phase 6 A.1 added the `tool_input jsonb` forensic column on
// `messages`, which carries the validated `respond` tool call payload.
// We surface the assistant turn's `extracted_facts` array on the
// preceding user message via cache lookup — no DB change required.
// ───────────────────────────────────────────────────────────────────────

import type { MessageRow } from '@/types/db'

/** Subset of ExtractedFact we need for impact-line rendering. */
export interface ImpactFact {
  key: string
  value: unknown
}

function readExtractedFacts(m: MessageRow): ImpactFact[] {
  if (!m.tool_input || typeof m.tool_input !== 'object') return []
  const ti = m.tool_input as { extracted_facts?: unknown }
  if (!Array.isArray(ti.extracted_facts)) return []
  return ti.extracted_facts.flatMap((f) => {
    if (
      f &&
      typeof f === 'object' &&
      'key' in f &&
      typeof (f as { key: unknown }).key === 'string'
    ) {
      const fact = f as { key: string; value?: unknown }
      return [{ key: fact.key, value: fact.value }]
    }
    return []
  })
}

/**
 * Returns the extracted_facts array from the assistant turn that
 * immediately follows `messages[idx]`, or [] if none / no next turn.
 * Skips non-assistant rows in case a system row sneaks in between.
 */
export function nextAssistantExtractedFacts(
  messages: MessageRow[],
  idx: number,
): ImpactFact[] {
  for (let j = idx + 1; j < messages.length; j++) {
    if (messages[j].role === 'assistant') {
      return readExtractedFacts(messages[j])
    }
  }
  return []
}
