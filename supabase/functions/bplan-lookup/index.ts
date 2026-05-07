// ───────────────────────────────────────────────────────────────────────
// Phase 6a — bplan-lookup Edge Function
//
// Per-turn entrypoint for the map preview's B-Plan resolver. The flow:
//
//   1. CORS preflight + origin allowlist (mirrors chat-turn).
//   2. Bearer-token gate (platform verify_jwt has already run).
//   3. JSON body parsed against bplanLookupRequestSchema (Zod).
//      Coordinates must lie inside the München-ish bbox (47.5–48.5
//      lat, 11–12 lng) — out-of-bounds → 400.
//   4. Per-request Supabase client scoped to the caller via the
//      bearer token; auth.getUser() resolves the UID.
//   5. RPC check_bplan_lookup_rate_limit(user_id) — 30/min/user.
//      Failure → 429.
//   6. Call WMS GetFeatureInfo (wmsClient.ts) at the converted
//      EPSG:25832 coordinate.
//   7. Normalise the FeatureCollection → BplanLookupResult shape.
//   8. Return { ok: true, result }. Errors map to clean envelopes.
//
// The WMS endpoint URL is hidden behind this function so the SPA
// never sees it. When the Nutzungsvereinbarung lands (Phase 6b),
// only this file changes — the SPA contract stays the same.
// ───────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'zod'
import { buildCorsHeaders } from '../chat-turn/cors.ts'
import { callWmsGetFeatureInfo } from './wmsClient.ts'
import { normaliseFeatureCollection, type BplanLookupResult } from './normalize.ts'

// ─── Request validation ─────────────────────────────────────────────────
// Bbox bounds chosen to contain the entire Münchner Stadtgebiet plus
// a small margin. Out-of-bounds coordinates are rejected with 400 to
// preserve our polite-citizen ratio with the WMS endpoint — there's
// no point hammering it for addresses outside its data scope.

const bplanLookupRequestSchema = z
  .object({
    lat: z.number().min(47.5).max(48.5),
    lng: z.number().min(11.0).max(12.0),
  })
  .strict()

// ─── Response envelope ──────────────────────────────────────────────────

interface OkEnvelope {
  ok: true
  result: BplanLookupResult
  rateLimit: { currentCount: number; maxCount: number; resetAt: string }
}
interface ErrEnvelope {
  ok: false
  error: { code: string; message: string }
  requestId: string
}

// ─── Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID()
  const origin = req.headers.get('Origin')
  const corsHeaders = buildCorsHeaders(origin)
  const json = (body: OkEnvelope | ErrEnvelope, status: number): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  const errEnv = (code: string, message: string, status: number): Response =>
    json({ ok: false, error: { code, message }, requestId }, status)

  // ── CORS preflight ─────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errEnv('validation', 'POST required', 405)
  }

  // ── Auth ───────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return errEnv('unauthenticated', 'Missing bearer token', 401)
  }

  // ── Body ───────────────────────────────────────────────────────────
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return errEnv('validation', 'Invalid JSON body', 400)
  }
  const parsed = bplanLookupRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return errEnv('validation', parsed.error.message, 400)
  }
  const { lat, lng } = parsed.data

  // ── Env ────────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return errEnv('internal', 'Missing function env (SUPABASE_URL / SUPABASE_ANON_KEY).', 500)
  }

  // ── Supabase client (RLS-scoped to caller) ─────────────────────────
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return errEnv('unauthenticated', 'Invalid session', 401)
  }
  const userId = userData.user.id

  console.log(
    `[bplan-lookup] [${requestId}] user=${userId} lat=${lat.toFixed(4)} lng=${lng.toFixed(4)}`,
  )

  // ── Rate limit ─────────────────────────────────────────────────────
  const { data: rateRows, error: rateErr } = await supabase.rpc(
    'check_bplan_lookup_rate_limit',
    { p_user_id: userId, p_max_per_minute: 30 },
  )
  if (rateErr) {
    console.error(`[bplan-lookup] [${requestId}] rate-limit RPC failed:`, rateErr)
    return errEnv('internal', 'Rate-limit check failed', 500)
  }
  const rateRow = Array.isArray(rateRows) ? rateRows[0] : rateRows
  if (rateRow && !rateRow.allowed) {
    return json(
      {
        ok: false,
        error: {
          code: 'rate_limit_exceeded',
          message: `Too many lookups this minute (${rateRow.current_count}/${rateRow.max_count})`,
        },
        requestId,
      },
      429,
    )
  }

  // ── WMS call ───────────────────────────────────────────────────────
  const wms = await callWmsGetFeatureInfo(lat, lng)
  if (!wms.ok) {
    return json(
      {
        ok: true,
        result: { status: 'upstream_error', http_status: wms.status },
        rateLimit: {
          currentCount: rateRow?.current_count ?? 0,
          maxCount: rateRow?.max_count ?? 30,
          resetAt: rateRow?.reset_at ?? new Date(Date.now() + 60_000).toISOString(),
        },
      },
      200,
    )
  }

  // ── Normalise ──────────────────────────────────────────────────────
  const result = normaliseFeatureCollection(wms.body)
  console.log(
    `[bplan-lookup] [${requestId}] result=${result.status}${result.plan_number ? ` plan=${result.plan_number}` : ''}`,
  )

  return json(
    {
      ok: true,
      result,
      rateLimit: {
        currentCount: rateRow?.current_count ?? 0,
        maxCount: rateRow?.max_count ?? 30,
        resetAt: rateRow?.reset_at ?? new Date(Date.now() + 60_000).toISOString(),
      },
    },
    200,
  )
})
