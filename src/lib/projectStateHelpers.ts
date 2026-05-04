// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — typed mutations for projects.state JSONB
//
// Every read or write to a ProjectState happens here. The model emits
// deltas via the `respond` tool; index.ts in the Edge Function pipes
// each delta through one of these helpers, then writes the resulting
// state in a single UPDATE. This file is intentionally pure (no DB,
// no IO, no Date.now() side-effects beyond the timestamps Helpers
// stamp on qualifiers) so it's trivially testable and reusable across
// SPA + Edge Function. Imports use relative `.ts` paths so Deno can
// resolve them; Vite handles the same paths through `allowImportingTsExtensions`.
// ───────────────────────────────────────────────────────────────────────

import type {
  Areas,
  AskedQuestion,
  DocumentItem,
  Fact,
  ProjectState,
  Procedure,
  Recommendation,
  Role,
  TemplateId,
} from '../types/projectState.ts'
import type { RespondToolInput } from '../types/respondTool.ts'

// ── Initial / hydrate ──────────────────────────────────────────────────

/**
 * Seed an empty project state for a given template. Wizard insert path
 * uses this so the first chat-turn call sees a well-shaped state rather
 * than a bare `{}`.
 */
export function initialProjectState(templateId: TemplateId): ProjectState {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    templateId,
    facts: [],
    procedures: [],
    documents: [],
    roles: [],
    recommendations: [],
    areas: {
      A: { state: 'PENDING' },
      B: { state: 'PENDING' },
      C: { state: 'PENDING' },
    },
    questionsAsked: [],
    lastTurnAt: now,
  }
}

/**
 * Coerce a raw JSONB blob into a typed ProjectState. Tolerates the empty
 * `{}` default and any pre-schemaVersion state by returning a fresh
 * initial state. Future schema migrations branch on the version here.
 */
export function hydrateProjectState(
  raw: unknown,
  templateId: TemplateId,
): ProjectState {
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as { schemaVersion?: number }).schemaVersion === 1
  ) {
    return raw as ProjectState
  }
  return initialProjectState(templateId)
}

// ── Question fingerprint / dedup ───────────────────────────────────────

/**
 * Normalise a German question string into a fingerprint we can compare
 * across turns. Strips diacritics, lowercases, collapses non-alphanumeric
 * to spaces, trims, caps at 200 chars. Imperfect (the model can rephrase)
 * but combined with the "do not re-ask" rule in the system prompt it
 * catches the common repeats.
 */
export function fingerprintQuestion(messageDe: string): string {
  // Strip combining diacritical marks left over after NFKD decomposition.
  // The Unicode range U+0300–U+036F covers all the marks German uses
  // (umlauts, sharp-s decomposition, etc.).
  return messageDe
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 200)
}

/**
 * Append (or refresh the timestamp on) a question fingerprint. Caps the
 * list at the 50 most recent so state size stays bounded.
 */
export function appendQuestionAsked(
  state: ProjectState,
  messageDe: string,
): ProjectState {
  const fp = fingerprintQuestion(messageDe)
  if (!fp) return state
  const askedAt = new Date().toISOString()
  const without = state.questionsAsked.filter((q) => q.fingerprint !== fp)
  const updated: AskedQuestion[] = [...without, { fingerprint: fp, askedAt }].slice(-50)
  return { ...state, questionsAsked: updated }
}

// ── Facts ──────────────────────────────────────────────────────────────

export function applyExtractedFacts(
  state: ProjectState,
  deltas: RespondToolInput['extracted_facts'] | undefined,
): ProjectState {
  if (!deltas?.length) return state
  const facts = [...state.facts]
  const setAt = new Date().toISOString()
  for (const d of deltas) {
    const fact: Fact = {
      key: d.key,
      value: d.value,
      qualifier: {
        source: d.source,
        quality: d.quality,
        setAt,
        setBy: 'assistant',
        ...(d.reason ? { reason: d.reason } : {}),
      },
      ...(d.evidence ? { evidence: d.evidence } : {}),
    }
    const idx = facts.findIndex((f) => f.key === d.key)
    if (idx >= 0) facts[idx] = fact
    else facts.push(fact)
  }
  return { ...state, facts }
}

// ── Recommendations ────────────────────────────────────────────────────

/**
 * Cap recommendations.length at this number after applying any delta.
 * Twelve gives the visible top-3 plus 9 in the Overview modal without
 * unbounded growth across long conversations. See Phase 3.1 D14.
 */
const RECOMMENDATIONS_CAP = 12

export function applyRecommendationsDelta(
  state: ProjectState,
  deltas: RespondToolInput['recommendations_delta'] | undefined,
): ProjectState {
  if (!deltas?.length) return state
  let recs = [...state.recommendations]
  const now = new Date().toISOString()
  for (const d of deltas) {
    if (d.op === 'remove') {
      recs = recs.filter((r) => r.id !== d.id)
      continue
    }
    const idx = recs.findIndex((r) => r.id === d.id)
    if (idx >= 0) {
      const cur = recs[idx]
      recs[idx] = {
        ...cur,
        ...(d.rank !== undefined ? { rank: d.rank } : {}),
        ...(d.title_de !== undefined ? { title_de: d.title_de } : {}),
        ...(d.title_en !== undefined ? { title_en: d.title_en } : {}),
        ...(d.detail_de !== undefined ? { detail_de: d.detail_de } : {}),
        ...(d.detail_en !== undefined ? { detail_en: d.detail_en } : {}),
        ...(d.ctaLabel_de !== undefined ? { ctaLabel_de: d.ctaLabel_de } : {}),
        ...(d.ctaLabel_en !== undefined ? { ctaLabel_en: d.ctaLabel_en } : {}),
        ...(d.estimated_effort !== undefined
          ? { estimated_effort: d.estimated_effort }
          : {}),
        ...(d.responsible_party !== undefined
          ? { responsible_party: d.responsible_party }
          : {}),
        ...(d.qualifier !== undefined ? { qualifier: d.qualifier } : {}),
      }
    } else {
      const fresh: Recommendation = {
        id: d.id,
        rank: d.rank ?? 999,
        title_de: d.title_de ?? '',
        title_en: d.title_en ?? '',
        detail_de: d.detail_de ?? '',
        detail_en: d.detail_en ?? '',
        ctaLabel_de: d.ctaLabel_de,
        ctaLabel_en: d.ctaLabel_en,
        estimated_effort: d.estimated_effort,
        responsible_party: d.responsible_party,
        qualifier: d.qualifier,
        createdAt: now,
      }
      recs.push(fresh)
    }
  }
  return { ...state, recommendations: normalizeRecommendations(recs) }
}

/**
 * Sort by (rank asc, createdAt asc) then renormalise ranks to 1..N so
 * the persisted state always has sequential ranks regardless of what
 * the model emitted (Phase 3.1 #29). Caps at RECOMMENDATIONS_CAP — drops
 * the lowest-ranked entries when the cap is exceeded (Phase 3.1 #30 D14).
 */
export function normalizeRecommendations(recs: Recommendation[]): Recommendation[] {
  const sorted = [...recs].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.createdAt.localeCompare(b.createdAt)
  })
  const capped = sorted.slice(0, RECOMMENDATIONS_CAP)
  return capped.map((r, idx) => ({ ...r, rank: idx + 1 }))
}

// ── Procedures ─────────────────────────────────────────────────────────

export function applyProceduresDelta(
  state: ProjectState,
  deltas: RespondToolInput['procedures_delta'] | undefined,
): ProjectState {
  if (!deltas?.length) return state
  let procs = [...state.procedures]
  const setAt = new Date().toISOString()
  for (const d of deltas) {
    if (d.op === 'remove') {
      procs = procs.filter((p) => p.id !== d.id)
      continue
    }
    const idx = procs.findIndex((p) => p.id === d.id)
    const baseQual = {
      source: d.source ?? 'LEGAL',
      quality: d.quality ?? 'CALCULATED',
      setAt,
      setBy: 'assistant' as const,
      ...(d.reason ? { reason: d.reason } : {}),
    }
    if (idx >= 0) {
      const cur = procs[idx]
      procs[idx] = {
        ...cur,
        ...(d.title_de !== undefined ? { title_de: d.title_de } : {}),
        ...(d.title_en !== undefined ? { title_en: d.title_en } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.rationale_de !== undefined ? { rationale_de: d.rationale_de } : {}),
        ...(d.rationale_en !== undefined ? { rationale_en: d.rationale_en } : {}),
        qualifier: { ...cur.qualifier, ...baseQual },
      }
    } else {
      const fresh: Procedure = {
        id: d.id,
        title_de: d.title_de ?? '',
        title_en: d.title_en ?? '',
        status: d.status ?? 'erforderlich',
        rationale_de: d.rationale_de ?? '',
        rationale_en: d.rationale_en ?? '',
        qualifier: baseQual,
      }
      procs.push(fresh)
    }
  }
  return { ...state, procedures: procs }
}

// ── Documents ──────────────────────────────────────────────────────────

export function applyDocumentsDelta(
  state: ProjectState,
  deltas: RespondToolInput['documents_delta'] | undefined,
): ProjectState {
  if (!deltas?.length) return state
  let docs = [...state.documents]
  const setAt = new Date().toISOString()
  for (const d of deltas) {
    if (d.op === 'remove') {
      docs = docs.filter((x) => x.id !== d.id)
      continue
    }
    const idx = docs.findIndex((x) => x.id === d.id)
    const baseQual = {
      source: d.source ?? 'LEGAL',
      quality: d.quality ?? 'CALCULATED',
      setAt,
      setBy: 'assistant' as const,
      ...(d.reason ? { reason: d.reason } : {}),
    }
    if (idx >= 0) {
      const cur = docs[idx]
      docs[idx] = {
        ...cur,
        ...(d.title_de !== undefined ? { title_de: d.title_de } : {}),
        ...(d.title_en !== undefined ? { title_en: d.title_en } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.required_for !== undefined ? { required_for: d.required_for } : {}),
        ...(d.produced_by !== undefined ? { produced_by: d.produced_by } : {}),
        qualifier: { ...cur.qualifier, ...baseQual },
      }
    } else {
      const fresh: DocumentItem = {
        id: d.id,
        title_de: d.title_de ?? '',
        title_en: d.title_en ?? '',
        status: d.status ?? 'erforderlich',
        required_for: d.required_for ?? [],
        produced_by: d.produced_by ?? [],
        qualifier: baseQual,
      }
      docs.push(fresh)
    }
  }
  return { ...state, documents: docs }
}

// ── Roles ──────────────────────────────────────────────────────────────

export function applyRolesDelta(
  state: ProjectState,
  deltas: RespondToolInput['roles_delta'] | undefined,
): ProjectState {
  if (!deltas?.length) return state
  let roles = [...state.roles]
  const setAt = new Date().toISOString()
  for (const d of deltas) {
    if (d.op === 'remove') {
      roles = roles.filter((r) => r.id !== d.id)
      continue
    }
    const idx = roles.findIndex((r) => r.id === d.id)
    const baseQual = {
      source: d.source ?? 'LEGAL',
      quality: d.quality ?? 'CALCULATED',
      setAt,
      setBy: 'assistant' as const,
      ...(d.reason ? { reason: d.reason } : {}),
    }
    if (idx >= 0) {
      const cur = roles[idx]
      roles[idx] = {
        ...cur,
        ...(d.title_de !== undefined ? { title_de: d.title_de } : {}),
        ...(d.title_en !== undefined ? { title_en: d.title_en } : {}),
        ...(d.needed !== undefined ? { needed: d.needed } : {}),
        ...(d.rationale_de !== undefined ? { rationale_de: d.rationale_de } : {}),
        ...(d.rationale_en !== undefined ? { rationale_en: d.rationale_en } : {}),
        qualifier: { ...cur.qualifier, ...baseQual },
      }
    } else {
      const fresh: Role = {
        id: d.id,
        title_de: d.title_de ?? '',
        title_en: d.title_en ?? '',
        needed: d.needed ?? true,
        rationale_de: d.rationale_de ?? '',
        rationale_en: d.rationale_en ?? '',
        qualifier: baseQual,
      }
      roles.push(fresh)
    }
  }
  return { ...state, roles }
}

// ── Areas ──────────────────────────────────────────────────────────────

export function applyAreasUpdate(
  state: ProjectState,
  update: RespondToolInput['areas_update'] | undefined,
): ProjectState {
  if (!update) return state
  const areas: Areas = {
    A: update.A ?? state.areas.A,
    B: update.B ?? state.areas.B,
    C: update.C ?? state.areas.C,
  }
  return { ...state, areas }
}

// ── Ledger summary (Phase 7 Chamber) ───────────────────────────────────

/**
 * Pure reader. Selects the bits the Chamber's LedgerPeek + StandUp
 * overlay surface: the three areas with their state, the 5 most recent
 * facts, and the top-3 recommendations by rank. No side effects.
 */
export interface LedgerSummary {
  areas: { key: 'A' | 'B' | 'C'; state: 'ACTIVE' | 'PENDING' | 'VOID' }[]
  facts: Fact[]
  topRecs: Recommendation[]
  factCount: number
  recCount: number
}

export function extractLedgerSummary(state: ProjectState | undefined): LedgerSummary {
  if (!state) {
    return {
      areas: [
        { key: 'A', state: 'PENDING' },
        { key: 'B', state: 'PENDING' },
        { key: 'C', state: 'PENDING' },
      ],
      facts: [],
      topRecs: [],
      factCount: 0,
      recCount: 0,
    }
  }
  const areas = (['A', 'B', 'C'] as const).map((key) => ({
    key,
    state: state.areas[key]?.state ?? ('PENDING' as const),
  }))
  const facts = (state.facts ?? []).slice(-5).reverse()
  const topRecs = (state.recommendations ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
  return {
    areas,
    facts,
    topRecs,
    factCount: state.facts?.length ?? 0,
    recCount: state.recommendations?.length ?? 0,
  }
}

// ── Composite turn application ─────────────────────────────────────────

/**
 * Apply every delta in a single tool call to a state, returning the new
 * state. Used by the Edge Function once Anthropic responds and again in
 * tests. Order matters in one place only: appendQuestionAsked runs after
 * the rest so the fingerprint reflects the question that was actually
 * asked this turn.
 */
export function applyToolInputToState(
  state: ProjectState,
  toolInput: RespondToolInput,
): ProjectState {
  let next = state
  next = applyExtractedFacts(next, toolInput.extracted_facts)
  next = applyRecommendationsDelta(next, toolInput.recommendations_delta)
  next = applyProceduresDelta(next, toolInput.procedures_delta)
  next = applyDocumentsDelta(next, toolInput.documents_delta)
  next = applyRolesDelta(next, toolInput.roles_delta)
  next = applyAreasUpdate(next, toolInput.areas_update)
  next = appendQuestionAsked(next, toolInput.message_de)
  next = { ...next, lastTurnAt: new Date().toISOString() }
  return next
}
