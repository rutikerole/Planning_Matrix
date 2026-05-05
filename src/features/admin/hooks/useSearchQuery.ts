import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TraceRow } from '@/types/observability'
import { parseSearchQuery, type ParsedQuery } from '../lib/parseSearchQuery'

export interface SearchResult {
  parsed: ParsedQuery
  rows: TraceRow[]
}

/**
 * Phase 9 — search hook. Parses the query string and translates each
 * clause into a supabase-js builder call. Free text becomes an
 * .ilike on error_message (not a fuzzy join — keeps it cheap).
 */
export function useSearchQuery(query: string) {
  return useQuery<SearchResult>({
    enabled: query.trim().length > 0,
    queryKey: ['admin', 'search', query],
    queryFn: async () => {
      const parsed = parseSearchQuery(query)
      if (parsed.errors.length > 0) {
        throw new Error(parsed.errors.join('; '))
      }

      let q = supabase
        .schema('logs')
        .from('traces')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(200)

      for (const c of parsed.clauses) {
        if (c.op === 'eq') q = q.eq(c.column, c.value as never)
        else if (c.op === 'gt') q = q.gt(c.column, c.value as never)
        else if (c.op === 'lt') q = q.lt(c.column, c.value as never)
        else if (c.op === 'gte') q = q.gte(c.column, c.value as never)
        else if (c.op === 'lte') q = q.lte(c.column, c.value as never)
        else if (c.op === 'ilike') q = q.ilike(c.column, `%${c.value}%`)
      }

      if (parsed.freeText) {
        q = q.ilike('error_message', `%${parsed.freeText}%`)
      }

      const { data, error } = await q
      if (error) throw error
      return { parsed, rows: (data ?? []) as TraceRow[] }
    },
    staleTime: 30_000,
  })
}
