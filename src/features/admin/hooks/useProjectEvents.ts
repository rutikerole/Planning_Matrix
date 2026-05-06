import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface EventLogRow {
  event_id: string
  session_id: string
  user_id: string | null
  project_id: string | null
  source: string
  name: string
  attributes: Record<string, unknown>
  client_ts: string
  server_ts: string
  user_agent: string | null
  viewport_w: number | null
  viewport_h: number | null
  url_path: string | null
  trace_id: string | null
}

export interface UseProjectEventsOpts {
  source?: string | 'all'
  /** Substring match against the `name` column; case-insensitive. */
  namePattern?: string
  /** Window size in milliseconds (e.g. 60*60*1000 = last hour). */
  windowMs?: number
}

const DEFAULT_LIMIT = 500

/**
 * Phase 9.2 — fetch event_log rows for one project, sorted newest
 * first. Used by the inline logs drawer's Events tab.
 *
 * Server-side filters compose into the supabase-js builder so we
 * never fetch 50k rows just to client-filter down. Filters are kept
 * coarse (one source, one substring, one time window) — anything
 * more sophisticated should pivot to the Search page (admin/logs/
 * search) which already has the Datadog-syntax parser.
 */
export function useProjectEvents(
  projectId: string | undefined,
  opts: UseProjectEventsOpts = {},
) {
  const { source = 'all', namePattern, windowMs } = opts
  return useQuery<EventLogRow[]>({
    enabled: !!projectId,
    queryKey: ['admin', 'project-events', projectId, source, namePattern, windowMs],
    queryFn: async () => {
      let q = supabase
        .from('event_log')
        .select('*')
        .eq('project_id', projectId!)
        .order('server_ts', { ascending: false })
        .limit(DEFAULT_LIMIT)

      if (source !== 'all') q = q.eq('source', source)
      if (namePattern) q = q.ilike('name', `%${namePattern}%`)
      if (windowMs && windowMs > 0) {
        const since = new Date(Date.now() - windowMs).toISOString()
        q = q.gte('server_ts', since)
      }

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as EventLogRow[]
    },
    staleTime: 15_000,
  })
}
