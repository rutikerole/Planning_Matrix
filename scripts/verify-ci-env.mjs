// audit:ci-env — fix/ci-build drift guard.
//
// FAILURE CLASS this pins: a prebuild gate or spec contract depends on
// env that exists locally (.env.local) and on Vercel but NOT in the CI
// workflow — so local builds stay green while CI rots silently. That is
// exactly how verify:legal-config (added 2026-05-08) kept the Actions
// "Smoke tests" Build step red for five weeks (runs #51-#210) with zero
// spec coverage, and how the stub.supabase.co URL silently broke every
// auth-seeded spec (storage key sb-stub- vs the seeded sb-localhost-).
//
// Checks (static, instant, runs in prebuild so it fails on the DEV
// machine where people actually look):
//   1. test.yml's Build step env sets SKIP_LEGAL_CONFIG_CHECK=1 (or
//      provides every VITE_LEGAL_* key verify-legal-config requires).
//   2. test.yml's Build step VITE_SUPABASE_URL hostname starts with
//      'localhost' so supabase-js v2's derived storage key matches the
//      'sb-localhost-auth-token' seed in tests/smoke/helpers/auth.ts.
//   3. The helper actually seeds that key (catches a rename on either
//      side of the contract).
//
// Run: npm run audit:ci-env

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

const failures = []

const workflow = read('.github/workflows/test.yml')

// Isolate the Build step block (from "name: Build" to the next "- name:").
const buildMatch = workflow.match(/- name: Build\n([\s\S]*?)(?=\n\s*- name:)/)
if (!buildMatch) {
  failures.push('.github/workflows/test.yml — could not locate the "Build" step')
} else {
  const build = buildMatch[1]

  // 1 — legal-config gate must be bypassed or fully fed.
  const hasSkip = /SKIP_LEGAL_CONFIG_CHECK:\s*'?1'?/.test(build)
  const legalSrc = read('scripts/verify-legal-config.mjs')
  const requiredLegal = [...legalSrc.matchAll(/'(VITE_LEGAL_[A-Z_]+)'/g)].map((m) => m[1])
  const allLegalProvided =
    requiredLegal.length > 0 && requiredLegal.every((k) => build.includes(k))
  if (!hasSkip && !allLegalProvided) {
    failures.push(
      'test.yml Build step: verify:legal-config will fail — set SKIP_LEGAL_CONFIG_CHECK: \'1\' ' +
        `(or provide all ${requiredLegal.length} VITE_LEGAL_* vars). This exact gap kept CI red for 5 weeks.`,
    )
  }

  // 2 — storage-key contract: build URL hostname must be localhost.
  const urlMatch = build.match(/VITE_SUPABASE_URL:\s*'([^']+)'/)
  if (!urlMatch) {
    failures.push('test.yml Build step: VITE_SUPABASE_URL is not set')
  } else {
    const host = new URL(urlMatch[1]).hostname
    const ref = host.split('.')[0]
    if (ref !== 'localhost') {
      failures.push(
        `test.yml Build step: VITE_SUPABASE_URL host '${host}' → storage key sb-${ref}-auth-token, ` +
          "but specs seed sb-localhost-auth-token (tests/smoke/helpers/auth.ts) — every auth-gated spec would run logged-out.",
      )
    }
  }
  if (!/VITE_SUPABASE_ANON_KEY:/.test(build)) {
    failures.push('test.yml Build step: VITE_SUPABASE_ANON_KEY is not set')
  }
}

// 3 — the shared helper must still seed the key the contract names.
const helper = read('tests/smoke/helpers/auth.ts')
if (!helper.includes("'sb-localhost-auth-token'")) {
  failures.push(
    "tests/smoke/helpers/auth.ts no longer seeds 'sb-localhost-auth-token' — update this guard AND test.yml's VITE_SUPABASE_URL together.",
  )
}

if (failures.length > 0) {
  console.error(`[audit:ci-env] FAIL — ${failures.length} CI env-contract violation(s):`)
  for (const f of failures) console.error('  • ' + f)
  process.exit(1)
}
console.log(
  '[audit:ci-env] OK — CI Build env satisfies the legal-config bypass + the sb-localhost storage-key contract.',
)
