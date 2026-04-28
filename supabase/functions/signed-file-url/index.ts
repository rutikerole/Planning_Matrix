// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — signed-file-url Edge Function
//
// The chat workspace renders attached files as chips. Click → opens the
// underlying file in a new tab. Storage bucket `project-files` is
// private so we can't return a public URL; instead we mint a short-lived
// signed URL after verifying the requester owns the project_files row.
//
// Authenticated. Caller must include Authorization: Bearer <jwt>.
// Service role is NOT used here — the user's JWT is forwarded so RLS
// stays the only enforcement boundary, mirroring chat-turn's pattern.
//
// Request:
//   POST /functions/v1/signed-file-url
//   Body: { "fileId": "<project_files.id>" }
//
// Response 200:
//   { "ok": true, "url": "<signed url with 1-hour expiry>" }
//
// Response 404 when the file row doesn't exist or RLS hides it.
// Response 401 when no auth header.
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

  // User-scoped client. Reads the file row through the user's JWT;
  // RLS hides it if the user doesn't own the parent project.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: row, error: rowErr } = await supabase
    .from('project_files')
    .select('storage_bucket, storage_path, file_name, file_type, status')
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
  if (row.status === 'deleted') {
    return jsonError(
      { code: 'not_found', message: 'File deleted' },
      404,
      corsHeaders,
    )
  }

  // Mint a 1-hour signed URL. The same user-scoped client drives the
  // signing call so storage RLS policies enforce ownership at the
  // path level even if a future bug bypasses the row check above.
  const { data: signed, error: signErr } = await supabase.storage
    .from(row.storage_bucket)
    .createSignedUrl(row.storage_path, 3600, {
      download: row.file_name,
    })

  if (signErr || !signed?.signedUrl) {
    return jsonError(
      { code: 'persistence_failed', message: signErr?.message ?? 'Sign failed' },
      500,
      corsHeaders,
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      url: signed.signedUrl,
      fileName: row.file_name,
      fileType: row.file_type,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Don't cache — every request mints a fresh signed URL.
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    },
  )
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
