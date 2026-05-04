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

/** Phase 7.6 §1.3 — has the named specialist spoken AND a *later*
 *  assistant turn from a different specialist landed afterwards? If
 *  so the persona has clearly moved on; treat the stage as done even
 *  if the official area-state flag never flipped. */
function specialistHandedOff(
  messages: MessageRow[],
  spec: Specialist,
): boolean {
  let sawSpec = false
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    if (!sawSpec) {
      if (m.specialist === spec) sawSpec = true
      continue
    }
    if (m.specialist && m.specialist !== spec) return true
  }
  return false
}

export const SPINE_STAGES: SpineStageDef[] = [
  {
    id: 'project_intent',
    index: 1,
    titleKey: 'chat.spine.stages.project_intent.title',
    ownerSpecialist: 'moderator',
    // Phase 7.7 §1.3 — defensive widening (matches the legal-regime
    // shape from Phase 7.6 §1.3). Done when any of:
    //   (a) any PROJECT.* fact captured (canonical persona signal)
    //   (b) the moderator has spoken AND a different specialist has
    //       since taken the floor (the persona has moved on)
    //   (c) the user has provided 2+ user-answers (the moderator's
    //       opening pair has clearly been answered)
    isDone: (state, messages) => {
      if (factPrefixCount(state, 'PROJECT.') > 0) return true
      if (specialistHandedOff(messages, 'moderator')) return true
      const userAnswers = messages.filter(
        (m) => m.role === 'user' && m.user_answer != null,
      ).length
      return userAnswers >= 2
    },
    getSnippet: (state) => formatFactSnippet(state, 'PROJECT.'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'moderator'),
  },
  {
    id: 'plot_address',
    index: 2,
    titleKey: 'chat.spine.stages.plot_address.title',
    ownerSpecialist: 'moderator',
    // Phase 7.7 §1.3 — defensive widening. Done when any of:
    //   (a) any PLOT.* fact captured
    //   (b) area A is no longer PENDING (ACTIVE for with-plot path,
    //       VOID for explicit no-plot path)
    //   (c) the planungsrecht specialist has spoken — that persona
    //       receives the plot context and only takes the floor once
    //       moderator has finished collecting it
    isDone: (state, messages) => {
      if (factPrefixCount(state, 'PLOT.') > 0) return true
      if ((state.areas?.A?.state ?? 'PENDING') !== 'PENDING') return true
      return messages.some(
        (m) => m.role === 'assistant' && m.specialist === 'planungsrecht',
      )
    },
    getSnippet: (state) => formatFactSnippet(state, 'PLOT.'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'user' && m.user_answer != null),
  },
  {
    id: 'planungsrecht',
    index: 3,
    titleKey: 'chat.spine.stages.planungsrecht.title',
    ownerSpecialist: 'planungsrecht',
    // Phase 7.6 §1.3 — defensive widening. The persona's "official"
    // deliverable is moving area A → ACTIVE, but in real conversations
    // a section is genuinely "done" when:
    //   (a) area A is ACTIVE OR VOID (committed verdict either way), OR
    //   (b) we have any PLOT.B_PLAN.* or PLOT.IS_* fact captured
    //       (Bebauungsplan situation pinned), OR
    //   (c) at least one assistant message after the planungsrecht
    //       specialist has spoken AND a different specialist has
    //       moved on (i.e., the persona handed off).
    isDone: (state, messages) => {
      const a = state.areas?.A?.state ?? 'PENDING'
      if (a === 'ACTIVE' || a === 'VOID') return true
      if (factPrefixCount(state, 'PLOT.B_PLAN') > 0) return true
      if (factPrefixCount(state, 'PLOT.IS_') > 0) return true
      return specialistHandedOff(messages, 'planungsrecht')
    },
    getSnippet: (state) =>
      formatFactSnippet(state, 'PLOT.B_PLAN') ??
      formatFactSnippet(state, 'PLOT.IS_') ??
      formatFactSnippet(state, 'PLANUNGSRECHT.'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'planungsrecht'),
  },
  {
    id: 'bauordnungsrecht',
    index: 4,
    titleKey: 'chat.spine.stages.bauordnungsrecht.title',
    ownerSpecialist: 'bauordnungsrecht',
    isDone: (state, messages) => {
      const b = state.areas?.B?.state ?? 'PENDING'
      if (b === 'ACTIVE' || b === 'VOID') return true
      if (factPrefixCount(state, 'BUILDING.') > 0) return true
      if (factPrefixCount(state, 'STELLPLATZ.') > 0) return true
      if (factPrefixCount(state, 'BRANDSCHUTZ.') > 0) return true
      if (factPrefixCount(state, 'STRUCTURAL.') > 0) return true
      if (factPrefixCount(state, 'ABSTANDSFLAECHEN.') > 0) return true
      return specialistHandedOff(messages, 'bauordnungsrecht')
    },
    getSnippet: (state) =>
      formatFactSnippet(state, 'BUILDING.') ??
      formatFactSnippet(state, 'STELLPLATZ.') ??
      formatFactSnippet(state, 'BRANDSCHUTZ.'),
    getFirstMessageIndex: (messages) =>
      indexOfFirst(messages, (m) => m.role === 'assistant' && m.specialist === 'bauordnungsrecht'),
  },
  {
    id: 'sonstige_vorgaben',
    index: 5,
    titleKey: 'chat.spine.stages.sonstige_vorgaben.title',
    ownerSpecialist: 'sonstige_vorgaben',
    isDone: (state, messages) => {
      const c = state.areas?.C?.state ?? 'PENDING'
      if (c === 'ACTIVE' || c === 'VOID') return true
      if (factPrefixCount(state, 'HERITAGE.') > 0) return true
      if (factPrefixCount(state, 'TREES.') > 0) return true
      if (factPrefixCount(state, 'NATURSCHUTZ.') > 0) return true
      return specialistHandedOff(messages, 'sonstige_vorgaben')
    },
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
