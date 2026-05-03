import type { ProjectRow } from '@/types/db'
import type { AreaState, Recommendation } from '@/types/projectState'
import type { ProjectDisplayStatus } from '../components/StatusPill'

/**
 * Forward-compatible read of fields the chat-turn pipeline will write
 * in a later phase. Today these may be absent — the dashboard treats
 * the absence as ACTIVE silently. No schema changes required.
 */
interface ProjectStateForDashboard {
  completionSignal?: 'needs_designer' | 'ready_for_review'
  lastAssistantInputType?:
    | 'text'
    | 'yesno'
    | 'single_select'
    | 'multi_select'
    | 'address'
    | 'none'
  recommendations?: Recommendation[]
  areas?: {
    A: { state: AreaState }
    B: { state: AreaState }
    C: { state: AreaState }
  }
}

const AWAITING_INPUTS = new Set<string>([
  'text',
  'yesno',
  'single_select',
  'multi_select',
  'address',
])

/**
 * Five-state derivation per the locked project rules:
 *   • DESIGNER  — state.completionSignal in {needs_designer, ready_for_review}
 *   • AWAITING  — status === in_progress AND lastAssistantInputType is a
 *                 question type (i.e. user has an open question)
 *   • ACTIVE    — status === in_progress AND neither of the above
 *   • PAUSED    — status === paused
 *   • ARCHIVED  — status === archived (and 'completed' renders the same way)
 *
 * The chat-turn pipeline will write completionSignal /
 * lastAssistantInputType in a later phase. Until then, every
 * in_progress row degrades to ACTIVE silently.
 */
export function deriveStatus(project: ProjectRow): ProjectDisplayStatus {
  const state = project.state as ProjectStateForDashboard | null

  if (
    state?.completionSignal === 'needs_designer' ||
    state?.completionSignal === 'ready_for_review'
  ) {
    return 'designer'
  }

  if (project.status === 'in_progress') {
    if (state?.lastAssistantInputType && AWAITING_INPUTS.has(state.lastAssistantInputType)) {
      return 'awaiting'
    }
    return 'active'
  }

  if (project.status === 'paused') return 'paused'
  if (project.status === 'completed') return 'completed'
  return 'archived'
}

export function getAreasGlyphStates(
  project: ProjectRow,
): [AreaState, AreaState, AreaState] {
  const state = project.state as ProjectStateForDashboard | null
  const areas = state?.areas
  return [
    areas?.A?.state ?? 'VOID',
    areas?.B?.state ?? 'VOID',
    areas?.C?.state ?? 'VOID',
  ]
}

export function getTopRecommendation(
  project: ProjectRow,
  lang: 'de' | 'en',
): string | null {
  const state = project.state as ProjectStateForDashboard | null
  const recs = state?.recommendations
  if (!recs || recs.length === 0) return null
  const top = recs.find((r) => r.rank === 1) ?? recs[0]
  if (!top) return null
  const text = lang === 'en' ? top.title_en : top.title_de
  if (!text) return null
  if (text.length <= 80) return text
  return text.slice(0, 80).trimEnd() + '…'
}

export interface IntelCounts {
  total: number
  ongoing: number
  awaiting: number
  designer: number
  paused: number
  lastActivity: string | null
}

export function intelCounts(projects: ProjectRow[]): IntelCounts {
  let ongoing = 0
  let awaiting = 0
  let designer = 0
  let paused = 0
  let lastActivity: string | null = null

  for (const p of projects) {
    if (!lastActivity || p.updated_at > lastActivity) {
      lastActivity = p.updated_at
    }
    const display = deriveStatus(p)
    if (display === 'active') ongoing++
    else if (display === 'awaiting') {
      ongoing++
      awaiting++
    } else if (display === 'designer') {
      ongoing++
      designer++
    } else if (display === 'paused') paused++
  }

  return {
    total: projects.length,
    ongoing,
    awaiting,
    designer,
    paused,
    lastActivity,
  }
}
