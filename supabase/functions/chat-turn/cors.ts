// CORS headers for chat-turn.
//
// Origin is reflected from a fixed allowlist (vercel + localhost). Any
// other Origin falls back to the production URL — which means a browser
// from an unknown origin gets a non-matching Access-Control-Allow-Origin
// and the request is blocked client-side, while still receiving a clean
// JSON error envelope (the platform also gates via verify_jwt). Vary:
// Origin is set so caches don't pollute across origins.

const ALLOWED_ORIGINS = new Set<string>([
  'https://planning-matrix.vercel.app',
  'http://localhost:5173',
])

const FALLBACK_ORIGIN = 'https://planning-matrix.vercel.app'

const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type'
const ALLOW_METHODS = 'POST, OPTIONS'

export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : FALLBACK_ORIGIN
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    'Access-Control-Allow-Methods': ALLOW_METHODS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
