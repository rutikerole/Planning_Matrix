// ───────────────────────────────────────────────────────────────────────
// Phase 6.5 — data freshness check.
//
// Walks every JSON file under data/, recursively collects every URL
// (any string value matching `^https?://`), deduplicates, fetches
// each URL with a 30 s timeout + 3 exponential-backoff retries on
// 5xx / network errors, computes a SHA-256 fingerprint of the
// normalised body, and compares against the prior snapshot at
// .github/freshness-snapshots/<sha-of-url>.json.
//
// Output:
//   [CHANGED|UNCHANGED|UNREACHABLE] <url>     (one per URL)
//   Checked N URLs. Changed: X. Unreachable: Y. Unchanged: Z.
//
// Exit codes (priority CHANGED > UNREACHABLE > 0):
//   0 → no drift, no failures
//   1 → at least one URL changed (workflow opens drift issue)
//   2 → at least one URL persistently unreachable (workflow opens
//       unreachable issue)
//
// Flags:
//   --report-only    do checks but DO NOT write snapshot files
//                    (developer mode for spot-checks without commits)
//
// Constraints honoured:
//   • Rate limit: 1 request per second across all URLs
//   • User-Agent identifies us, links to the repo
//   • No npm dependencies — Node 20+ built-ins only (fetch, crypto,
//     fs, path, timers/promises)
//   • A previously-tracked URL that becomes unreachable does NOT
//     overwrite its snapshot (we keep the last-known-good fingerprint)
//   • A first-time URL with no prior snapshot is treated as UNCHANGED
//     for drift purposes (no baseline → can't have drifted) and the
//     baseline is established
// ───────────────────────────────────────────────────────────────────────

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '..')
const DATA_DIR = join(ROOT, 'data')
const SNAPSHOT_DIR = join(ROOT, '.github', 'freshness-snapshots')
const USER_AGENT =
  'Planning-Matrix-Freshness-Check/1.0 (+https://github.com/rutikerole/planning-matrix)'
const FETCH_TIMEOUT_MS = 30_000
const RATE_LIMIT_MS = 1_000
const MAX_HISTORY = 12

const reportOnly = process.argv.slice(2).includes('--report-only')

// ─── Walk and collect URLs ──────────────────────────────────────────────

function walkJson(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walkJson(p))
    else if (extname(p) === '.json') out.push(p)
  }
  return out
}

function collectUrls(value, acc) {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) acc.add(value.trim())
  } else if (Array.isArray(value)) {
    for (const v of value) collectUrls(v, acc)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectUrls(v, acc)
  }
}

const allUrls = new Set()
for (const f of walkJson(DATA_DIR)) {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(f, 'utf8'))
  } catch (err) {
    console.error(`[freshness] skipping unparseable ${f}: ${err.message}`)
    continue
  }
  collectUrls(parsed, allUrls)
}
const urls = [...allUrls].sort()

// ─── Snapshot helpers ───────────────────────────────────────────────────

function urlKey(url) {
  return createHash('sha256').update(url).digest('hex').slice(0, 16)
}

function snapshotPath(url) {
  return join(SNAPSHOT_DIR, `${urlKey(url)}.json`)
}

function readSnapshot(url) {
  const p = snapshotPath(url)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function writeSnapshot(url, snap) {
  if (reportOnly) return
  if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, { recursive: true })
  writeFileSync(snapshotPath(url), JSON.stringify(snap, null, 2) + '\n')
}

// ─── HTML normalisation + fingerprint ───────────────────────────────────

function normalise(body) {
  return body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function fingerprint(body) {
  return createHash('sha256').update(normalise(body)).digest('hex')
}

// ─── Fetch with timeout + retry ─────────────────────────────────────────

async function fetchOnce(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: ctrl.signal,
      redirect: 'follow',
    })
    const text = res.ok ? await res.text() : null
    return { ok: res.ok, status: res.status, body: text }
  } finally {
    clearTimeout(t)
  }
}

async function fetchWithRetry(url) {
  let lastErr = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetchOnce(url)
      if (r.ok) return r
      // 4xx: do not retry, this is a "permanent" failure
      if (r.status >= 400 && r.status < 500) return r
      // 5xx: retry
      lastErr = new Error(`HTTP ${r.status}`)
    } catch (err) {
      lastErr = err
    }
    if (attempt < 2) {
      await sleep(1_000 * 2 ** attempt) // 1s, 2s
    }
  }
  throw lastErr ?? new Error('fetch failed')
}

// ─── Main loop ──────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10)
const counts = { CHANGED: 0, UNCHANGED: 0, UNREACHABLE: 0 }
const reportLines = []

for (let i = 0; i < urls.length; i++) {
  const url = urls[i]
  const prev = readSnapshot(url)
  let status = 'UNREACHABLE'
  let fp = null

  try {
    const r = await fetchWithRetry(url)
    if (!r.ok) {
      // 4xx or persistent 5xx → unreachable
      status = 'UNREACHABLE'
    } else {
      fp = fingerprint(r.body ?? '')
      if (!prev) {
        // First-time URL — establish baseline, do NOT flag as drift
        status = 'UNCHANGED'
      } else if (prev.fingerprint === fp) {
        status = 'UNCHANGED'
      } else {
        status = 'CHANGED'
      }
    }
  } catch {
    status = 'UNREACHABLE'
  }

  // Persist snapshot only when we have a fingerprint. Unreachable
  // URLs that were previously tracked keep their last-known-good
  // snapshot untouched.
  if (fp !== null) {
    const history = [...(prev?.statusHistory ?? []), { status, date: today }].slice(
      -MAX_HISTORY,
    )
    writeSnapshot(url, {
      url,
      fingerprint: fp,
      lastChecked: today,
      lastChanged: status === 'CHANGED' ? today : (prev?.lastChanged ?? today),
      statusHistory: history,
    })
  }

  counts[status]++
  reportLines.push(`[${status.padEnd(11)}] ${url}`)

  // Rate limit between URLs (skip after the last one)
  if (i < urls.length - 1) await sleep(RATE_LIMIT_MS)
}

console.log(reportLines.join('\n'))
console.log('---')
console.log(
  `Checked ${urls.length} URLs. Changed: ${counts.CHANGED}. Unreachable: ${counts.UNREACHABLE}. Unchanged: ${counts.UNCHANGED}.`,
)

// Exit code precedence: CHANGED (1) > UNREACHABLE (2) > 0
if (counts.CHANGED > 0) process.exit(1)
if (counts.UNREACHABLE > 0) process.exit(2)
process.exit(0)
