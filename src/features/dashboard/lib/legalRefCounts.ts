import type { ProjectRow } from '@/types/db'
import type { Fact } from '@/types/projectState'

/**
 * Five fixed legal references the Cmd+K palette surfaces. Counts
 * are derived in a single pass over each project's `state.facts[]`
 * by scanning the `evidence` and `value` fields for these markers.
 *
 * Memoise per-render in the consumer (`useMemo` keyed on the
 * projects array reference) — recompute is O(n_projects · n_facts).
 */
export type LegalRefKey = 'baugb34' | 'baugb35' | 'baybo57' | 'baybo58' | 'baunvo6'
export type LegalRefCounts = Record<LegalRefKey, number>

export const LEGAL_PATTERNS: Record<LegalRefKey, RegExp> = {
  baugb34: /(§\s*34\s*BauGB|BauGB\s*§\s*34)/i,
  baugb35: /(§\s*35\s*BauGB|BauGB\s*§\s*35)/i,
  baybo57: /(BayBO\s*Art\.?\s*57|Art\.?\s*57\s*BayBO)/i,
  baybo58: /(BayBO\s*Art\.?\s*58|Art\.?\s*58\s*BayBO)/i,
  baunvo6: /(BauNVO\s*§\s*6|§\s*6\s*BauNVO|Mischgebiet)/i,
}

const KEYS: readonly LegalRefKey[] = ['baugb34', 'baugb35', 'baybo57', 'baybo58', 'baunvo6']

interface ProjectStateForCounts {
  facts?: Fact[]
}

function factHaystack(f: Fact): string {
  const evidence = typeof f.evidence === 'string' ? f.evidence : ''
  let value: string
  try {
    value = typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')
  } catch {
    value = ''
  }
  return `${evidence} ${value}`
}

/**
 * Project predicate used by the dashboard's `?legal=<key>` URL filter.
 * Single source of truth shared with the Cmd+K palette's count logic.
 */
export function projectMatchesLegalRef(project: ProjectRow, key: string): boolean {
  const pattern = (LEGAL_PATTERNS as Record<string, RegExp>)[key]
  if (!pattern) return true
  const state = project.state as ProjectStateForCounts | null | undefined
  const facts = state?.facts ?? []
  for (const f of facts) {
    let haystack: string
    try {
      haystack = factHaystack(f)
    } catch {
      continue
    }
    if (pattern.test(haystack)) return true
  }
  return false
}

export function computeLegalRefCounts(projects: readonly ProjectRow[]): LegalRefCounts {
  const counts: LegalRefCounts = {
    baugb34: 0,
    baugb35: 0,
    baybo57: 0,
    baybo58: 0,
    baunvo6: 0,
  }
  for (const project of projects) {
    const state = project.state as ProjectStateForCounts | null | undefined
    const facts = state?.facts
    if (!facts || facts.length === 0) continue
    const seen = new Set<LegalRefKey>()
    for (const fact of facts) {
      let haystack: string
      try {
        haystack = factHaystack(fact)
      } catch {
        continue
      }
      for (const key of KEYS) {
        if (seen.has(key)) continue
        if (LEGAL_PATTERNS[key].test(haystack)) seen.add(key)
      }
      if (seen.size === KEYS.length) break
    }
    for (const key of seen) counts[key]++
  }
  return counts
}
