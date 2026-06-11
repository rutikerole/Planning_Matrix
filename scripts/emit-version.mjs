// ───────────────────────────────────────────────────────────────────────
// Stale-deploy sprint (2026-06-11 incident) — build fingerprint emitter.
//
// Runs as the last step of `npm run build` and writes dist/version.json
// with the git SHA the build was produced from. scripts/verify-deploy.mjs
// fetches this file from prod and asserts live SHA == expected SHA — the
// gate that turns "Vercel silently serves yesterday's deployment" from
// invisible into a loud red within minutes of every push.
//
// SHA source order:
//   1. VERCEL_GIT_COMMIT_SHA — set by Vercel's build environment
//   2. `git rev-parse HEAD`  — local builds
//
// The file lands in dist/ AFTER vite build (it is not a hashed asset on
// purpose: a stable URL is the point). vercel.json's SPA rewrite excludes
// paths with a file extension, so /version.json serves the static file.
// ───────────────────────────────────────────────────────────────────────

import { execSync } from 'node:child_process'
import fs from 'node:fs'

function resolveSha() {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA
  if (fromVercel && /^[0-9a-f]{7,40}$/i.test(fromVercel)) return fromVercel
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

const sha = resolveSha()
if (!sha) {
  console.error('[emit:version] FAIL — no VERCEL_GIT_COMMIT_SHA and git rev-parse failed')
  process.exit(1)
}

if (!fs.existsSync('dist')) {
  console.error('[emit:version] FAIL — dist/ missing; run after `vite build`')
  process.exit(1)
}

const payload = {
  sha,
  ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  builtAt: new Date().toISOString(),
}
fs.writeFileSync('dist/version.json', `${JSON.stringify(payload, null, 2)}\n`)
console.log(`[emit:version] OK — dist/version.json → ${sha.slice(0, 7)}`)
