// Phase 6a — typed contract for the bplan-lookup Edge Function.
//
// SHARED with supabase/functions/bplan-lookup/normalize.ts. If the
// Edge Function's BplanLookupResult shape changes, update both
// files in lockstep — there is no runtime contract enforcement
// across Deno (Edge) and Node (SPA + harness) boundaries.

export interface BplanLookupResult {
  /** Was a B-Plan found, none found, or did the upstream WMS error? */
  status: 'found' | 'no_plan_found' | 'upstream_error'
  /** Plan number (e.g. "117"). Present when status === 'found'. */
  plan_number?: string
  /** Human-readable name in German. Present when status === 'found'. */
  plan_name_de?: string
  /** ISO date the plan became legally binding (datum_rk). May be absent on older plans. */
  in_force_since?: string
  /** Direct PDF URL of the Planteil. Present when status === 'found'. */
  pdf_url_plan?: string
  /** Direct PDF URL of the Textteil. Present when status === 'found'. */
  pdf_url_text?: string
  /** WMS feature_id for traceability. Present when status === 'found'. */
  feature_id?: string
  /** Upstream HTTP status when status === 'upstream_error'. */
  http_status?: number
}

export interface BplanLookupEnvelope {
  ok: true
  result: BplanLookupResult
  rateLimit: {
    currentCount: number
    maxCount: number
    resetAt: string
  }
}

export interface BplanLookupErrorEnvelope {
  ok: false
  error: { code: string; message: string }
  requestId: string
}
