import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectStatus } from '@/types/db'

interface SetStatusInput {
  projectId: string
  status: ProjectStatus
}

/**
 * Phase 3.9 #93 — set a project's status row-level. Used by the mobile
 * swipe-reveal action sheet (Archivieren / Wiederherstellen) on the
 * dashboard. RLS enforces ownership; the SPA only flips `status` and
 * lets the trigger update `updated_at`.
 *
 * Optimistic: the dashboard list query is invalidated on success so
 * the row re-sorts under its new status pill.
 */
export function useSetProjectStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, status }: SetStatusInput) => {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId)
      if (error) throw error
      return { projectId, status }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects', 'list'] })
    },
  })
}
