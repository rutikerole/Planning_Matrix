// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #88 — Build-time bundle-size gate
//
// Runs as part of the `npm run build` post-step. Greps `dist/assets/`
// for the main entry chunk (matches `index-*.js`), measures its size,
// gzips in-memory, and fails if the gzipped size exceeds the
// MAX_GZIP_KB ceiling.
//
// Default ceiling is 300 KB — bumped from 250 in v3 to cover the
// Cmd+K palette + activity ticker + custom map overlay + site-plan
// SVG infrastructure landing across the dashboard/wizard rewrite.
// Aim is still to stay under 280 KB; 300 is the hard wall.
//
// To raise the ceiling intentionally: edit MAX_GZIP_KB below + commit
// with rationale in the commit message.
//
// CEILING LEDGER (intentional re-baselines only):
//   2026-06-11  300 → 320 KB  (fix/deploy-verify-and-gantt)
//     Cause: T-05 sprint (508d543) landed the index chunk at 299.4 KB gz
//     locally — 0.6 KB under the wall. Vercel inlines its own VITE_* env
//     values (analytics keys/DSNs absent from local .env.local), so the
//     prod build crossed the ceiling and FAILED SILENTLY: prod kept
//     serving the pre-sprint deployment (the 2026-06-11 stale-deploy
//     incident, project d255b219). 320 restores ~20 KB of headroom; the
//     real reduction is the registry-lite trim (SPRINT_PLAN follow-up,
//     ~50-70 KB) — no hasty trims under incident pressure.
// ───────────────────────────────────────────────────────────────────────

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const MAX_GZIP_KB = 320 // ceiling — intentional re-baselines logged in CEILING LEDGER above
const ASSETS_DIR = 'dist/assets'

if (!fs.existsSync(ASSETS_DIR)) {
  console.error(`[verify:bundle] ${ASSETS_DIR} missing — run \`npm run build\` first`)
  process.exit(1)
}

const files = fs.readdirSync(ASSETS_DIR)
const indexChunk = files.find(
  (f) => f.startsWith('index-') && f.endsWith('.js'),
)

if (!indexChunk) {
  console.error(
    `[verify:bundle] no index-*.js chunk in ${ASSETS_DIR} — build output unexpected`,
  )
  process.exit(1)
}

const fullPath = path.join(ASSETS_DIR, indexChunk)
const raw = fs.readFileSync(fullPath)
const gzipped = gzipSync(raw)
const rawKb = (raw.length / 1024).toFixed(1)
const gzipKb = (gzipped.length / 1024).toFixed(1)

if (gzipped.length / 1024 > MAX_GZIP_KB) {
  console.error(
    `[verify:bundle] FAIL — ${indexChunk} is ${gzipKb} KB gzipped (ceiling: ${MAX_GZIP_KB} KB)`,
  )
  console.error(
    `  Raw: ${rawKb} KB — investigate via \`npx vite-bundle-visualizer\`.`,
  )
  console.error(
    `  To raise the ceiling intentionally: edit MAX_GZIP_KB in scripts/verify-bundle-size.mjs.`,
  )
  process.exit(1)
}

console.log(
  `[verify:bundle] OK — ${indexChunk} ${rawKb} KB raw / ${gzipKb} KB gzipped (ceiling ${MAX_GZIP_KB} KB)`,
)
