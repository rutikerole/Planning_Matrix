// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 4 — Chapter detection
//
// Walks messages chronologically and emits a chapter every time the
// speaking specialist materially changes — meaning the assistant
// specialist differs from the previous chapter's specialist AND at
// least 2 user messages have passed since the last chapter. This
// prevents a tight specialist hand-off mid-thought (e.g., moderator →
// planungsrecht in two consecutive assistant turns) from creating a
// divider; only structural topic shifts qualify.
//
// The latest chapter is `inProgress`; everything before it is
// `resolved`. Empty for conversations with fewer than 4 assistant
// turns to avoid early noise on a fresh project.
//
// Synthetic system rows (recovery notice / sonstige fallback in
// ChatWorkspacePage) carry `role: 'system'` and are skipped naturally
// by the role guard.
// ───────────────────────────────────────────────────────────────────────

import type { MessageRow } from '@/types/db'
import type { Specialist } from '@/types/projectState'

export interface Chapter {
  /** Index in the messages array where the divider should be inserted. */
  startIdx: number
  specialist: Specialist
  stage: 'inProgress' | 'resolved'
}

const MIN_ASSISTANT_TURNS = 4
const MIN_USER_MESSAGES_BETWEEN_CHAPTERS = 2

export function detectChapters(messages: MessageRow[]): Chapter[] {
  const assistantCount = messages.reduce(
    (n, m) => (m.role === 'assistant' ? n + 1 : n),
    0,
  )
  if (assistantCount < MIN_ASSISTANT_TURNS) return []

  const chapters: Chapter[] = []
  let lastSpecialist: string | null = null
  let userMessagesSinceChapter = 0

  messages.forEach((m, idx) => {
    if (m.role === 'user') {
      userMessagesSinceChapter += 1
      return
    }
    if (m.role !== 'assistant' || !m.specialist) return
    if (m.specialist === lastSpecialist) return
    if (
      chapters.length > 0 &&
      userMessagesSinceChapter < MIN_USER_MESSAGES_BETWEEN_CHAPTERS
    ) {
      // Specialist hand-off inside the same dialog block — track the
      // latest voice so we recognise the next genuine shift, but no
      // divider yet.
      lastSpecialist = m.specialist
      return
    }
    chapters.push({
      startIdx: idx,
      specialist: m.specialist as Specialist,
      stage: 'inProgress',
    })
    userMessagesSinceChapter = 0
    lastSpecialist = m.specialist
  })

  return chapters.map((c, i) => ({
    ...c,
    stage: i < chapters.length - 1 ? 'resolved' : 'inProgress',
  }))
}
