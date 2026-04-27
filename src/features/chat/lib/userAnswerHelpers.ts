// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — UserAnswer ↔ user message text bridges
//
// The chat-turn API takes a structured `userAnswer` discriminated union
// alongside a free-text `userMessage`. The model benefits from both —
// the structured payload says "the user picked option X", the free
// text is what the user "said" in conversation. These helpers go
// between them for each control type.
// ───────────────────────────────────────────────────────────────────────

import type { UserAnswer } from '@/types/chatTurn'

const IDK_TEXTS: Record<'research' | 'assume' | 'skip', string> = {
  research: 'Weiß ich nicht — bitte recherchieren.',
  assume: 'Weiß ich nicht — bitte als Annahme markieren.',
  skip: 'Weiß ich nicht — bitte zurückstellen.',
}

/**
 * Convert a structured UserAnswer into the German free-text form the
 * thread renders for the user message + sends to the model.
 */
export function buildUserMessageText(answer: UserAnswer): string {
  switch (answer.kind) {
    case 'text':
      return answer.text.trim()
    case 'yesno':
      return answer.value === 'ja' ? 'Ja' : 'Nein'
    case 'single_select':
      return answer.label_de
    case 'multi_select':
      return answer.values.map((v) => v.label_de).join(', ')
    case 'address':
      return answer.text.trim()
    case 'idk':
      return IDK_TEXTS[answer.mode]
  }
}
