// ───────────────────────────────────────────────────────────────────────
// verify:citation-drift — v1.0.33 C3 drift gate.
//
// Planning Matrix authors German § citations in several disjoint places with
// no link between them (Agent 3 audit). This gate locks down the highest-value
// invariant first: the canonical Bayern allowlist.
//
//   CHECK 1 — SINGLE SOURCE. The `BAYERN_ALLOWED_CITATIONS: readonly string[]`
//   array literal must be DEFINED exactly once (src/legal/bayernAllowedCitations
//   .ts). It was previously copied byte-for-byte into citationLint.ts; this
//   check fails the build if any copy is re-introduced.
//
//   CHECK 2 — PROMPT↔PDF AGREEMENT. Every Bayern-law citation the deterministic
//   PDF engine emits (the bare `citation:` fields in stateLocalization.ts that
//   name BayBO/BayDSchG) must be present in the canonical allowlist. Comparison
//   is order-independent (sorted tokens), so the legitimate format difference
//   ("BayBO Art. 57" in the pack vs "Art. 57 BayBO" in the list) is not flagged,
//   but a genuine drift (PDF cites an article the prompt allowlist never blessed,
//   or vice-versa after a one-sided edit) is.
//
// Read-only. No law is added or changed here; the gate only detects divergence.
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CANONICAL = 'src/legal/bayernAllowedCitations.ts'
const PDF_SOURCES = ['src/legal/stateLocalization.ts']
const LITERAL_RE = /BAYERN_ALLOWED_CITATIONS\s*:\s*readonly\s+string\[\]\s*=\s*\[/

const fail = (msg) => {
  console.error(`[verify:citation-drift] FAIL — ${msg}`)
  process.exit(1)
}

/** Sorted-token canonical key: order- and punctuation-independent. */
function normKey(s) {
  return s
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ')
}

/** Quoted string literals inside the canonical array (skips // comments). */
function readAllowlist() {
  const text = readFileSync(join(ROOT, CANONICAL), 'utf8')
  const start = text.indexOf('= [')
  const end = text.indexOf('] as const', start)
  if (start < 0 || end < 0) fail(`could not locate the array in ${CANONICAL}`)
  const body = text.slice(start, end)
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/** Recursively collect *.ts files under a dir, skipping node_modules/dist. */
function walk(dir) {
  const out = []
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue
    const rel = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(rel))
    else if (e.name.endsWith('.ts')) out.push(rel)
  }
  return out
}

// ── CHECK 1 — single source ──────────────────────────────────────────────
const definers = [...walk('src'), ...walk('supabase')].filter((f) =>
  LITERAL_RE.test(readFileSync(join(ROOT, f), 'utf8')),
)
if (definers.length !== 1 || relative(ROOT, join(ROOT, definers[0])) !== CANONICAL) {
  fail(
    `the BAYERN_ALLOWED_CITATIONS literal must be defined exactly once, in ` +
      `${CANONICAL}. Found ${definers.length}: ${definers.join(', ')}. ` +
      `Import it instead of re-declaring it.`,
  )
}

// ── CHECK 2 — PDF-engine Bayern citations ⊆ allowlist ────────────────────
const allowlist = readAllowlist()
const allowKeys = new Set(allowlist.map(normKey))

const orphans = []
let bayernPdfCitations = 0
for (const src of PDF_SOURCES) {
  const text = readFileSync(join(ROOT, src), 'utf8')
  // bare `citation:` fields only (procedure + structuralCert), Bayern-law only.
  for (const m of text.matchAll(/\bcitation:\s*'([^']*)'/g)) {
    const cite = m[1]
    if (!/BayBO|BayDSchG/.test(cite)) continue
    bayernPdfCitations++
    if (!allowKeys.has(normKey(cite))) orphans.push(`${src}: "${cite}"`)
  }
}
if (orphans.length > 0) {
  fail(
    `the PDF engine emits Bayern citations absent from the canonical ` +
      `allowlist (${CANONICAL}) — prompt↔PDF drift:\n  ` +
      orphans.join('\n  '),
  )
}

console.log(
  `[verify:citation-drift] OK — single source (${CANONICAL}, ${allowlist.length} ` +
    `tokens); ${bayernPdfCitations} Bayern PDF citations all in allowlist.`,
)
