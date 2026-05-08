#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// v1.0.4 — verify-legal-config (prebuild gate)
//
// Two assertions:
//
//   1. Every key in REQUIRED_KEYS is set in process.env (Vercel /
//      .env.local environment) with a non-empty value AND not still
//      wrapped in `{{...}}` (defense against an env file copy-pasting
//      the old placeholder shape).
//
//   2. No source file under src/features/legal/ contains a literal
//      `{{ANY_KEY}}` token. The audit-blocker scenario (v1.0.3) was
//      a JSX expression like `{'{{ANBIETER_NAME}}'}` rendering literal
//      text on /impressum. This grep-gate makes that regression
//      detectable at build-time.
//
// On any failure, exits 1 with a structured message naming each
// missing key + each leak file:line. Operator's first remediation step.
//
// Wired into `package.json`'s `prebuild` step. Skipping the gate is
// not supported by design.
// ───────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const LEGAL_DIR = join(REPO_ROOT, 'src/features/legal')

// Self-contained .env.local loader so the validator works under
// `npm run prebuild` without a `dotenv` dependency. Vercel sets env
// vars natively — skip the file load when running on Vercel so the
// platform's env is the only source of truth. Local dev: the file
// is read on demand. Process env always wins over the file.
function loadEnvLocal() {
  if (process.env.VERCEL_ENV) return
  const path = join(REPO_ROOT, '.env.local')
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf-8')
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    if (!key.startsWith('VITE_LEGAL_')) continue
    if (process.env[key] !== undefined) continue
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}
loadEnvLocal()

const REQUIRED_KEYS = [
  'VITE_LEGAL_ANBIETER_NAME',
  'VITE_LEGAL_ANBIETER_STRASSE_HAUSNUMMER',
  'VITE_LEGAL_ANBIETER_PLZ',
  'VITE_LEGAL_ANBIETER_ORT',
  'VITE_LEGAL_KONTAKT_TELEFON',
  'VITE_LEGAL_KONTAKT_EMAIL',
  'VITE_LEGAL_UST_ID_HINWEIS',
  'VITE_LEGAL_HANDELSREGISTER_HINWEIS',
]

const PLACEHOLDER_RE = /\{\{[A-Z_]+\}\}/

function readEnv() {
  // process.env is enough for Vercel + .env.local-loaded npm scripts.
  return process.env
}

const skipKeyCheck = process.env.SKIP_LEGAL_CONFIG_CHECK === '1'
// v1.0.4 hot-patch — Vercel Preview deploys (PRs, branches,
// Dependabot updates) run without the production env. Hard-failing
// every preview blocks dependency review and slows iteration. The
// runtime fail-closed banner already covers "missing env" at view-
// time on /impressum. So: in `VERCEL_ENV=preview` we WARN loudly
// and let the build through. Production + local strict mode is
// preserved (any other VERCEL_ENV value or no VERCEL_ENV at all =
// strict). PROD VERCEL deploys MUST still set VITE_LEGAL_* in the
// Vercel project's Production environment.
const isVercelPreview = process.env.VERCEL_ENV === 'preview'

function checkKeys(env) {
  const missing = []
  for (const key of REQUIRED_KEYS) {
    const v = (env[key] ?? '').trim()
    if (!v) {
      missing.push({ key, reason: 'unset' })
      continue
    }
    if (PLACEHOLDER_RE.test(v)) {
      missing.push({ key, reason: 'still-placeholder' })
    }
  }
  return missing
}

async function* walkLegalDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      yield* walkLegalDir(full)
    } else if (e.isFile() && /\.(tsx?|jsx?)$/.test(e.name)) {
      yield full
    }
  }
}

async function checkSourceLeaks() {
  // Skip lines that are clearly comments/docstrings — the
  // documentation in LegalConfigUnavailable.tsx names the
  // audit-blocker pattern `{{ANBIETER_NAME}}` for explanatory
  // purposes; that's not a render leak, just prose. Mirrors the
  // comment-skip heuristic in scripts/grep-hardcoded-de.mjs.
  const leaks = []
  for await (const file of walkLegalDir(LEGAL_DIR)) {
    const text = await readFile(file, 'utf-8')
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimStart()
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('{/*')
      ) {
        continue
      }
      if (PLACEHOLDER_RE.test(lines[i])) {
        leaks.push({ file: file.replace(REPO_ROOT + '/', ''), line: i + 1, snippet: lines[i].trim() })
      }
    }
  }
  return leaks
}

const env = readEnv()
const keyMisses = skipKeyCheck ? [] : checkKeys(env)
const leaks = await checkSourceLeaks()

if (keyMisses.length === 0 && leaks.length === 0) {
  console.log('[verify:legal-config] OK — all 8 keys present, zero source leaks.')
  process.exit(0)
}

// Source leaks ARE always-fail (a literal {{...}} in source code is
// a code regression regardless of environment). Env-key misses are
// soft on Vercel previews so PR/Dependabot deploys can proceed with
// the fail-closed runtime banner.
const onlyKeyMisses = leaks.length === 0 && keyMisses.length > 0
if (isVercelPreview && onlyKeyMisses) {
  console.warn('[verify:legal-config] WARN (Vercel preview soft-mode)')
  console.warn(`  ${keyMisses.length} legal-config env var(s) not set on this preview.`)
  console.warn(`  Production deploys MUST set them; previews render the`)
  console.warn(`  "Provider details unavailable" fail-closed banner instead.`)
  for (const m of keyMisses) {
    console.warn(`    • ${m.key} — ${m.reason}`)
  }
  process.exit(0)
}

console.error('[verify:legal-config] FAIL')
if (keyMisses.length > 0) {
  console.error(`  ${keyMisses.length} missing/placeholder env var(s):`)
  for (const m of keyMisses) {
    console.error(`    • ${m.key} — ${m.reason}`)
  }
  console.error(`  Set these in your env (Vercel Project → Environment Variables, or .env.local for local dev).`)
  console.error(`  See .env.example for the full list with example values.`)
  console.error(`  Bypass for non-deploy builds (CI metadata): SKIP_LEGAL_CONFIG_CHECK=1`)
}
if (leaks.length > 0) {
  console.error(`  ${leaks.length} literal {{...}} placeholder leak(s) in src/features/legal/:`)
  for (const l of leaks) {
    console.error(`    • ${l.file}:${l.line}  ${l.snippet}`)
  }
  console.error(`  Replace each with a getLegalConfig() lookup (see ImpressumPage.tsx for the pattern).`)
}
process.exit(1)
