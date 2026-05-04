// Phase 7.5 — Spine stage definitions.
//
// 8 ordered stages of the consultation. Each stage's `isDone` reads
// from the real persona-emitted state shapes:
//
//   - state.areas.{A,B,C}.state for the three legal regimes
//     (PLANUNGSRECHT / BAUORDNUNGSRECHT / SONSTIGE_VORGABEN).
//   - state.facts with UPPERCASE namespace prefixes (PROJECT.* /
//     PLOT.* / BUILDING.* / STELLPLATZ.* …) — the brief's lowercase
//     suggestions like 'project.intent' don't match the locale-mapped
//     factLabels and are intentionally not used.
//   - state.procedures.length / state.roles.length / state.recommendations.length
//     for the late stages.
//
// Stage progression is monotonic: once `isDone === true`, the stage
// stays done unless the underlying state genuinely regresses.

import type { MessageRow } from '@/types/db'
import type { ProjectState, Specialist } from '@/types/projectState'

export type SpineStageId =
  | 'project_intent'
  | 'plot_address'
  | 'planungsrecht'
  | 'bauordnungsrecht'
  | 'sonstige_vorgaben'
  | 'verfahren'
  | 'beteiligte'
  | 'final_synthesis'

export interface SpineStageDef {
  id: SpineStageId
  index: number
  titleKey: string
  ownerSpecialist: Specialist
  /** Heuristic — see file header. */
  isDone: (state: ProjectState, messages: MessageRow[]) => boolean
  /** Most-recent fact / decision text for the live-stage snippet. */
  getSnippet: (state: ProjectState) => string | null
  /** First message index where this stage was actively discussed. */
  getFirstMessageIndex: (messages: MessageRow[]) => number | null
}

const indexOfFirst = (
  messages: MessageRow[],
  pred: (m: MessageRow) => boolean,
): number | null => {
  for (let i = 0; i < messages.length; i++) {
    if (pred(messages[i])) return i
  }
  return null
}

const factPrefixCount = (state: ProjectState, prefix: string) =>
  state.facts.filter((f) => f.key?.toUpperCase().startsWith(prefix)).length

const latestFactWithPrefix = (state: ProjectState, prefix: string) => {
  for (let i = state.facts.length - 1; i >= 0; i--) {
    const f = state.facts[i]
    if (f.key?.toUpperCase().startsWith(prefix)) return f
  }
  return null
}

const formatFactSnippet = (
  state: ProjectState,
  prefix: string,
): string | null => {
  const f = latestFactWithPrefix(state, prefix)
  if (!f) return null
  const value = typeof f.value === 'string' ? f.value : JSON.stringify(f.value)
  return value.length > 0 ? value.slice(0, 60) : null
}

export const SPINE_STAGES: SpineStageDef[] = [
  {
    id: 'project_intent',
    index: 1,
    titleKey: 'chat.spine.stages.project_intent.title',
    ownerSpecialist: 'moderator',
    isDone: (state) => factPrefixCount(state, 'PROJECT.') > 0,
    getSnippet: (state) => formatFactSnippet(state, 'PROJECT.'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'moderator'),
  },
  {
    id: 'plot_address',
    index: 2,
    titleKey: 'chat.spine.stages.plot_address.title',
    ownerSpecialist: 'moderator',
    // Done when any PLOT.* fact landed OR area A is no longer PENDING
    // (no-plot path explicitly takes A → VOID; with-plot path
    // eventually flips A → ACTIVE).
    isDone: (state) =>
      factPrefixCount(state, 'PLOT.') > 0 ||
      (state.areas?.A?.state ?? 'PENDING') !== 'PENDING',
    getSnippet: (state) => formatFactSnippet(state, 'PLOT.'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'user' && m.user_answer != null),
  },
  {
    id: 'planungsrecht',
    index: 3,
    titleKey: 'chat.spine.stages.planungsrecht.title',
    ownerSpecialist: 'planungsrecht',
    // The planungsrecht persona's deliverable is moving area A to
    // ACTIVE; we treat "ACTIVE" as the canonical signal. PLOT.B_PLAN_*
    // / PLOT.IS_INNENBEREICH facts are secondary corroboration.
    isDone: (state) => state.areas?.A?.state === 'ACTIVE',
    getSnippet: (state) =>
      formatFactSnippet(state, 'PLOT.B_PLAN') ??
      formatFactSnippet(state, 'PLOT.IS_'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'planungsrecht'),
  },
  {
    id: 'bauordnungsrecht',
    index: 4,
    titleKey: 'chat.spine.stages.bauordnungsrecht.title',
    ownerSpecialist: 'bauordnungsrecht',
    isDone: (state) => state.areas?.B?.state === 'ACTIVE',
    getSnippet: (state) =>
      formatFactSnippet(state, 'BUILDING.') ??
      formatFactSnippet(state, 'STELLPLATZ.'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'bauordnungsrecht'),
  },
  {
    id: 'sonstige_vorgaben',
    index: 5,
    titleKey: 'chat.spine.stages.sonstige_vorgaben.title',
    ownerSpecialist: 'sonstige_vorgaben',
    isDone: (state) => state.areas?.C?.state === 'ACTIVE',
    getSnippet: (state) =>
      formatFactSnippet(state, 'HERITAGE.') ??
      formatFactSnippet(state, 'TREES.') ??
      formatFactSnippet(state, 'NATURSCHUTZ.'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'sonstige_vorgaben'),
  },
  {
    id: 'verfahren',
    index: 6,
    titleKey: 'chat.spine.stages.verfahren.title',
    ownerSpecialist: 'verfahren',
    // Done when at least one procedure exists with non-ASSUMED
    // qualifier (the model has committed, not just sketched).
    isDone: (state) =>
      state.procedures.some((p) => p.qualifier?.quality !== 'ASSUMED'),
    getSnippet: (state) => {
      const p = state.procedures[0]
      return p ? p.title_de.slice(0, 60) : null
    },
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'verfahren'),
  },
  {
    id: 'beteiligte',
    index: 7,
    titleKey: 'chat.spine.stages.beteiligte.title',
    ownerSpecialist: 'beteiligte',
    isDone: (state) => state.roles.length > 0,
    getSnippet: (state) => {
      const r = state.roles.find((r) => r.needed) ?? state.roles[0]
      return r ? r.title_de.slice(0, 60) : null
    },
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'beteiligte'),
  },
  {
    id: 'final_synthesis',
    index: 8,
    titleKey: 'chat.spine.stages.final_synthesis.title',
    ownerSpecialist: 'synthesizer',
    isDone: (state) => state.recommendations.length >= 3,
    getSnippet: (state) => {
      const r = state.recommendations[0]
      return r ? r.title_de.slice(0, 60) : null
    },
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'synthesizer'),
  },
]
