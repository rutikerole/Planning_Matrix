import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TraceRow, TraceStatus } from '@/types/observability'

export interface LiveStreamFilters {
  status: 'all' | TraceStatus
  kind: 'all' | 'chat_turn_streaming' | 'chat_turn_json' | 'chat_turn_priming'
  windowMinutes: 5 | 15 | 60 | 1440
  errorsOnly: boolean
}

export const DEFAULT_FILTERS: LiveStreamFilters = {
  status: 'all',
  kind: 'all',
  windowMinutes: 60,
  errorsOnly: false,
}

const POLL_INTERVAL_MS = 5_000

/**
 * Phase 9 — polled Live Stream of recent traces.
 *
 * Polling not realtime per PHASE_9_FINDINGS §3.5 — Supabase's docs
 * explicitly recommend polling for low-volume admin feeds. 5-second
 * cadence with tab-visibility gating: when the tab is hidden, the
 * query loop pauses (we're talking to the DB, no point burning RPC
 * if nobody's looking).
 */
export function useLiveStream(filters: LiveStreamFilters) {
  const [tabVisible, setTabVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true,
  )

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onChange = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return useQuery<TraceRow[]>({
    queryKey: ['admin', 'live-stream', filters],
    queryFn: async () => {
      const since = new Date(Date.now() - filters.windowMinutes * 60_000).toISOString()
      let q = supabase
        .schema('logs')
        .from('traces')
        .select('*')
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(200)

      if (filters.status !== 'all') q = q.eq('status', filters.status)
      if (filters.kind !== 'all') q = q.eq('kind', filters.kind)
      if (filters.errorsOnly) q = q.in('status', ['error', 'partial'])

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as TraceRow[]
    },
    refetchInterval: tabVisible ? POLL_INTERVAL_MS : false,
    staleTime: 1_000,
  })
}
