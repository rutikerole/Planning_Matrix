// Phase 7 — env loading + validation. Three secrets required:
//   • SUPABASE_URL                       — production Supabase project URL
//   • SUPABASE_SERVICE_ROLE_KEY          — Auth admin API (test-user create
//                                          / sign-in via password grant)
//   • EVAL_HARNESS_TEST_USER_PASSWORD    — fixed strong password for the
//                                          test user; rotate by re-creating
//                                          the user via service-role
//
// In CI, all three come from process.env (GitHub Secrets). Locally,
// .env.local is parsed inline (no `dotenv` dependency). .env.local
// MUST NOT be committed — see scripts/eval-harness/.env.local.example.

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EVAL_HARNESS_TEST_USER_PASSWORD',
]

// Test user identity — locked. Email uses the .test TLD per RFC 6761
// so it cannot collide with real customer emails.
export const EVAL_TEST_USER_EMAIL = 'eval-harness@planning-matrix.test'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '..', '..', '..')

function parseDotEnv(text) {
  const out = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const k = line.slice(0, eq).trim()
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

function loadDotEnvLocal() {
  const path = join(ROOT, '.env.local')
  if (!existsSync(path)) return {}
  return parseDotEnv(readFileSync(path, 'utf8'))
}

export function loadConfig() {
  const fileEnv = loadDotEnvLocal()
  // process.env beats .env.local — CI sets via secrets, local sets via file.
  const env = { ...fileEnv, ...process.env }

  const missing = REQUIRED.filter((k) => !env[k] || env[k].length === 0)
  if (missing.length > 0) {
    console.error('[eval] missing required env vars:')
    for (const k of missing) console.error(`  • ${k}`)
    console.error(
      '\nLocal: copy scripts/eval-harness/.env.local.example to .env.local and fill in.',
    )
    console.error(
      'CI:    set GitHub Secrets per scripts/eval-harness/README.md.',
    )
    process.exit(1)
  }

  return {
    SUPABASE_URL: env.SUPABASE_URL.replace(/\/$/, ''),
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    EVAL_HARNESS_TEST_USER_PASSWORD: env.EVAL_HARNESS_TEST_USER_PASSWORD,
  }
}
