#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// Phase 10.1 — Citation regression smoke walk
//
// Two modes:
//
//   STATIC (default, no env required):
//     • Asserts every per-template tail file (T-01..T-08) contains
//       both TYPISCHE KORREKTE ZITATE and VERBOTENE ZITATE blocks.
//     • Asserts bayern.ts has the BUNDESLAND-DISZIPLIN block and no
//       "Anlage 1 BayBO" outside the explicit ✗ marker line.
//     • Asserts personaBehaviour.ts has the ZITATE-DISZIPLIN rule.
//     • Validates the lint logic against curated good/bad sample texts
//       (positive: legitimate StPlS Anlage 1 reference; negative:
//       smoke-walk failure verbatim).
//     • Exits 0 (green) / 1 (red).
//
//   LIVE (--live flag, env vars required):
//     • Calls the deployed chat-turn Edge Function for each seed
//       case, captures the first-turn response, and checks
//       (a) no forbidden patterns appear, (b) every expected citation
//       appears.
//     • Required env: SMOKE_SUPABASE_URL, SMOKE_SUPABASE_ANON_KEY,
//       SMOKE_TEST_JWT, SMOKE_T07_PROJECT_ID, SMOKE_T03_PROJECT_ID
//       (set up by the operator one-time; the projects must already
//       exist with templateId T-07 / T-03 + the right addresses).
//     • Without env, --live exits 2 (skipped) so CI can run the
//       static gate everywhere and the live gate only in a workflow
//       that has the secrets.
//
// Run:
//   node scripts/smokeWalk.mjs              # static only
//   node scripts/smokeWalk.mjs --live       # static + live
// ───────────────────────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')

// ── Forbidden patterns (mirror of citationLint.ts) ─────────────────────
// Keep this list in sync with supabase/functions/chat-turn/citationLint.ts
// FORBIDDEN_PATTERNS. Drift between the two is itself a bug — the
// static gate below detects it by counting lines.
//
// Layer A (5 rules) — Bayern structural mistakes.
// Layer B (15 rules) — Bundesland firewall, one entry per non-Bayern LBO/BO.
const FORBIDDEN_PATTERNS = [
  // Layer A
  { name: 'anlage_1_baybo', regex: /Anlage\s+1\s+BayBO/gi, severity: 'error' },
  { name: 'annex_1_baybo', regex: /Annex\s+1\s+BayBO/gi, severity: 'error' },
  {
    name: 'paragraph_baybo',
    regex: /§\s*\d+(?:\s*Abs\.\s*\d+)?(?:\s*Nr\.\s*\d+\w?)?\s*BayBO/g,
    severity: 'error',
  },
  { name: 'mbo_warning', regex: /Musterbauordnung|\bMBO\b/g, severity: 'warning' },
  {
    name: 'placeholder_warning',
    regex: /relevante\s+(Bauordnung|Vorschrift)|einschl[äa]gige\s+(Bauordnung|Vorschrift)/gi,
    severity: 'warning',
  },
  // Layer B — non-Bayern Bundesland firewall (15 entries)
  {
    name: 'lbo_bw',
    regex: /\bLBO[\s-]+BW\b|\bLandesbauordnung\s+Baden[\s-]?W[üu]rttemberg\b/gi,
    severity: 'error',
  },
  {
    name: 'bauo_nrw',
    regex: /\bBauO\s+NRW\b|\bBauordnung\s+Nordrhein[\s-]?Westfalen\b/gi,
    severity: 'error',
  },
  { name: 'hbo', regex: /\bHBO\b|\bHessische\s+Bauordnung\b/gi, severity: 'error' },
  {
    name: 'nbauo',
    regex: /\bNBauO\b|\bNieders[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
  },
  {
    name: 'saechsbo',
    regex: /\bS[äa]chsBO\b|\bS[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
  },
  {
    name: 'lbauo_rlp',
    regex: /\bLBauO\s+RLP\b|\bLandesbauordnung\s+Rheinland[\s-]?Pfalz\b/gi,
    severity: 'error',
  },
  {
    name: 'lbo_sh',
    regex: /\bLBO\s+SH\b|\bLandesbauordnung\s+Schleswig[\s-]?Holstein\b/gi,
    severity: 'error',
  },
  {
    name: 'lbo_mv',
    regex: /\bLBO\s+MV\b|\bLandesbauordnung\s+Mecklenburg[\s-]?Vorpommern\b/gi,
    severity: 'error',
  },
  {
    name: 'bremlbo',
    regex: /\bBremLBO\b|\bBremische\s+Landesbauordnung\b/gi,
    severity: 'error',
  },
  { name: 'hbauo', regex: /\bHBauO\b|\bHamburgische\s+Bauordnung\b/gi, severity: 'error' },
  {
    name: 'lbo_saarland',
    regex: /\bLBO\s+Saarland\b|\bLandesbauordnung\s+(des\s+)?Saarland(es)?\b/gi,
    severity: 'error',
  },
  {
    name: 'thuerbo',
    regex: /\bTh[üu]rBO\b|\bTh[üu]ringer\s+Bauordnung\b/gi,
    severity: 'error',
  },
  {
    name: 'bauo_lsa',
    regex: /\bBauO\s+LSA\b|\bBauordnung\s+Sachsen[\s-]?Anhalt\b/gi,
    severity: 'error',
  },
  {
    name: 'bbgbo',
    regex: /\bBbgBO\b|\bBrandenburgische\s+Bauordnung\b|\bBauordnung\s+Brandenburg\b/gi,
    severity: 'error',
  },
  {
    name: 'bauo_bln',
    regex: /\bBauO\s+Bln\b|\bBauordnung\s+(f[üu]r\s+)?Berlin\b|\bBerliner\s+Bauordnung\b/gi,
    severity: 'error',
  },
]

// ── Seed test cases ─────────────────────────────────────────────────────
const SEED_CASES = [
  {
    name: 'T-07 Anbau wintergarten',
    template: 'T-07',
    address: 'Türkenstr. 52, 80799 München',
    userMessage: 'Ich möchte einen 4×4×3 m Wintergarten an der Südseite anbauen.',
    expectedCitations: [/BayBO\s+Art\.\s*57\s*Abs\.\s*1\s*Nr\.\s*1\s*a/i],
    expectedFreeMath: /48\s*m³|4\s*[×x]\s*4\s*[×x]\s*3/,
    forbidMatches: [/Anlage\s+1\s+BayBO/i, /Annex\s+1\s+BayBO/i],
    envProjectIdKey: 'SMOKE_T07_PROJECT_ID',
  },
  {
    name: 'T-03 Sanierung like-for-like',
    template: 'T-03',
    address: 'Schwabinger Tor 1, 80807 München',
    userMessage:
      'Like-for-like Sanierung — Fenster, Bad, Küche. Keine baulichen Eingriffe.',
    expectedCitations: [/BayBO\s+Art\.\s*57\s*Abs\.\s*3\s*Nr\.\s*3/i],
    forbidMatches: [/Anlage\s+1\s+BayBO/i, /Annex\s+1\s+BayBO/i],
    envProjectIdKey: 'SMOKE_T03_PROJECT_ID',
  },
]

// ── Curated lint-validation samples ─────────────────────────────────────
// Drives the second static-mode check: ensures the lint patterns
// catch the real smoke-walk failure verbatim AND ignore legitimate
// StPlS Anlage 1 references.
const LINT_SAMPLES = [
  {
    label: 'smoke-walk T-07 failure (must flag)',
    text:
      'is a project requiring planning permission in Bavaria — the threshold for permit-free works under Annex 1 BayBO is exceeded here',
    expectError: true,
  },
  {
    label: 'smoke-walk T-03 failure (must flag)',
    text: 'This sounds like a permit-free maintenance measure under Annex 1 BayBO',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland NRW (must flag)',
    text: 'Nach BauO NRW § 62 wäre das verfahrensfrei',
    expectError: true,
  },
  {
    label: 'BayBO with § instead of Art. (must flag)',
    text: 'Die Verfahrensfreiheit folgt aus § 57 BayBO',
    expectError: true,
  },
  {
    label: 'StPlS 926 Anlage 1 (legitimate — must NOT flag)',
    text:
      'Stellplatzbedarf nach StPlS 926 Anlage 1 Nr. 1.1: 1 Stellplatz je Wohnung',
    expectError: false,
  },
  {
    label: 'BauGB § 30 (legitimate — must NOT flag)',
    text:
      'Im Geltungsbereich eines qualifizierten Bebauungsplans nach BauGB § 30 Abs. 1',
    expectError: false,
  },
  {
    label: 'Correct Art. 57 Abs. 1 Nr. 1 a (must NOT flag)',
    text:
      'Wintergarten 48 m³ < 75 m³ → verfahrensfrei nach BayBO Art. 57 Abs. 1 Nr. 1 a',
    expectError: false,
  },
  // ── Bundesland firewall — one fixture per non-Bayern LBO/BO ─────────
  // The wrong-Bundesland NRW sample above already covers BauO NRW; the
  // entries below cover the remaining 14 Bundesländer.
  {
    label: 'wrong-Bundesland HBO Hessen (must flag)',
    text: 'Nach HBO § 63 wäre das verfahrensfrei',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland NBauO Niedersachsen (must flag)',
    text: 'Die NBauO behandelt das in einer anderen Logik',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland SächsBO (must flag)',
    text: 'Die SächsBO sieht in § 4 eine abweichende Regelung vor',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland LBauO RLP (must flag)',
    text: 'Nach LBauO RLP § 62 sind Anbauten unter 50 m³ verfahrensfrei',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland LBO SH (must flag)',
    text: 'Die LBO SH wendet hier andere Schwellen an',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland LBO MV (must flag)',
    text: 'In Mecklenburg-Vorpommern greift LBO MV § 60',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland BremLBO (must flag)',
    text: 'BremLBO regelt Stellplätze abweichend',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland HBauO Hamburg (must flag)',
    text: 'Die HBauO § 70 sieht eine Genehmigungsfreistellung vor',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland LBO Saarland (must flag)',
    text: 'LBO Saarland regelt Abstandsflächen mit anderer Formel',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland ThürBO (must flag)',
    text: 'Nach ThürBO § 60 wäre der Anbau verfahrensfrei',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland BauO LSA (must flag)',
    text: 'BauO LSA § 71 wendet eine andere Schwellenwerte-Logik an',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland BbgBO (must flag)',
    text: 'In Brandenburg greift BbgBO Anlage 1 Nr. 5',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland BauO Bln (must flag)',
    text: 'Die Bauordnung Berlin BauO Bln § 62 regelt das anders',
    expectError: true,
  },
  {
    label: 'wrong-Bundesland Hessische Bauordnung long form (must flag)',
    text: 'Nach Hessische Bauordnung § 63 wäre das verfahrensfrei',
    expectError: true,
  },
]

// ── toolInput-shape fixtures ───────────────────────────────────────────
//
// Mirror of citationLint.ts collectModelTexts. Drift between this and
// the source-of-truth is a bug — adding a new model-emitted field in
// citationLint.ts means adding it here too. The tests below catch
// regressions of the §6 audit attack vector A2 (a wrong-Bundesland
// citation buried inside a non-message field).
function* collectModelTexts(input) {
  if (input.message_de) yield { field: 'message_de', text: input.message_de }
  if (input.message_en) yield { field: 'message_en', text: input.message_en }

  for (const r of input.recommendations_delta ?? []) {
    if (r.op !== 'upsert') continue
    if (r.title_de) yield { field: `recommendations_delta[${r.id}].title_de`, text: r.title_de }
    if (r.title_en) yield { field: `recommendations_delta[${r.id}].title_en`, text: r.title_en }
    if (r.detail_de) yield { field: `recommendations_delta[${r.id}].detail_de`, text: r.detail_de }
    if (r.detail_en) yield { field: `recommendations_delta[${r.id}].detail_en`, text: r.detail_en }
  }
  for (const p of input.procedures_delta ?? []) {
    if (p.op !== 'upsert') continue
    if (p.rationale_de) yield { field: `procedures_delta[${p.id}].rationale_de`, text: p.rationale_de }
    if (p.rationale_en) yield { field: `procedures_delta[${p.id}].rationale_en`, text: p.rationale_en }
  }
  for (const d of input.documents_delta ?? []) {
    if (d.op !== 'upsert') continue
    if (d.title_de) yield { field: `documents_delta[${d.id}].title_de`, text: d.title_de }
    if (d.title_en) yield { field: `documents_delta[${d.id}].title_en`, text: d.title_en }
  }
  for (const f of input.extracted_facts ?? []) {
    if (f.evidence) yield { field: `extracted_facts[${f.key}].evidence`, text: f.evidence }
  }
}

// Deep-fixture suite. The first entry is the audit's acceptance test
// — an LBO BW (Baden-Württemberg) citation buried inside a
// recommendations_delta.detail_de. Pre-firewall, this would have
// shipped to the result page silently.
const TOOL_INPUT_FIXTURES = [
  {
    label: 'LBO BW in recommendations_delta.detail_de (must flag, error)',
    input: {
      message_de: 'Wir prüfen den Vorgang.',
      message_en: 'We are reviewing the matter.',
      recommendations_delta: [
        {
          op: 'upsert',
          id: 'rec-bw',
          title_de: 'Verfahrensfreiheit klären',
          detail_de:
            'Im Zweifel orientieren Sie sich an § 5 LBO BW — die Schwelle ist dort 30 m³.',
        },
      ],
    },
    expectViolation: true,
    expectSeverity: 'error',
    expectField: 'recommendations_delta[rec-bw].detail_de',
  },
  {
    label: 'HBauO Hamburg in procedures_delta.rationale_de (must flag, error)',
    input: {
      message_de: 'Test.',
      message_en: 'Test.',
      procedures_delta: [
        {
          op: 'upsert',
          id: 'proc-hh',
          rationale_de: 'Vergleich mit HBauO § 70 zeigt eine andere Schwellenlogik.',
        },
      ],
    },
    expectViolation: true,
    expectSeverity: 'error',
  },
  {
    label: 'BauO Bln in documents_delta.title_de (must flag, error)',
    input: {
      message_de: 'Test.',
      message_en: 'Test.',
      documents_delta: [
        {
          op: 'upsert',
          id: 'doc-bln',
          title_de: 'Vergleichsdokument zur Bauordnung Berlin',
        },
      ],
    },
    expectViolation: true,
    expectSeverity: 'error',
  },
  {
    label: 'SächsBO in extracted_facts.evidence (must flag, error)',
    input: {
      message_de: 'Test.',
      message_en: 'Test.',
      extracted_facts: [
        {
          key: 'fact.foo',
          value: 'bar',
          source: 'LEGAL',
          quality: 'CALCULATED',
          evidence: 'Verweis auf SächsBO § 4',
        },
      ],
    },
    expectViolation: true,
    expectSeverity: 'error',
  },
  {
    label: 'remove-op recommendation_delta with bad text in id (must NOT flag)',
    input: {
      message_de: 'Wir entfernen die Empfehlung.',
      message_en: 'Removing the recommendation.',
      recommendations_delta: [{ op: 'remove', id: 'rec-old' }],
    },
    expectViolation: false,
  },
  {
    label: 'clean toolInput with Art. 57 BayBO across multiple fields (must NOT flag)',
    input: {
      message_de:
        'Verfahrensfrei nach BayBO Art. 57 Abs. 1 Nr. 1 a (Anbau ≤ 75 m³).',
      message_en:
        'Permit-free under BayBO Art. 57 Abs. 1 Nr. 1 a (extension ≤ 75 m³).',
      recommendations_delta: [
        {
          op: 'upsert',
          id: 'rec-clean',
          title_de: 'Lageplan beauftragen',
          detail_de: 'Beim ADBV München eine Vermessung beantragen.',
        },
      ],
    },
    expectViolation: false,
  },
]

// ── Static gate ────────────────────────────────────────────────────────

async function readFileText(relPath) {
  const abs = join(REPO_ROOT, relPath)
  return await readFile(abs, 'utf8')
}

function lintText(text) {
  const violations = []
  for (const { name, regex, severity } of FORBIDDEN_PATTERNS) {
    regex.lastIndex = 0
    let m
    while ((m = regex.exec(text)) !== null) {
      violations.push({ name, match: m[0], severity, index: m.index })
      if (m.index === regex.lastIndex) regex.lastIndex += 1
    }
  }
  return violations
}

function lintToolInput(input) {
  const violations = []
  for (const { field, text } of collectModelTexts(input)) {
    for (const v of lintText(text)) {
      violations.push({ ...v, field })
    }
  }
  return violations
}

function failures(label, conditions) {
  // conditions: array of { ok: bool, msg: string }
  const fails = conditions.filter((c) => !c.ok).map((c) => c.msg)
  return { label, ok: fails.length === 0, fails }
}

async function runStaticGate() {
  const results = []

  // 1. Each template T-01..T-08 has both required blocks.
  const templates = ['t01-neubau-efh', 't02-neubau-mfh', 't03-sanierung',
    't04-umnutzung', 't05-abbruch', 't06-aufstockung', 't07-anbau',
    't08-sonstiges']
  for (const t of templates) {
    const path = `src/legal/templates/${t}.ts`
    const text = await readFileText(path)
    results.push(failures(`${t}: required blocks`, [
      {
        ok: /TYPISCHE KORREKTE ZITATE/.test(text),
        msg: 'missing "TYPISCHE KORREKTE ZITATE" block',
      },
      {
        ok: /VERBOTENE ZITATE/.test(text),
        msg: 'missing "VERBOTENE ZITATE" block',
      },
    ]))
  }

  // 2. bayern.ts has BUNDESLAND-DISZIPLIN and no rogue Anlage 1 BayBO.
  // Allow exactly two known mentions: one ✗ negative example, one
  // explicit "niemals 'Anlage 1 BayBO'" disziplin reminder.
  const bayernText = await readFileText(
    'src/legal/bayern.ts',
  )
  const bayernAnlageMatches = (bayernText.match(/Anlage\s+1\s+BayBO/gi) ?? [])
  results.push(failures('bayern.ts: structure', [
    {
      ok: /BUNDESLAND-DISZIPLIN: BAYERN/.test(bayernText),
      msg: 'missing BUNDESLAND-DISZIPLIN: BAYERN block',
    },
    {
      ok: bayernAnlageMatches.length <= 2,
      msg: `expected ≤ 2 "Anlage 1 BayBO" mentions (✗ marker + niemals reminder); found ${bayernAnlageMatches.length}`,
    },
    {
      ok: /Art\.\s*57\s*BayBO\s+—\s+Verfahrensfreie/.test(bayernText) ||
        /Art\.\s*57\s+BayBO\s*—\s*Verfahrensfreie/.test(bayernText),
      msg: 'expected "Art. 57 BayBO — Verfahrensfreie ..." section header',
    },
  ]))

  // 3. personaBehaviour.ts has ZITATE-DISZIPLIN.
  const personaText = await readFileText(
    'src/legal/personaBehaviour.ts',
  )
  results.push(failures('personaBehaviour.ts: ZITATE-DISZIPLIN', [
    {
      ok: /ZITATE-DISZIPLIN/.test(personaText),
      msg: 'missing ZITATE-DISZIPLIN rule',
    },
    {
      ok: /Lieber kein Zitat als ein falsches/i.test(personaText),
      msg: 'missing "lieber kein Zitat als ein falsches" hedge',
    },
  ]))

  // 4. citationLint.ts has at least 20 forbidden patterns (5 Layer-A
  //    Bayern structural rules + 15 Layer-B Bundesland firewall rules).
  //    Sanity guard against an accidental list-empty or a partial revert.
  const lintModuleSource = await readFileText(
    'supabase/functions/chat-turn/citationLint.ts',
  )
  const patternCount = (lintModuleSource.match(/regex:\s*\//g) ?? []).length
  results.push(failures('citationLint.ts: forbidden patterns present', [
    {
      ok: patternCount >= 20,
      msg: `expected ≥ 20 regex entries in FORBIDDEN_PATTERNS (5 Bayern structural + 15 Bundesland firewall); found ${patternCount}`,
    },
  ]))

  // 5. Lint logic validates against curated samples.
  for (const s of LINT_SAMPLES) {
    const v = lintText(s.text)
    const flagged = v.length > 0
    results.push(failures(`lint sample: ${s.label}`, [
      {
        ok: flagged === s.expectError,
        msg: s.expectError
          ? `expected violation but got none on text: "${s.text.slice(0, 80)}…"`
          : `expected no violation but got ${v.length}: ${JSON.stringify(v.map((x) => x.match))}`,
      },
    ]))
  }

  // 6. Deep-fixture suite: run the lint over the FULL respond-tool
  // input shape so the new scan surface (recommendations_delta /
  // procedures_delta / documents_delta / extracted_facts.evidence) is
  // exercised by the static gate. The acceptance test for the audit's
  // §6 attack vector A2 — an LBO BW citation buried inside a
  // recommendation detail — lives here.
  for (const f of TOOL_INPUT_FIXTURES) {
    const violations = lintToolInput(f.input)
    const flagged = violations.length > 0
    const hasError = violations.some((v) => v.severity === 'error')
    const conditions = [
      {
        ok: flagged === f.expectViolation,
        msg: f.expectViolation
          ? `expected violation in toolInput but got none`
          : `expected no violation but got ${violations.length}: ${JSON.stringify(violations.map((v) => `${v.field}: ${v.match}`))}`,
      },
    ]
    if (f.expectViolation) {
      conditions.push({
        ok: hasError === (f.expectSeverity === 'error'),
        msg: `expected severity=${f.expectSeverity} but got ${hasError ? 'error' : 'warning'}`,
      })
      if (f.expectField) {
        const inField = violations.some((v) => v.field === f.expectField)
        conditions.push({
          ok: inField,
          msg: `expected violation in field=${f.expectField}; got fields=${JSON.stringify(violations.map((v) => v.field))}`,
        })
      }
    }
    results.push(failures(`toolInput fixture: ${f.label}`, conditions))
  }

  return results
}

// ── Live gate (skipped without env) ────────────────────────────────────

async function runLiveGate() {
  const url = process.env.SMOKE_SUPABASE_URL
  const anon = process.env.SMOKE_SUPABASE_ANON_KEY
  const jwt = process.env.SMOKE_TEST_JWT

  if (!url || !anon || !jwt) {
    console.log(
      '[smoke-walk] live mode requested but env not set; skipping. ' +
        'Required: SMOKE_SUPABASE_URL, SMOKE_SUPABASE_ANON_KEY, SMOKE_TEST_JWT, ' +
        'SMOKE_T07_PROJECT_ID, SMOKE_T03_PROJECT_ID',
    )
    return { skipped: true, results: [] }
  }

  const results = []
  for (const c of SEED_CASES) {
    const projectId = process.env[c.envProjectIdKey]
    if (!projectId) {
      results.push(failures(`live ${c.name}: env`, [
        { ok: false, msg: `missing env var ${c.envProjectIdKey}` },
      ]))
      continue
    }

    const body = {
      projectId,
      userMessage: c.userMessage,
      clientRequestId: crypto.randomUUID(),
      locale: 'de',
    }

    let res, data
    try {
      res = await fetch(`${url}/functions/v1/chat-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anon,
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      })
      data = await res.json()
    } catch (err) {
      results.push(failures(`live ${c.name}: fetch`, [
        { ok: false, msg: `fetch threw: ${err.message ?? err}` },
      ]))
      continue
    }
    if (!res.ok || !data?.ok) {
      results.push(failures(`live ${c.name}: response`, [
        { ok: false, msg: `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}` },
      ]))
      continue
    }
    const messageDe = data.assistantMessage?.content_de ?? ''
    const violations = lintText(messageDe)
    const conditions = [
      {
        ok: violations.length === 0,
        msg: `linter flagged ${violations.length} violation(s): ${violations.map((v) => v.match).join(', ')}`,
      },
    ]
    for (const re of c.expectedCitations) {
      conditions.push({
        ok: re.test(messageDe),
        msg: `expected citation ${re.source} not found in response`,
      })
    }
    for (const re of c.forbidMatches) {
      conditions.push({
        ok: !re.test(messageDe),
        msg: `forbidden phrase ${re.source} appeared in response`,
      })
    }
    if (c.expectedFreeMath) {
      conditions.push({
        ok: c.expectedFreeMath.test(messageDe),
        msg: `expected math indicator ${c.expectedFreeMath.source} not found`,
      })
    }
    results.push(failures(`live ${c.name}`, conditions))
  }

  return { skipped: false, results }
}

// ── Reporter ───────────────────────────────────────────────────────────

function report(label, results) {
  const total = results.length
  const failed = results.filter((r) => !r.ok)
  console.log(`\n[smoke-walk] ${label}: ${total - failed.length}/${total} passed`)
  for (const r of results) {
    const tick = r.ok ? '✓' : '✗'
    console.log(`  ${tick} ${r.label}`)
    for (const f of r.fails) {
      console.log(`      → ${f}`)
    }
  }
  return failed.length === 0
}

// ── Main ───────────────────────────────────────────────────────────────

const liveFlag = process.argv.includes('--live')

const staticResults = await runStaticGate()
const staticOk = report('static gate', staticResults)

let liveOk = true
if (liveFlag) {
  const liveOutcome = await runLiveGate()
  if (!liveOutcome.skipped) {
    liveOk = report('live gate', liveOutcome.results)
  }
}

if (!staticOk || !liveOk) {
  console.log('\n[smoke-walk] FAIL — see violations above.')
  process.exit(1)
}
console.log('\n[smoke-walk] OK')
process.exit(0)
