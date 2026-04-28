// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — delete-file Edge Function
//
// Called when a user removes an attachment chip BEFORE sending. Removes
// the storage object first, then the project_files row. If the row is
// already linked to a sent message (message_id is not null), we refuse
// — sent attachments are part of the audit trail and shouldn't be
// silently nuked.
//
// Authenticated. Mirrors signed-file-url's pattern: forward the user's
// JWT through the SDK so RLS and storage policies stay the boundary.
//
// Request:
//   POST /functions/v1/delete-file
//   Body: { "fileId": "<project_files.id>" }
//
// Response 200:
//   { "ok": true }
//
// Response 404 when the file isn't found / RLS hides it.
// Response 409 when the file is already linked to a sent message.
// ───────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://planning-matrix.vercel.app',
  'https://planning-matrix.app',
]

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonError({ code: 'validation', message: 'POST required' }, 405, corsHeaders)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonError(
      { code: 'unauthenticated', message: 'Authorization header required' },
      401,
      corsHeaders,
    )
  }

  let body: { fileId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError({ code: 'validation', message: 'Invalid JSON' }, 400, corsHeaders)
  }
  const fileId = body.fileId
  if (!fileId || typeof fileId !== 'string') {
    return jsonError(
      { code: 'validation', message: 'fileId required' },
      400,
      corsHeaders,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return jsonError({ code: 'internal', message: 'Missing env' }, 500, corsHeaders)
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: row, error: rowErr } = await supabase
    .from('project_files')
    .select('storage_bucket, storage_path, message_id')
    .eq('id', fileId)
    .maybeSingle()

  if (rowErr) {
    return jsonError(
      { code: 'persistence_failed', message: rowErr.message },
      500,
      corsHeaders,
    )
  }
  if (!row) {
    return jsonError(
      { code: 'not_found', message: 'File not found' },
      404,
      corsHeaders,
    )
  }
  if (row.message_id) {
    return jsonError(
      {
        code: 'forbidden',
        message: 'File already attached to a sent message; cannot delete',
      },
      409,
      corsHeaders,
    )
  }

  // Storage object first — if this fails we don't drop the row, so a
  // retry can still complete. If the row is gone but the object isn't,
  // we have an orphan; the Phase 4 cleanup cron handles those.
  const { error: storErr } = await supabase.storage
    .from(row.storage_bucket)
    .remove([row.storage_path])

  if (storErr) {
    return jsonError(
      { code: 'persistence_failed', message: storErr.message },
      500,
      corsHeaders,
    )
  }

  const { error: delErr } = await supabase
    .from('project_files')
    .delete()
    .eq('id', fileId)

  if (delErr) {
    return jsonError(
      { code: 'persistence_failed', message: delErr.message },
      500,
      corsHeaders,
    )
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  })
})

function jsonError(
  error: { code: string; message: string },
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
