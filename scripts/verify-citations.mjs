#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// Phase A (Legal Spine) — Build-time citation verifier, FEDERAL + STATE tier.
//
// Checks every §/Art. citation in src/legal/ against the hand-curated,
// primary-source-verified corpus in scripts/legal-corpus/:
//   • federal.json            BauGB · BauNVO · GEG  (gesetze-im-internet.de)
//   • states/<code>.json      one Bauordnung per Bundesland (16)
//
// Three checks:
//   1. CORPUS INTEGRITY — every corpus file parses and matches the schema.
//   2. EXISTENCE        — every cited §/Art. exists in the corpus for its law.
//                         Catches fabricated / wrong-number citations (the
//                         "BayBO Art. 58a" class). THIS is the strict gate.
//   3. ROLE             — a citation that EXISTS but is used for the wrong
//                         purpose (the "GEG § 8 = Wärmeschutznachweis" class;
//                         § 8 GEG is "Verantwortliche"). Reported as a
//                         Phase-B repo-code backlog — NEVER blocks Phase A,
//                         because fixing repo code is out of Phase A (data)
//                         scope.
//
// UNVERIFIED-tier corpus entries (a real § number we could not source a
// heading for) resolve the citation (no EXISTENCE failure) but are listed so
// Rutik sees exactly which headings still need a source. See
// scripts/legal-corpus/_meta/unverified.json.
//
// Modes:
//   (default)  REPORT — prints the summary + findings, ALWAYS exits 0.
//              Wired into prebuild so a known finding never blocks a build.
//   --strict   exits 1 iff there is a CORPUS-INTEGRITY or EXISTENCE finding.
//              ROLE + UNVERIFIED are printed but do NOT fail. Phase-A done
//              criterion = `--strict` exits 0.
//
// Run: node scripts/verify-citations.mjs [--strict]
//      npm run verify:citations            (report)
//      npm run verify:citations:strict     (strict)
// ───────────────────────────────────────────────────────────────────────

import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const LEGAL_DIR = join(REPO_ROOT, 'src', 'legal')
const CORPUS_DIR = join(__dirname, 'legal-corpus')
const STATES_DIR = join(CORPUS_DIR, 'states')
const STRICT = process.argv.includes('--strict')

const integrityErrors = []

// ── Build the law registry: law_short → { marker, source, nums:Map<num,{heading,tier}> } ──
const registry = new Map() // law_short -> { marker, scope, nums }

function addLaw(lawShort, marker, scope, paragraphs) {
  const nums = new Map()
  for (const [num, entry] of Object.entries(paragraphs ?? {})) {
    nums.set(num, {
      heading: entry?.heading_de_official ?? null,
      tier: entry?.verification_tier ?? 'unverified',
    })
  }
  registry.set(lawShort, { marker, scope, nums })
}

// Federal: three laws inside federal.json.laws
try {
  const fed = JSON.parse(await readFile(join(CORPUS_DIR, 'federal.json'), 'utf-8'))
  for (const [lawShort, law] of Object.entries(fed.laws ?? {}))
    addLaw(lawShort, law.marker ?? '§', 'federal', law.paragraphs)
} catch (e) {
  integrityErrors.push(`federal.json — ${e.message}`)
}

// States: one law per file
let stateFiles = []
const stateMetas = [] // { file, lawShort, bundesland, lastAmendmentDate, dataCurrentAsOf }
try {
  stateFiles = (await readdir(STATES_DIR)).filter((f) => f.endsWith('.json'))
} catch (e) {
  integrityErrors.push(`states/ — ${e.message}`)
}
for (const f of stateFiles) {
  try {
    const st = JSON.parse(await readFile(join(STATES_DIR, f), 'utf-8'))
    const lawShort = st?._meta?.law_short
    if (!lawShort) {
      integrityErrors.push(`states/${f} — missing _meta.law_short`)
      continue
    }
    addLaw(lawShort, st._meta.marker ?? '§', `state:${st._meta.bundesland ?? f}`, st.paragraphs)
    stateMetas.push({
      file: f,
      lawShort,
      bundesland: st._meta.bundesland ?? f,
      lastAmendmentDate: st._meta.last_amendment_date ?? null,
      dataCurrentAsOf: st._meta.data_current_as_of ?? null,
    })
  } catch (e) {
    integrityErrors.push(`states/${f} — ${e.message}`)
  }
}

// ── Conflict (ROLE) rules — exist-but-wrong-purpose. Phase-B backlog. ──
const ROLE_RULES = [
  {
    law: 'GEG',
    num: '8',
    clashes: /wärmeschutz|wärmenachweis|thermal[- ]?insulation/i,
    why: '§ 8 GEG is "Verantwortliche" (responsible parties), not the Wärmeschutznachweis. Correct: GEG § 10 / § 80. → Phase B repo-code fix.',
  },
]

// ── Walk src/legal and collect citations ──
async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.name.endsWith('.ts')) out.push(p)
  }
  return out
}

// Law-short alternation, LONGEST FIRST so "LBO SH" wins over "LBO".
const lawShorts = [...registry.keys()].sort((a, b) => b.length - a.length)
const lawAlt = lawShorts.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
const NUM = '(\\d+[a-z]?)'
const MARK = '(?:§§?|Art\\.?)'
// law-first ("BauO NRW § 6", "BayBO Art. 58") and num-first ("§ 6 BauO NRW").
const RE_LAW_FIRST = new RegExp(`(${lawAlt})\\s*${MARK}\\s*${NUM}`, 'g')
const RE_NUM_FIRST = new RegExp(`${MARK}\\s*${NUM}\\s*(${lawAlt})`, 'g')

const citations = [] // { law, num, file, line, text }
if (lawShorts.length) {
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
}

const distinct = new Map() // "LAW § NUM" -> citation
for (const c of citations) distinct.set(`${c.law}|${c.num}`, c)

// ── Checks ──
const existence = []
const unverifiedCited = []
for (const [, c] of distinct) {
  const law = registry.get(c.law)
  if (!law) continue // law not in corpus scope (e.g. BayDSchG, HOAI) — not our check
  const entry = law.nums.get(c.num)
  if (!entry) {
    existence.push({ key: `${c.law} ${law.marker} ${c.num}`, at: `${c.file}:${c.line}`, scope: law.scope })
  } else if (entry.tier === 'unverified' || !entry.heading) {
    unverifiedCited.push({ key: `${c.law} ${law.marker} ${c.num}`, at: `${c.file}:${c.line}` })
  }
}

const role = []
for (const rule of ROLE_RULES) {
  const law = registry.get(rule.law)
  for (const c of citations)
    if (c.law === rule.law && c.num === rule.num && rule.clashes.test(c.text))
      role.push({ key: `${rule.law} § ${rule.num}`, why: rule.why, at: `${c.file}:${c.line}`, official: law?.nums.get(rule.num)?.heading })
}

// ── VERSION check (phase-c/legal-correctness) ──────────────────────────────
// Detect corpus data that has gone stale relative to a KNOWN amendment. A state
// declares two ISO dates in _meta: `last_amendment_date` (the most recent
// amendment we know exists) and `data_current_as_of` (the date through which our
// captured §§/headings are confirmed current). If our data predates a known
// amendment, the headings/§ numbers may be from an older version — exactly the
// "is this the current law?" risk the Thüringen audit raised. This is the gate
// that makes silent version-drift impossible: bump `last_amendment_date` when a
// new amendment lands and the check FAILS until someone re-verifies and bumps
// `data_current_as_of`.
//   • STALE (gates --strict): both dates present AND data_current_as_of < last_amendment_date.
//   • UNTRACKED (warn only): a state missing either field — version tracking not
//     yet wired for it (the 13 mirror-only states; roll out as they're re-verified).
const ONE_DAY = 86_400_000
const parseISO = (s) => {
  if (typeof s !== 'string') return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}
const today = new Date()
const versionStale = []
const versionUntracked = []
const versionAging = []
for (const sm of stateMetas) {
  const amended = parseISO(sm.lastAmendmentDate)
  const current = parseISO(sm.dataCurrentAsOf)
  if (!amended || !current) {
    versionUntracked.push(sm)
    continue
  }
  if (current.getTime() + ONE_DAY <= amended.getTime()) {
    versionStale.push({
      bundesland: sm.bundesland,
      lawShort: sm.lawShort,
      dataCurrentAsOf: sm.dataCurrentAsOf,
      lastAmendmentDate: sm.lastAmendmentDate,
    })
  } else if ((today.getTime() - amended.getTime()) / ONE_DAY > 730) {
    // data is current vs the last amendment we know of, but that amendment is
    // > 2 years old — soft nudge to re-check for a newer one (never fails).
    versionAging.push({ bundesland: sm.bundesland, lastAmendmentDate: sm.lastAmendmentDate })
  }
}

// ── Report ──
console.log('[verify:citations] FEDERAL + STATE tier — corpus: scripts/legal-corpus/\n')

// Per-law coverage summary
const fedLaws = [...registry].filter(([, v]) => v.scope === 'federal')
const stateLaws = [...registry].filter(([, v]) => v.scope.startsWith('state:'))
function tierBreakdown(law) {
  const t = { 'primary-source': 0, 'secondary-mirror': 0, unverified: 0 }
  for (const [, v] of law.nums) t[v.tier] = (t[v.tier] ?? 0) + 1
  return t
}
console.log(`Laws in corpus: ${registry.size}  (federal ${fedLaws.length} · state ${stateLaws.length})`)
console.log(`Distinct §/Art. cited in src/legal scanned: ${distinct.size}\n`)
console.log('State corpus coverage (verbatim headings captured · by tier):')
for (const [name, law] of stateLaws.sort((a, b) => a[0].localeCompare(b[0]))) {
  const t = tierBreakdown(law)
  console.log(
    `  ${name.padEnd(14)} ${String(law.nums.size).padStart(3)} §§  ` +
      `[primary ${t['primary-source']} · mirror ${t['secondary-mirror']} · unverified ${t.unverified}]`,
  )
}

// Strict gate: corpus must be sound (integrity) AND the repo's citations must
// all resolve correctly against it (existence + role). Existence + role findings
// are pre-existing REPO-CODE bugs the spine now catches — fixing them is Phase B;
// until then the prebuild stays on report mode (`verify:citations`, exits 0) and
// `--strict` reports them for the Phase B backlog.
const fail =
  integrityErrors.length > 0 ||
  existence.length > 0 ||
  role.length > 0 ||
  versionStale.length > 0

if (integrityErrors.length) {
  console.log(`\n⚠ ${integrityErrors.length} CORPUS-INTEGRITY error(s):`)
  for (const e of integrityErrors) console.log(`  ✗ ${e}`)
}
if (existence.length) {
  console.log(`\n⚠ ${existence.length} EXISTENCE finding(s) — cited §/Art. not in corpus (fabricated/wrong-number/corpus-gap):`)
  for (const f of existence) console.log(`  ✗ ${f.key} — not in corpus [${f.scope}]\n       at ${f.at}`)
}
if (unverifiedCited.length) {
  console.log(`\nℹ ${unverifiedCited.length} cited §/Art. resolve to an UNVERIFIED-tier corpus entry (heading still needs a source — see _meta/unverified.json):`)
  for (const f of unverifiedCited) console.log(`  • ${f.key}  at ${f.at}`)
}
if (role.length) {
  console.log(`\n⚠ ${role.length} ROLE finding(s) — cited §/Art. exists but is used for the wrong purpose (→ Phase B repo-code fix):`)
  for (const f of role) console.log(`  ✗ ${f.key} (official: "${f.official}") — ${f.why}\n       at ${f.at}`)
}

// VERSION findings (phase-c/legal-correctness)
console.log(
  `\nLaw-version currency: ${stateMetas.length - versionUntracked.length}/${stateMetas.length} states version-tracked ` +
    `· ${versionStale.length} stale · ${versionUntracked.length} untracked · ${versionAging.length} aging`,
)
if (versionStale.length) {
  console.log(`\n⚠ ${versionStale.length} VERSION-STALE finding(s) — corpus data predates a known amendment (re-verify §§ against the current law):`)
  for (const f of versionStale)
    console.log(`  ✗ ${f.bundesland} (${f.lawShort}) — data_current_as_of ${f.dataCurrentAsOf} < last_amendment ${f.lastAmendmentDate}`)
}
if (versionAging.length) {
  console.log(`\nℹ ${versionAging.length} state(s) current vs last known amendment, but that amendment is > 2 years old (re-check for a newer one):`)
  for (const f of versionAging) console.log(`  • ${f.bundesland} — last known amendment ${f.lastAmendmentDate}`)
}
if (versionUntracked.length) {
  console.log(`\nℹ ${versionUntracked.length} state(s) without version tracking (no last_amendment_date + data_current_as_of — wire as each is re-verified):`)
  console.log(`  • ${versionUntracked.map((s) => s.bundesland).join(', ')}`)
}

if (!fail) {
  console.log('\n[verify:citations] OK — every cited federal & state §/Art. resolves to the corpus; corpus integrity clean.')
  if (unverifiedCited.length || role.length)
    console.log('   (Unverified-tier headings + ROLE conflicts above are tracked, not blocking.)')
  process.exit(0)
}

if (STRICT) {
  console.log(
    `\n[verify:citations] FAIL (--strict) — ${integrityErrors.length} integrity · ${existence.length} existence · ${role.length} role · ${versionStale.length} version-stale finding(s).` +
      '\n   Corpus integrity + version-currency must be 0. Existence + role findings are Phase B repo-code fixes (see _meta/unverified.json). Prebuild stays on report mode until cleared.',
  )
  process.exit(1)
}
console.log('\n[verify:citations] REPORT MODE — findings logged, build NOT blocked. Run with --strict to gate.')
process.exit(0)
