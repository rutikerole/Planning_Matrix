// ───────────────────────────────────────────────────────────────────────
// Meta-sweep item 4 — chat-turn deploy fingerprint (shared walker).
//
// Mechanizes the "chat-turn bundle-grep (byte-identical check against
// main)" that previously existed only as prose in verify-deploy.mjs:
// walk the REAL import graph from chat-turn/index.ts (the same files the
// `supabase functions deploy` bundler ships, including the ../../../src
// legal/type modules), hash the sorted (path, content) pairs, and derive
// a short fingerprint. The generated deployFingerprint.ts travels INSIDE
// the bundle and is served by the function's GET health probe, so
// `verify:deploy` can compare live-vs-local exactly like the web rail's
// version.json.
// ───────────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, normalize, relative } from 'node:path'

export const ENTRYPOINT = 'supabase/functions/chat-turn/index.ts'
/** Generated file — excluded from its own hash (self-reference). */
export const FINGERPRINT_FILE =
  'supabase/functions/chat-turn/deployFingerprint.ts'

const IMPORT_RE = /(?:from|import)\s+['"]([^'"]+)['"]/g

/**
 * Walk relative imports from the entrypoint. Remote specifiers
 * (npm:/jsr:/https:) are resolved by the Deno runtime at deploy time and
 * pinned by deno.json — they are not part of the repo-tree identity.
 */
export function collectGraphFiles(repoRoot) {
  const seen = new Set()
  const queue = [normalize(ENTRYPOINT)]
  while (queue.length > 0) {
    const rel = queue.pop()
    if (seen.has(rel)) continue
    const abs = join(repoRoot, rel)
    if (!existsSync(abs)) continue
    seen.add(rel)
    const src = readFileSync(abs, 'utf-8')
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1]
      if (!spec.startsWith('.')) continue // npm:/jsr:/https:/bare
      const resolved = normalize(relative(repoRoot, join(dirname(abs), spec)))
      if (resolved === normalize(FINGERPRINT_FILE)) continue
      queue.push(resolved)
    }
  }
  return [...seen].sort()
}

/** sha256 over sorted (path \0 content) pairs → 12-hex fingerprint. */
export function computeEdgeFingerprint(repoRoot) {
  const files = collectGraphFiles(repoRoot)
  const h = createHash('sha256')
  for (const rel of files) {
    h.update(rel)
    h.update('\0')
    h.update(readFileSync(join(repoRoot, rel)))
    h.update('\0')
  }
  return { fingerprint: h.digest('hex').slice(0, 12), files }
}
