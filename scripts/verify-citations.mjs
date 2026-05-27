#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// v1.0.35 — Build-time citation verifier (FEDERAL tier).
//
// Checks every FEDERAL § citation in src/legal/ against the official
// §→Überschrift snapshot in scripts/legal-corpus/federal.json (sourced
// from gesetze-im-internet.de). Two checks:
//
//   1. EXISTENCE  — every cited federal § must exist in the official
//                   law. Catches fabricated / wrong-number §§ (the
//                   "Art. 58a" class, now in federal law).
//   2. ROLE       — conflict rules re-derive role-mismatches where a §
//                   exists but the repo attaches the wrong meaning
//                   (the "GEG § 8 = Wärmeschutznachweis" class — § 8 GEG
//                   is actually "Verantwortliche").
//
// STATE Bauordnungen (BauO NRW / HBO / LBO / NBauO) are out of scope:
// official state portals are not machine-fetchable (juris JS apps return
// no text; recht.nrw.de HTML truncates) — see
// docs/V1_0_35_CITATION_SOURCE_RECON.md §3b. State tier is a follow-up.
//
// Modes:
//   (default)  REPORT — prints the table + findings, ALWAYS exits 0.
//              Wired into prebuild this way so a known-but-unfixed finding
//              does not block builds during the "no fixes" sprint.
//   --strict   exits 1 if any finding. Flip the prebuild to this once the
//              found citations are corrected.
//
// Run: node scripts/verify-citations.mjs [--strict]
//      npm run verify:citations
// ───────────────────────────────────────────────────────────────────────

import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const LEGAL_DIR = join(REPO_ROOT, 'src', 'legal')
const STRICT = process.argv.includes('--strict')

const corpus = JSON.parse(
  await readFile(join(__dirname, 'legal-corpus', 'federal.json'), 'utf-8'),
)
const LAWS = ['BauGB', 'BauNVO', 'GEG']

// Conflict rules: a § that EXISTS but is cited for the wrong purpose.
// Each rule fires when a line cites the given law+§ AND matches `clashes`.
const ROLE_RULES = [
  {
    law: 'GEG',
    num: '8',
    clashes: /wärmeschutz|wärmenachweis|thermal[- ]?insulation/i,
    why: '§ 8 GEG is "Verantwortliche" (responsible parties), not the thermal-insulation certificate. The repo elsewhere uses GEG § 10 / § 80 for that.',
  },
]

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.name.endsWith('.ts')) out.push(p)
  }
  return out
}

// law-first ("BauGB § 30", "GEG §§ 8") and num-first ("§ 30 BauGB").
const RE_LAW_FIRST = /(BauGB|BauNVO|GEG)\s*§+\s*(\d+[a-z]?)/g
const RE_NUM_FIRST = /§+\s*(\d+[a-z]?)\s*(BauGB|BauNVO|GEG)/g

const citations = [] // { law, num, file, line, text }
for (const file of await walk(LEGAL_DIR)) {
  const rel = relative(REPO_ROOT, file)
  const lines = (await readFile(file, 'utf-8')).split('\n')
  lines.forEach((text, i) => {
    for (const m of text.matchAll(RE_LAW_FIRST))
      citations.push({ law: m[1], num: m[2], file: rel, line: i + 1, text: text.trim() })
    for (const m of text.matchAll(RE_NUM_FIRST))
      citations.push({ law: m[2], num: m[1], file: rel, line: i + 1, text: text.trim() })
  })
}

// Distinct cited §§.
const distinct = new Map()
for (const c of citations) distinct.set(`${c.law} § ${c.num}`, c)

const findings = []

// Check 1 — existence.
for (const [key, c] of distinct) {
  const heading = corpus[c.law]?.[c.num]
  if (!heading)
    findings.push({
      kind: 'EXISTENCE',
      key,
      msg: `not found in official ${c.law} (gesetze-im-internet.de snapshot) — fabricated, wrong number, or corpus needs refresh`,
      at: `${c.file}:${c.line}`,
    })
}

// Check 2 — role conflicts.
for (const rule of ROLE_RULES) {
  for (const c of citations) {
    if (c.law === rule.law && c.num === rule.num && rule.clashes.test(c.text))
      findings.push({
        kind: 'ROLE',
        key: `${rule.law} § ${rule.num}`,
        msg: `${rule.why} Official heading: "${corpus[rule.law]?.[rule.num]}". Repo line treats it otherwise.`,
        at: `${c.file}:${c.line}`,
      })
  }
}

// ── Report ──
console.log('[verify:citations] FEDERAL tier — official source: gesetze-im-internet.de\n')
const lawCounts = LAWS.map(
  (l) => `${l} ${[...distinct.keys()].filter((k) => k.startsWith(l + ' ')).length}`,
).join(' · ')
console.log(`Cited federal §§ scanned: ${distinct.size}  (${lawCounts})`)
console.log('Official headings (snapshot):')
for (const law of LAWS)
  for (const num of Object.keys(corpus[law] ?? {})) {
    const cited = distinct.has(`${law} § ${num}`)
    if (cited) console.log(`  ${law} § ${num} — ${corpus[law][num]}`)
  }

if (findings.length === 0) {
  console.log('\n[verify:citations] OK — every cited federal § resolves to the official law; no role conflicts.')
  process.exit(0)
}

console.log(`\n⚠ ${findings.length} finding(s):`)
for (const f of findings) console.log(`  ✗ [${f.kind}] ${f.key} — ${f.msg}\n       at ${f.at}`)

if (STRICT) {
  console.log('\n[verify:citations] FAIL (--strict) — fix the citations above.')
  process.exit(1)
}
console.log(
  '\n[verify:citations] REPORT MODE — findings logged, build NOT blocked (v1.0.35 "no fixes" sprint).' +
    '\n   Flip prebuild to `--strict` once these are corrected. State-§ tier pending (see V1_0_35_CITATION_SOURCE_RECON.md).',
)
process.exit(0)
