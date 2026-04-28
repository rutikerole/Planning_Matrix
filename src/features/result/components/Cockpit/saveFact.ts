// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — saveFact helper for the cockpit's edit-in-place
//
// When the user edits a CLIENT-source fact value via EditableCell, we
// persist directly: replace the fact in projects.state, write an audit
// event, mirror into the TanStack cache. Chat-turn isn't called — the
// model picks up the change on the next user turn naturally.
// ───────────────────────────────────────────────────────────────────────

import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectRow } from '@/types/db'
import type { Fact, ProjectState } from '@/types/projectState'

interface SaveArgs {
  queryClient: QueryClient
  projectId: string
  factKey: string
  nextValue: string
}

export async function saveFactValue({
  queryClient,
  projectId,
  factKey,
  nextValue,
}: SaveArgs): Promise<void> {
  const project = queryClient.getQueryData<ProjectRow>(['project', projectId])
  if (!project) return

  const state = (project.state ?? {}) as Partial<ProjectState>
  const facts: Fact[] = [...(state.facts ?? [])]
  const idx = facts.findIndex((f) => f.key === factKey)
  if (idx < 0) return

  const previous = facts[idx]
  facts[idx] = {
    ...previous,
    value: nextValue,
    qualifier: {
      source: 'CLIENT',
      quality: 'DECIDED',
      setAt: new Date().toISOString(),
      setBy: 'user',
      reason: 'Manuelle Korrektur über Cockpit',
    },
  }

  const nextState = { ...state, facts }

  const { error } = await supabase
    .from('projects')
    .update({ state: nextState })
    .eq('id', projectId)

  if (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[saveFact] persist failed:', error.message)
    }
    throw error
  }

  // Append an audit event so the change is visible in the Audit tab.
  await supabase.from('project_events').insert({
    project_id: projectId,
    triggered_by: 'user',
    event_type: 'fact_corrected_by_owner',
    reason: `${factKey} → ${nextValue}`,
  })

  queryClient.setQueryData<ProjectRow>(['project', projectId], (old) =>
    old ? { ...old, state: nextState as ProjectRow['state'] } : old,
  )
  // Refresh events so the Audit tab picks up the new row. The hook
  // includes `limit` in its key, so a prefix invalidation hits all
  // variants.
  queryClient.invalidateQueries({
    queryKey: ['project-events', projectId],
    exact: false,
  })
}

