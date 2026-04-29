// ───────────────────────────────────────────────────────────────────────
// Phase 4.1.9 — useProjectAttachments
//
// Single TanStack query keyed by projectId that returns ALL non-deleted
// project_files for the project. MessageAttachment consumes this hook
// and filters client-side by message_id, sharing the cache across every
// user-message bubble in the thread.
//
// Replaces the prior per-message `useQuery(['messageAttachments', id])`
// pattern which fired one network request per user-role message — 30+
// REST calls on every chat-workspace mount, each returning 404 from
// Supabase and storming the network panel.
// ───────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import { fetchProjectAttachments } from '@/lib/uploadApi'

export function useProjectAttachments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projectAttachments', projectId ?? ''],
    queryFn: () => fetchProjectAttachments(projectId ?? ''),
    enabled: Boolean(projectId),
    // Attachments don't churn after upload — 2 min staleTime is fine,
    // and the upload mutation invalidates this key explicitly via
    // useChatTurn's onSuccess path.
    staleTime: 120_000,
  })
}
