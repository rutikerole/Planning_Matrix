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

const IDK_TEXTS_DE: Record<'research' | 'assume' | 'skip', string> = {
  research: 'Weiß ich nicht — bitte recherchieren.',
  assume: 'Weiß ich nicht — bitte als Annahme markieren.',
  skip: 'Weiß ich nicht — bitte zurückstellen.',
}

const IDK_TEXTS_EN: Record<'research' | 'assume' | 'skip', string> = {
  research: "I don't know — please research it.",
  assume: "I don't know — please mark it as an assumption.",
  skip: "I don't know — please set it aside for now.",
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
      return IDK_TEXTS_DE[answer.mode]
  }
}

/**
 * English mirror of `buildUserMessageText`. Used to populate the
 * `content_en` column on user messages so the thread can render
 * the user's own pick in their UI language.
 */
export function buildUserMessageTextEn(answer: UserAnswer): string {
  switch (answer.kind) {
    case 'text':
      return answer.text.trim()
    case 'yesno':
      return answer.value === 'ja' ? 'Yes' : 'No'
    case 'single_select':
      return answer.label_en || answer.label_de
    case 'multi_select':
      return answer.values
        .map((v) => v.label_en || v.label_de)
        .join(', ')
    case 'address':
      return answer.text.trim()
    case 'idk':
      return IDK_TEXTS_EN[answer.mode]
  }
}
