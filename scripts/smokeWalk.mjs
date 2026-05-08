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
import { computeBayernSha, EXPECTED_BAYERN_SHA } from './lib/bayernSha.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')

// ── Forbidden patterns (mirror of citationLint.ts) ─────────────────────
// Keep this list in sync with supabase/functions/chat-turn/citationLint.ts
// FORBIDDEN_PATTERNS. Drift between the two is itself a bug — the
// static gate below counts entries.
//
// Layer A (5 rules, no homeBundesland) — always run.
// Layer B (16 rules, each with homeBundesland) — skip when active.
const FORBIDDEN_PATTERNS = [
  // Layer A — structural mistakes, Bundesland-independent
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
  // Layer B — per-Bundesland firewall (16 entries)
  {
    name: 'baybo',
    regex: /\bBayBO\b|\bBayerische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'bayern',
  },
  {
    name: 'lbo_bw',
    regex: /\bLBO[\s-]+BW\b|\bLandesbauordnung\s+Baden[\s-]?W[üu]rttemberg\b/gi,
    severity: 'error',
    homeBundesland: 'bw',
  },
  {
    name: 'bauo_nrw',
    regex: /\bBauO\s+NRW\b|\bBauordnung\s+Nordrhein[\s-]?Westfalen\b/gi,
    severity: 'error',
    homeBundesland: 'nrw',
  },
  {
    name: 'hbo',
    regex: /\bHBO\b|\bHessische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'hessen',
  },
  {
    name: 'nbauo',
    regex: /\bNBauO\b|\bNieders[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'niedersachsen',
  },
  {
    name: 'saechsbo',
    regex: /\bS[äa]chsBO\b|\bS[äa]chsische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'sachsen',
  },
  {
    name: 'lbauo_rlp',
    regex: /\bLBauO\s+RLP\b|\bLandesbauordnung\s+Rheinland[\s-]?Pfalz\b/gi,
    severity: 'error',
    homeBundesland: 'rlp',
  },
  {
    name: 'lbo_sh',
    regex: /\bLBO\s+SH\b|\bLandesbauordnung\s+Schleswig[\s-]?Holstein\b/gi,
    severity: 'error',
    homeBundesland: 'sh',
  },
  {
    name: 'lbo_mv',
    regex: /\bLBO\s+MV\b|\bLandesbauordnung\s+Mecklenburg[\s-]?Vorpommern\b/gi,
    severity: 'error',
    homeBundesland: 'mv',
  },
  {
    name: 'bremlbo',
    regex: /\bBremLBO\b|\bBremische\s+Landesbauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'bremen',
  },
  {
    name: 'hbauo',
    regex: /\bHBauO\b|\bHamburgische\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'hamburg',
  },
  {
    name: 'lbo_saarland',
    regex: /\bLBO\s+Saarland\b|\bLandesbauordnung\s+(des\s+)?Saarland(es)?\b/gi,
    severity: 'error',
    homeBundesland: 'saarland',
  },
  {
    name: 'thuerbo',
    regex: /\bTh[üu]rBO\b|\bTh[üu]ringer\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'thueringen',
  },
  {
    name: 'bauo_lsa',
    regex: /\bBauO\s+LSA\b|\bBauordnung\s+Sachsen[\s-]?Anhalt\b/gi,
    severity: 'error',
    homeBundesland: 'sachsen-anhalt',
  },
  {
    name: 'bbgbo',
    regex: /\bBbgBO\b|\bBrandenburgische\s+Bauordnung\b|\bBauordnung\s+Brandenburg\b/gi,
    severity: 'error',
    homeBundesland: 'brandenburg',
  },
  {
    name: 'bauo_bln',
    regex: /\bBauO\s+Bln\b|\bBauordnung\s+(f[üu]r\s+)?Berlin\b|\bBerliner\s+Bauordnung\b/gi,
    severity: 'error',
    homeBundesland: 'berlin',
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

// Per-Bundesland switch fixtures — Phase 11 commit 2.
// For each top state (NRW / BW / Niedersachsen / Hessen) the lint must
// allow the state's own LBO citations (homeBundesland match filters the
// pattern out) and still reject citations to other states' LBOs. Bayern
// regression checks confirm the home state still doesn't self-flag.
const BUNDESLAND_SWITCH_FIXTURES = [
  // ── NRW
  {
    label: 'active=nrw, "§ 5 BauO NRW" — must NOT flag (own state)',
    activeBundesland: 'nrw',
    text: 'Die Abstandsflächen richten sich nach § 5 BauO NRW.',
    expectFlag: false,
  },
  {
    label: 'active=nrw, "BayBO Art. 57" — must flag (wrong Bundesland)',
    activeBundesland: 'nrw',
    text: 'Ein Vergleich mit BayBO Art. 57 wäre hier irreführend.',
    expectFlag: true,
  },
  {
    label: 'active=nrw, "Anlage 1 BayBO" — must flag (Layer-A always)',
    activeBundesland: 'nrw',
    text: 'Anlage 1 BayBO ist hier ohnehin nicht einschlägig.',
    expectFlag: true,
  },
  // Phase 12 commit 3 — NRW content-grade fixtures
  {
    label: 'active=nrw, "§ 6 BauO NRW" Abstandsflächen — must NOT flag',
    activeBundesland: 'nrw',
    text: 'Die Abstandsflächen richten sich nach § 6 BauO NRW.',
    expectFlag: false,
  },
  {
    label: 'active=nrw, "§ 63 BauO NRW" Genehmigungsfreistellung — must NOT flag',
    activeBundesland: 'nrw',
    text: 'Im qualifizierten B-Plan greift § 63 BauO NRW Genehmigungsfreistellung.',
    expectFlag: false,
  },
  {
    label: 'active=nrw, "§ 64 BauO NRW" vereinfachtes Verfahren — must NOT flag',
    activeBundesland: 'nrw',
    text: 'Das vereinfachte Verfahren nach § 64 BauO NRW ist Regel für Wohngebäude.',
    expectFlag: false,
  },
  {
    label: 'active=nrw, "§ 67 BauO NRW" Bauvorlageberechtigung — must NOT flag',
    activeBundesland: 'nrw',
    text: 'Bauvorlageberechtigung nach § 67 BauO NRW ist zwingend.',
    expectFlag: false,
  },
  // ── BW
  {
    label: 'active=bw, "§ 5 LBO BW" — must NOT flag (own state)',
    activeBundesland: 'bw',
    text: 'Abstandsflächen nach § 5 LBO BW.',
    expectFlag: false,
  },
  {
    label: 'active=bw, "BauO NRW" — must flag (wrong Bundesland)',
    activeBundesland: 'bw',
    text: 'Die BauO NRW kennt eine andere Schwellenlogik.',
    expectFlag: true,
  },
  // Phase 12 commit 4 — BW content-grade fixtures
  {
    label: 'active=bw, "§ 51 LBO Kenntnisgabeverfahren" — must NOT flag (BW-Spezifikum)',
    activeBundesland: 'bw',
    text: 'Das Kenntnisgabeverfahren nach § 51 LBO ist eine BW-spezifische Verfahrensart.',
    expectFlag: false,
  },
  {
    label: 'active=bw, "§ 52 LBO vereinfachtes Verfahren" — must NOT flag',
    activeBundesland: 'bw',
    text: 'Im vereinfachten Verfahren nach § 52 LBO ist der Prüfumfang reduziert.',
    expectFlag: false,
  },
  {
    label: 'active=bw, "§ 58 Abs. 1a LBO Genehmigungsfiktion" — must NOT flag (Novelle 2025)',
    activeBundesland: 'bw',
    text: 'Nach § 58 Abs. 1a LBO greift die Genehmigungsfiktion 3 Monate.',
    expectFlag: false,
  },
  {
    label: 'active=bw, "ANHANG 1 zu § 50 Abs. 1 LBO" — must NOT flag',
    activeBundesland: 'bw',
    text: 'Verfahrensfreie Vorhaben sind im ANHANG 1 zu § 50 Abs. 1 LBO katalogisiert.',
    expectFlag: false,
  },
  // ── Niedersachsen
  {
    label: 'active=niedersachsen, "§ 5 NBauO" — must NOT flag (own state)',
    activeBundesland: 'niedersachsen',
    text: 'Abstandsflächen nach § 5 NBauO.',
    expectFlag: false,
  },
  {
    label: 'active=niedersachsen, "BayBO Art. 6" — must flag',
    activeBundesland: 'niedersachsen',
    text: 'BayBO Art. 6 ist nicht anwendbar.',
    expectFlag: true,
  },
  // Phase 12 commit 2 — Niedersachsen content-grade fixtures
  {
    label: 'active=niedersachsen, "§ 60 NBauO" Verfahrensfreie + Anhang — must NOT flag',
    activeBundesland: 'niedersachsen',
    text: 'Die im Anhang genannten baulichen Anlagen nach § 60 NBauO sind verfahrensfrei.',
    expectFlag: false,
  },
  {
    label: 'active=niedersachsen, "§ 63 NBauO" vereinfachtes Verfahren — must NOT flag',
    activeBundesland: 'niedersachsen',
    text: 'Sofern keine Sonderbauten vorliegen, läuft das Vorhaben über § 63 NBauO.',
    expectFlag: false,
  },
  {
    label: 'active=niedersachsen, "§ 64 NBauO" reguläres Verfahren — must NOT flag',
    activeBundesland: 'niedersachsen',
    text: 'Sonderbauten werden nach § 64 NBauO geprüft.',
    expectFlag: false,
  },
  {
    label: 'active=niedersachsen, "Anhang NBauO" — must NOT flag',
    activeBundesland: 'niedersachsen',
    text: 'Der konkrete Maßnahmenkatalog steht im Anhang NBauO.',
    expectFlag: false,
  },
  // ── Hessen
  {
    label: 'active=hessen, "§ 6 HBO" — must NOT flag (own state)',
    activeBundesland: 'hessen',
    text: 'Abstandsflächen nach § 6 HBO.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, "Hessische Bauordnung" — must NOT flag (own state long form)',
    activeBundesland: 'hessen',
    text: 'Die Hessische Bauordnung regelt das in § 6.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, "LBO BW" — must flag (wrong Bundesland)',
    activeBundesland: 'hessen',
    text: 'Im Vergleich zu LBO BW gibt es Abweichungen.',
    expectFlag: true,
  },
  // Phase 12 commit 1 — Hessen content-grade fixtures
  {
    label: 'active=hessen, "§ 67 Abs. 3 HBO" Bauvorlageberechtigung — must NOT flag',
    activeBundesland: 'hessen',
    text: 'Bauvorlageberechtigung nach § 67 Abs. 3 HBO bei Wohngebäuden bis 200 m² Wohnfläche und 2 Wohneinheiten.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, "§ 70 Abs. 4 HBO" 3-Monats-Frist — must NOT flag',
    activeBundesland: 'hessen',
    text: 'Die Bauaufsichtsbehörde entscheidet über den Bauantrag innerhalb von drei Monaten nach § 70 Abs. 4 HBO.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, "§ 74 Abs. 7 HBO" Geltungsdauer — must NOT flag',
    activeBundesland: 'hessen',
    text: 'Die Baugenehmigung erlischt nach § 74 Abs. 7 HBO grundsätzlich nach drei Jahren.',
    expectFlag: false,
  },
  {
    label: 'active=hessen, Phase-11-stub "wrong" claim "§ 78 HBO Genehmigungsfreistellung" — must NOT flag (Layer-A doesnt fire); semantic correctness checked in review doc',
    activeBundesland: 'hessen',
    // Note: this would have been a wrong claim in the Phase 11 stub
    // (§ 78 is Fliegende Bauten, not Genehmigungsfreistellung). The
    // citation lint catches WRONG-BUNDESLAND citations, not WRONG-§-
    // CONTENT claims. Semantic correctness is a review-doc concern;
    // the lint is a Bundesland firewall, not a paragraph oracle.
    // This fixture confirms the lint does NOT over-fire on a
    // Hessen project's HBO §-citation regardless of whether the §-
    // body claim is right.
    text: '§ 78 HBO regelt Fliegende Bauten.',
    expectFlag: false,
  },
  // ── Bayern regressions
  {
    label: 'active=bayern, "Art. 57 BayBO" — must NOT flag (own state)',
    activeBundesland: 'bayern',
    text: 'Verfahrensfreiheit nach BayBO Art. 57 Abs. 1 Nr. 1 a.',
    expectFlag: false,
  },
  {
    label: 'active=bayern, "BauO NRW" — must STILL flag (wrong Bundesland)',
    activeBundesland: 'bayern',
    text: 'Im Gegensatz zu BauO NRW regelt das BayBO direkt.',
    expectFlag: true,
  },
  {
    label: 'active=bayern, "§ 57 BayBO" — must STILL flag (Layer-A § vs Art.)',
    activeBundesland: 'bayern',
    text: 'Die Verfahrensfreiheit folgt aus § 57 BayBO.',
    expectFlag: true,
  },
]

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

// ── Phase 13 — qualifier-write-gate fixtures ────────────────────────────
//
// Mirror of src/lib/projectStateHelpers.ts gateQualifiersByRole. Drift
// between this JS port and the TS source is a bug — the structural
// drift-check below (drift_qualifierGate) reads the .ts and asserts
// the function still exists and QUALIFIER_GATE_REJECTS is still false.
//
// The gate enforces v1.5 §6.B.01: only role='designer' callers can emit
// DESIGNER+VERIFIED qualifiers. Phase 13 Week 1 = observability mode
// (downgrade-and-log, no rejection). Week 2 will flip to gating mode.
//
// Fixtures cover the four mutation surfaces (extracted_facts, the three
// _delta upserts) plus the pass-through callers (designer, system).

function gateQualifiersByRoleJS(toolInput, callerRole) {
  const events = []
  if (callerRole === 'designer' || callerRole === 'system') return events
  const REASON =
    'DESIGNER+VERIFIED requires role=designer; downgraded to DESIGNER+ASSUMED per v1.5 §6.B.01.'
  for (const f of toolInput.extracted_facts ?? []) {
    if (f.source === 'DESIGNER' && f.quality === 'VERIFIED') {
      events.push({ field: 'extracted_fact', item_id: f.key })
      f.quality = 'ASSUMED'
    }
  }
  for (const r of toolInput.recommendations_delta ?? []) {
    if (r.op !== 'upsert') continue
    if (r.qualifier?.source === 'DESIGNER' && r.qualifier?.quality === 'VERIFIED') {
      events.push({ field: 'recommendation', item_id: r.id })
      r.qualifier.quality = 'ASSUMED'
    }
  }
  for (const p of toolInput.procedures_delta ?? []) {
    if (p.op !== 'upsert') continue
    if (p.source === 'DESIGNER' && p.quality === 'VERIFIED') {
      events.push({ field: 'procedure', item_id: p.id })
      p.quality = 'ASSUMED'
    }
  }
  for (const d of toolInput.documents_delta ?? []) {
    if (d.op !== 'upsert') continue
    if (d.source === 'DESIGNER' && d.quality === 'VERIFIED') {
      events.push({ field: 'document', item_id: d.id })
      d.quality = 'ASSUMED'
    }
  }
  for (const r of toolInput.roles_delta ?? []) {
    if (r.op !== 'upsert') continue
    if (r.source === 'DESIGNER' && r.quality === 'VERIFIED') {
      events.push({ field: 'role', item_id: r.id })
      r.quality = 'ASSUMED'
    }
  }
  return events
}

const QUALIFIER_GATE_FIXTURES = [
  {
    label: 'client + DESIGNER+VERIFIED extracted_fact → 1 downgrade event',
    role: 'client',
    input: {
      extracted_facts: [
        { key: 'site.height', value: 6.8, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 1,
    expectFinalQuality: { kind: 'extracted_fact', key: 'site.height', quality: 'ASSUMED' },
  },
  {
    label: 'client + DESIGNER+VERIFIED recommendation upsert → 1 downgrade',
    role: 'client',
    input: {
      recommendations_delta: [
        {
          op: 'upsert',
          id: 'rec-1',
          qualifier: { source: 'DESIGNER', quality: 'VERIFIED' },
        },
      ],
    },
    expectEventCount: 1,
    expectFinalQuality: { kind: 'recommendation', id: 'rec-1', quality: 'ASSUMED' },
  },
  {
    label: 'client + 3-way procedure/document/role upserts → 3 downgrades',
    role: 'client',
    input: {
      procedures_delta: [
        { op: 'upsert', id: 'p-1', source: 'DESIGNER', quality: 'VERIFIED' },
      ],
      documents_delta: [
        { op: 'upsert', id: 'd-1', source: 'DESIGNER', quality: 'VERIFIED' },
      ],
      roles_delta: [
        { op: 'upsert', id: 'r-1', source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 3,
  },
  {
    label: 'designer caller passes DESIGNER+VERIFIED unchanged',
    role: 'designer',
    input: {
      extracted_facts: [
        { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 0,
    expectFinalQuality: { kind: 'extracted_fact', key: 'k', quality: 'VERIFIED' },
  },
  {
    label: 'system caller passes DESIGNER+VERIFIED unchanged',
    role: 'system',
    input: {
      extracted_facts: [
        { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 0,
    expectFinalQuality: { kind: 'extracted_fact', key: 'k', quality: 'VERIFIED' },
  },
  {
    label: 'client + non-DESIGNER source untouched',
    role: 'client',
    input: {
      extracted_facts: [
        { key: 'a', value: 1, source: 'CLIENT', quality: 'VERIFIED' },
        { key: 'b', value: 1, source: 'LEGAL', quality: 'VERIFIED' },
        { key: 'c', value: 1, source: 'AUTHORITY', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 0,
  },
  {
    label: 'client + DESIGNER + non-VERIFIED quality untouched',
    role: 'client',
    input: {
      extracted_facts: [
        { key: 'a', value: 1, source: 'DESIGNER', quality: 'ASSUMED' },
        { key: 'b', value: 1, source: 'DESIGNER', quality: 'CALCULATED' },
        { key: 'c', value: 1, source: 'DESIGNER', quality: 'DECIDED' },
      ],
    },
    expectEventCount: 0,
  },
  {
    label: 'remove ops never inspected',
    role: 'client',
    input: {
      recommendations_delta: [{ op: 'remove', id: 'rec-old' }],
      procedures_delta: [{ op: 'remove', id: 'p-old' }],
      documents_delta: [{ op: 'remove', id: 'd-old' }],
      roles_delta: [{ op: 'remove', id: 'r-old' }],
    },
    expectEventCount: 0,
  },
  {
    label: 'engineer caller behaves like client (downgrade)',
    role: 'engineer',
    input: {
      extracted_facts: [
        { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 1,
    expectFinalQuality: { kind: 'extracted_fact', key: 'k', quality: 'ASSUMED' },
  },
  {
    label: 'authority caller behaves like client (downgrade)',
    role: 'authority',
    input: {
      extracted_facts: [
        { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      ],
    },
    expectEventCount: 1,
  },
  {
    label: 'mixed payload: only DESIGNER+VERIFIED entries are gated',
    role: 'client',
    input: {
      extracted_facts: [
        { key: 'gated', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
        { key: 'free-1', value: 1, source: 'CLIENT', quality: 'VERIFIED' },
        { key: 'free-2', value: 1, source: 'DESIGNER', quality: 'ASSUMED' },
      ],
    },
    expectEventCount: 1,
    expectFinalQuality: { kind: 'extracted_fact', key: 'gated', quality: 'ASSUMED' },
  },
]

function readQualifierFromFixture(input, expect) {
  if (!expect) return null
  if (expect.kind === 'extracted_fact') {
    const f = (input.extracted_facts ?? []).find((x) => x.key === expect.key)
    return f ? f.quality : null
  }
  if (expect.kind === 'recommendation') {
    const r = (input.recommendations_delta ?? []).find(
      (x) => x.op === 'upsert' && x.id === expect.id,
    )
    return r ? r.qualifier?.quality ?? null : null
  }
  return null
}

// ── Static gate ────────────────────────────────────────────────────────

async function readFileText(relPath) {
  const abs = join(REPO_ROOT, relPath)
  return await readFile(abs, 'utf8')
}

function lintText(text, activeBundesland = null) {
  const violations = []
  for (const { name, regex, severity, homeBundesland } of FORBIDDEN_PATTERNS) {
    if (homeBundesland && homeBundesland === activeBundesland) continue
    regex.lastIndex = 0
    let m
    while ((m = regex.exec(text)) !== null) {
      violations.push({ name, match: m[0], severity, index: m.index })
      if (m.index === regex.lastIndex) regex.lastIndex += 1
    }
  }
  return violations
}

// ── Bayern byte-for-byte gate ──────────────────────────────────────────
// Single source of truth: scripts/lib/bayernSha.mjs. Same module backs
// the standalone `node scripts/verify-bayern-sha.mjs` debug CLI, so
// the two paths cannot drift.
async function runBayernShaGate() {
  const { sha, length } = await computeBayernSha()
  return [
    {
      ok: sha === EXPECTED_BAYERN_SHA,
      msg: `Bayern prefix SHA mismatch.\n` +
        `  expected: ${EXPECTED_BAYERN_SHA}\n` +
        `  actual:   ${sha}\n` +
        `  length:   ${length}\n` +
        `  → If Bayern content was edited intentionally, update EXPECTED_BAYERN_SHA in scripts/lib/bayernSha.mjs and call it out in the commit message.`,
    },
  ]
}

function lintToolInput(input, activeBundesland = null) {
  const violations = []
  for (const { field, text } of collectModelTexts(input)) {
    for (const v of lintText(text, activeBundesland)) {
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
      ok: patternCount >= 21,
      msg: `expected ≥ 21 regex entries in FORBIDDEN_PATTERNS (5 Bayern structural + 16 per-Bundesland firewall); found ${patternCount}`,
    },
  ]))

  // 4b. legalRegistry has all 16 Bundesländer registered (Phase 11
  // commit 3 acceptance). The TypeScript Record<BundeslandCode,
  // StateDelta> type already enforces this at compile time; the
  // string-level check here is a defensive belt-and-braces against
  // the registry file being silently shortened during a refactor.
  const registrySource = await readFileText('src/legal/legalRegistry.ts')
  const ALL_16_STATE_CODES = [
    'bayern', 'nrw', 'bw', 'niedersachsen', 'hessen',
    'sachsen', 'sachsen-anhalt', 'thueringen', 'rlp', 'saarland',
    'sh', 'mv', 'brandenburg', 'berlin', 'hamburg', 'bremen',
  ]
  results.push(failures('legalRegistry: all 16 Bundesländer registered', [
    {
      ok: ALL_16_STATE_CODES.every((code) =>
        new RegExp(`['"]?${code}['"]?\\s*:\\s*\\w+_DELTA`).test(registrySource)
      ),
      msg: `Missing Bundesland registry entries: ${ALL_16_STATE_CODES.filter(
        (code) => !new RegExp(`['"]?${code}['"]?\\s*:\\s*\\w+_DELTA`).test(registrySource)
      ).join(', ')}`,
    },
  ]))

  // 4c. Each of the 11 minimum-stub states must surface a
  // "Vorbereitung" Hinweis in its systemBlock. The persona reads
  // this and gives the user honest "MBO-default, full state content
  // pending" framing instead of fabricating state-specific advice.
  const MINIMUM_STUBS = [
    'sachsen', 'sachsen-anhalt', 'thueringen', 'rlp', 'saarland',
    'sh', 'mv', 'brandenburg', 'berlin', 'hamburg', 'bremen',
  ]
  for (const code of MINIMUM_STUBS) {
    const stubSource = await readFileText(`src/legal/states/${code}.ts`)
    results.push(failures(`minimum stub ${code}: "Vorbereitung" Hinweis present`, [
      {
        ok: /werden in einer späteren\s*\n?\s*Bearbeitungsphase ergänzt|in Vorbereitung/i.test(stubSource),
        msg: `Stub src/legal/states/${code}.ts must surface a "werden in einer späteren Bearbeitungsphase ergänzt" or "in Vorbereitung" Hinweis so the persona doesn't hallucinate state-specific content.`,
      },
      {
        ok: /allowedCitations:\s*\[\s*\]/.test(stubSource),
        msg: `Stub src/legal/states/${code}.ts must keep allowedCitations as an empty array — Phase 14 widens it once content lands.`,
      },
    ]))
  }

  // 5. Lint logic validates against curated samples. The legacy
  // LINT_SAMPLES were authored in a Bayern-only world; Phase 11
  // makes the firewall per-Bundesland, so we explicitly pass
  // 'bayern' as the active state to preserve the original semantics.
  // Per-state samples live in BUNDESLAND_SWITCH_FIXTURES below.
  for (const s of LINT_SAMPLES) {
    const v = lintText(s.text, s.activeBundesland ?? 'bayern')
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

  // 6.0 Bayern byte-for-byte gate — Phase 11 invariant.
  // The composed legal-context PREFIX for Bayern must produce the
  // exact same SHA-256 across phases. If this changes, the Anthropic
  // prompt cache is invalidated AND we may have unintended drift in
  // the Bayern persona. Re-baseline the expected hash deliberately
  // when Bayern content is intentionally edited (commit message must
  // call it out).
  results.push(failures('Bayern byte-for-byte SHA gate', await runBayernShaGate()))

  // 6a. Per-Bundesland switch suite — Phase 11 commit 2 acceptance.
  // For each of the four newly-registered top states (NRW, BW, NS, HE),
  // assert that:
  //   - The state's own LBO citations DO NOT flag (homeBundesland match
  //     filters out the pattern).
  //   - Citations to a different Bundesland's LBO STILL flag (firewall
  //     for non-active states stays active).
  //   - Layer-A structural patterns (Anlage 1 BayBO, § N BayBO, MBO)
  //     still fire regardless of active Bundesland.
  for (const sw of BUNDESLAND_SWITCH_FIXTURES) {
    const violations = lintText(sw.text, sw.activeBundesland)
    const flagged = violations.length > 0
    results.push(failures(`bundesland-switch: ${sw.label}`, [
      {
        ok: flagged === sw.expectFlag,
        msg: sw.expectFlag
          ? `expected to flag in active=${sw.activeBundesland} but got none on text: "${sw.text.slice(0, 70)}…"`
          : `expected NO flag in active=${sw.activeBundesland} but got ${violations.length}: ${JSON.stringify(violations.map((v) => v.match))}`,
      },
    ]))
  }

  // 6b. Deep-fixture suite: run the lint over the FULL respond-tool
  // input shape so the new scan surface (recommendations_delta /
  // procedures_delta / documents_delta / extracted_facts.evidence) is
  // exercised by the static gate. The acceptance test for the audit's
  // §6 attack vector A2 — an LBO BW citation buried inside a
  // recommendation detail — lives here. Legacy fixtures default to
  // 'bayern' as the active Bundesland; per-state cases set
  // activeBundesland explicitly.
  for (const f of TOOL_INPUT_FIXTURES) {
    const violations = lintToolInput(f.input, f.activeBundesland ?? 'bayern')
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

  // 7. Phase 13 — qualifier-write-gate fixtures.
  // Drift check: read projectStateHelpers.ts and assert the gate
  // function exists and the Week 1 observability flag is still false.
  // Then run the JS-port gate over each fixture and assert the event
  // count + post-mutation qualifier matches the expectation.
  const helpersSource = await readFileText('src/lib/projectStateHelpers.ts')
  results.push(failures('phase-13: gate function + rejection flag', [
    {
      ok: /export function gateQualifiersByRole\b/.test(helpersSource),
      msg: 'projectStateHelpers.ts missing gateQualifiersByRole export',
    },
    {
      ok: /export const QUALIFIER_GATE_REJECTS\s*=\s*true\b/.test(helpersSource),
      msg: 'Week 2 invariant: QUALIFIER_GATE_REJECTS must be `true` (rejection mode)',
    },
    {
      ok: /export class QualifierRoleViolationError\b/.test(helpersSource),
      msg: 'Week 2 invariant: QualifierRoleViolationError class must be exported',
    },
    {
      ok: /export type CallerRole\s*=\s*'client' \| 'designer' \| 'engineer' \| 'authority' \| 'system'/.test(helpersSource),
      msg: 'CallerRole type drifted from expected union',
    },
  ]))

  // Phase 13 Week 2 — Edge Function wiring drift checks. The chat-turn
  // entrypoint MUST short-circuit with the qualifier_role_violation
  // envelope before applyToolInputToState runs; the streaming path
  // must close the SSE stream with an error frame in the same case.
  // Without these, the "rejection mode" flip is purely cosmetic.
  const indexSource = await readFileText('supabase/functions/chat-turn/index.ts')
  const streamingSource = await readFileText('supabase/functions/chat-turn/streaming.ts')
  results.push(failures('phase-13 week 2: chat-turn JSON path rejects', [
    {
      ok: /QUALIFIER_GATE_REJECTS/.test(indexSource),
      msg: 'index.ts must reference QUALIFIER_GATE_REJECTS to flip behaviour',
    },
    {
      ok: /code:\s*'qualifier_role_violation'/.test(indexSource),
      msg: 'index.ts must return the qualifier_role_violation error code on rejection',
    },
    {
      ok: /Diese Festlegung erfordert die Freigabe durch eine\/n bauvorlageberechtigte\/n Architekt\/in/.test(indexSource),
      msg: 'index.ts must surface the locked CTA copy verbatim',
    },
  ]))
  results.push(failures('phase-13 week 2: streaming path closes with error frame', [
    {
      ok: /QUALIFIER_GATE_REJECTS/.test(streamingSource),
      msg: 'streaming.ts must reference QUALIFIER_GATE_REJECTS',
    },
    {
      ok: /type:\s*'error'[\s\S]{0,400}qualifier_role_violation/.test(streamingSource),
      msg: 'streaming.ts must emit a type=error SSE frame with code=qualifier_role_violation',
    },
  ]))

  // Phase 13 Week 2 — error-code union drift check. Adding the new
  // code to ChatTurnErrorCode is what allows the SPA's exhaustiveness
  // checks (switch-case error UI rendering) to handle the new case.
  const chatTurnTypesSource = await readFileText('src/types/chatTurn.ts')
  results.push(failures('phase-13 week 2: ChatTurnErrorCode includes qualifier_role_violation', [
    {
      ok: /\|\s*'qualifier_role_violation'/.test(chatTurnTypesSource),
      msg: 'src/types/chatTurn.ts ChatTurnErrorCode must include qualifier_role_violation',
    },
  ]))

  // Phase 13 Week 3 — Edge Functions + RLS drift checks. The
  // share-project + verify-fact functions both depend on env vars
  // (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)
  // and on the 0028_projects_architect_read.sql migration being
  // applied. Pre-build asserts the modules exist, expose the right
  // route handler, and reference the env vars by name.
  const shareProjectSrc = await readFileText('supabase/functions/share-project/index.ts')
  const verifyFactSrc = await readFileText('supabase/functions/verify-fact/index.ts')
  results.push(failures('phase-13 week 3: share-project edge function shape', [
    {
      ok: /Deno\.serve\(/.test(shareProjectSrc),
      msg: 'share-project must expose Deno.serve handler',
    },
    {
      ok: /SUPABASE_SERVICE_ROLE_KEY/.test(shareProjectSrc),
      msg: 'share-project must read SUPABASE_SERVICE_ROLE_KEY (claim path uses service-role bypass)',
    },
    {
      ok: /role\s*!==\s*'designer'|profile\?\.role\s*!==\s*'designer'/.test(shareProjectSrc),
      msg: 'share-project must reject callers whose profiles.role is not designer',
    },
    {
      ok: /'project_member\.accepted'/.test(shareProjectSrc),
      msg: 'share-project must log project_member.accepted to event_log',
    },
  ]))

  // ── v1.0.1 hot-fix drift checks (POST_V1_AUDIT CRIT-1/2/3) ──────────
  // Three CRITICAL findings closed in v1.0.1; the static-source asserts
  // below pin the fix and fail the gate if any of the three is reverted.
  results.push(failures('v1.0.1 CRIT-1: non-owner-cannot-share', [
    {
      ok: /action:\s*'create'/.test(shareProjectSrc),
      msg: 'share-project must support {action:"create"} mode for owner-side invite generation',
    },
    {
      ok: /handleCreate\b[\s\S]{0,2000}owner_id\s*!==\s*userId/.test(shareProjectSrc),
      msg: 'CRIT-1 fix: handleCreate must explicitly compare projects.owner_id against the caller before INSERT',
    },
    {
      ok: /Only the project owner can create architect invites/.test(shareProjectSrc),
      msg: 'CRIT-1 fix: 403 message must surface "Only the project owner can create architect invites"',
    },
  ]))
  results.push(failures('v1.0.1 CRIT-2: accept-rejects-non-designer', [
    {
      ok: /handleAccept\b[\s\S]{0,2000}profile\?\.role\s*!==\s*'designer'/.test(shareProjectSrc),
      msg: 'CRIT-2 pin: handleAccept must check profile.role !== designer before any state mutation',
    },
    {
      ok: /Only profiles with role=designer can claim architect invites/.test(shareProjectSrc),
      msg: 'CRIT-2 pin: 403 message must surface the locked designer-only copy',
    },
  ]))
  results.push(failures('v1.0.1 CRIT-3: accept-rejects-expired-token', [
    {
      ok: /expires_at/.test(shareProjectSrc),
      msg: 'CRIT-3 fix: share-project must read expires_at from the project_members row',
    },
    {
      ok: /new Date\(row\.expires_at\)\.getTime\(\)\s*<\s*Date\.now\(\)/.test(shareProjectSrc),
      msg: 'CRIT-3 fix: handleAccept must reject if the invite has expired (expires_at < now)',
    },
    {
      ok: /Diese Einladung ist abgelaufen/.test(shareProjectSrc),
      msg: 'CRIT-3 fix: expired-invite copy must surface the locked German message',
    },
  ]))
  // ── v1.0.2 hot-fix drift checks (RLS recursion) ────────────────────
  // Pin the SECURITY DEFINER helper functions + replaced policies so any
  // future revert of 0031 fires the daily gate immediately.
  const recursionMig = await readFileText('supabase/migrations/0031_fix_projects_rls_recursion.sql')
  results.push(failures('v1.0.2 CRIT: rls-recursion-fix — helper functions', [
    {
      ok: /create or replace function public\.is_project_owner\(p_project_id uuid\)[\s\S]{0,400}security definer[\s\S]{0,200}set search_path = ''/.test(recursionMig),
      msg: '0031 must declare is_project_owner with security definer + set search_path = \'\'',
    },
    {
      ok: /create or replace function public\.is_accepted_architect\(p_project_id uuid\)[\s\S]{0,400}security definer[\s\S]{0,200}set search_path = ''/.test(recursionMig),
      msg: '0031 must declare is_accepted_architect with security definer + set search_path = \'\'',
    },
    {
      ok: /\bstable\b/.test(recursionMig),
      msg: '0031 helper functions must be marked stable for query-plan optimization',
    },
  ]))
  results.push(failures('v1.0.2 CRIT: rls-recursion-fix — grants', [
    {
      ok: /revoke all on function public\.is_project_owner\(uuid\)\s+from public/.test(recursionMig),
      msg: '0031 must revoke default PUBLIC execute on is_project_owner',
    },
    {
      ok: /revoke all on function public\.is_accepted_architect\(uuid\)\s+from public/.test(recursionMig),
      msg: '0031 must revoke default PUBLIC execute on is_accepted_architect',
    },
    {
      ok: /grant\s+execute on function public\.is_project_owner\(uuid\)\s+to authenticated, anon/.test(recursionMig),
      msg: '0031 must grant execute on is_project_owner to authenticated + anon',
    },
    {
      ok: /grant\s+execute on function public\.is_accepted_architect\(uuid\)\s+to authenticated, anon/.test(recursionMig),
      msg: '0031 must grant execute on is_accepted_architect to authenticated + anon',
    },
  ]))
  results.push(failures('v1.0.2 CRIT: rls-recursion-fix — replaced policies', [
    {
      ok: /drop policy if exists "architect-member can select projects" on public\.projects/.test(recursionMig),
      msg: '0031 must drop the recursive architect-member policy first',
    },
    {
      ok: /using \(\s*public\.is_accepted_architect\(id\)\s*\)/.test(recursionMig),
      msg: '0031 must replace the architect-member USING clause with public.is_accepted_architect(id)',
    },
    {
      ok: /drop policy if exists "members read own membership" on public\.project_members/.test(recursionMig),
      msg: '0031 must drop the recursive project_members policy first',
    },
    {
      ok: /public\.is_project_owner\(project_id\)/.test(recursionMig),
      msg: '0031 must replace the project_members owner subquery with public.is_project_owner(project_id)',
    },
    {
      // Defense-in-depth: the recursive EXISTS subquery patterns from
      // 0026 + 0028 must NOT survive in 0031. If a future refactor
      // re-introduces them, this fixture catches it before deploy.
      ok: !/exists\s*\(\s*select 1\s+from public\.project_members pm\s+where pm\.project_id = projects\.id/.test(recursionMig),
      msg: '0031 must NOT contain the recursive EXISTS subquery from 0028',
    },
  ]))

  // Migration drift — 0030 must declare the column + backfill + index.
  const expiryMig = await readFileText('supabase/migrations/0030_project_members_expiry.sql')
  results.push(failures('v1.0.1 CRIT-3: 0030_project_members_expiry.sql shape', [
    {
      ok: /add column if not exists expires_at\s+timestamptz/i.test(expiryMig),
      msg: '0030 must ADD COLUMN IF NOT EXISTS expires_at timestamptz',
    },
    {
      ok: /default now\(\)\s*\+\s*interval\s+'7 days'/i.test(expiryMig),
      msg: '0030 must use 7-day default for new rows',
    },
    {
      ok: /update public\.project_members[\s\S]{0,400}set expires_at\s*=\s*invited_at\s*\+\s*interval\s+'7 days'/i.test(expiryMig),
      msg: '0030 must backfill pre-existing rows from invited_at + 7 days',
    },
    {
      ok: /create index if not exists project_members_expires_at_idx/i.test(expiryMig),
      msg: '0030 must create the partial index for stale-invite cleanup',
    },
  ]))
  results.push(failures('phase-13 week 3: verify-fact edge function shape', [
    {
      ok: /Deno\.serve\(/.test(verifyFactSrc),
      msg: 'verify-fact must expose Deno.serve handler',
    },
    {
      ok: /SUPABASE_SERVICE_ROLE_KEY/.test(verifyFactSrc),
      msg: 'verify-fact must read SUPABASE_SERVICE_ROLE_KEY (state mutation bypasses RLS after role checks)',
    },
    {
      ok: /role\s*!==\s*'designer'|profile\?\.role\s*!==\s*'designer'/.test(verifyFactSrc),
      msg: 'verify-fact must reject callers whose profiles.role is not designer',
    },
    {
      ok: /accepted_at/.test(verifyFactSrc),
      msg: 'verify-fact must require an accepted project_members row',
    },
    {
      ok: /'qualifier\.verified'/.test(verifyFactSrc),
      msg: 'verify-fact must log qualifier.verified to event_log',
    },
  ]))

  // Phase 13 Week 3 — projects RLS extension migration must exist,
  // and the policy must reference project_members + accepted_at.
  const archReadMig = await readFileText('supabase/migrations/0028_projects_architect_read.sql')
  results.push(failures('phase-13 week 3: 0028_projects_architect_read.sql shape', [
    {
      ok: /project_members\s+pm/.test(archReadMig),
      msg: '0028 must subquery project_members for the architect-read policy',
    },
    {
      ok: /pm\.accepted_at\s+is\s+not\s+null/i.test(archReadMig),
      msg: '0028 must require accepted_at IS NOT NULL (pending invitees should not read)',
    },
  ]))

  // Phase 13 Week 3 — surface-locked CTA copy must appear in the
  // VorlaeufigFooter component verbatim.
  const vorlaeufigSrc = await readFileText('src/features/architect/components/VorlaeufigFooter.tsx')
  results.push(failures('phase-13 week 3: VorlaeufigFooter copy locked', [
    {
      ok: /Vorl[äa]ufig/.test(vorlaeufigSrc),
      msg: 'VorlaeufigFooter must surface the "Vorläufig" tag',
    },
    {
      ok: /bauvorlageberechtigte\/n Architekt\/in/.test(vorlaeufigSrc),
      msg: 'VorlaeufigFooter must surface the locked architect copy',
    },
  ]))

  // ── v1.0.4 hot-fix drift check (PROD_READINESS_AUDIT A1 — Impressum DDG) ──
  // Zero literal {{...}} placeholders may remain anywhere under
  // src/features/legal/. The build-time validator
  // (scripts/verify-legal-config.mjs) catches the same regression in
  // the prebuild step; the smokeWalk fixture is the citation-suite
  // mirror so a single smoke:citations command surfaces both the
  // citation-firewall and the legal-config posture.
  const { readdir: smokeReaddir } = await import('node:fs/promises')
  async function* walkLegalSources(dir) {
    const entries = await smokeReaddir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        yield* walkLegalSources(full)
      } else if (e.isFile() && /\.(tsx?|jsx?)$/.test(e.name)) {
        yield full
      }
    }
  }
  const legalLeaks = []
  for await (const file of walkLegalSources(join(REPO_ROOT, 'src/features/legal'))) {
    const text = await readFile(file, 'utf-8')
    // Strip comment-only lines so the audit-blocker documentation in
    // LegalConfigUnavailable.tsx (which names the pattern verbatim
    // for explanation) doesn't false-positive. Render-time leaks
    // would always be in JSX-expression positions, never in comments.
    const stripped = text
      .split('\n')
      .filter((l) => {
        const t = l.trimStart()
        return !(
          t.startsWith('//') ||
          t.startsWith('*') ||
          t.startsWith('/*') ||
          t.startsWith('{/*')
        )
      })
      .join('\n')
    if (/\{\{[A-Z_]+\}\}/.test(stripped)) {
      legalLeaks.push(file.replace(REPO_ROOT + '/', ''))
    }
  }
  results.push(failures('v1.0.4 A1: zero {{PLACEHOLDER}} leaks under src/features/legal/', [
    {
      ok: legalLeaks.length === 0,
      msg: legalLeaks.length === 0
        ? '(no leaks — § 5 DDG posture preserved)'
        : `Literal placeholder leak in ${legalLeaks.length} file(s): ${legalLeaks.join(', ')}`,
    },
  ]))
  // Validator script must exist + be wired into prebuild.
  const verifyLegalCfg = await readFileText('scripts/verify-legal-config.mjs')
  const pkgJson = await readFileText('package.json')
  results.push(failures('v1.0.4 A1: legal-config validator wired into prebuild', [
    {
      ok: /REQUIRED_KEYS\s*=\s*\[/.test(verifyLegalCfg),
      msg: 'verify-legal-config.mjs must declare REQUIRED_KEYS',
    },
    {
      ok: /verify:legal-config/.test(pkgJson),
      msg: 'package.json prebuild must call verify:legal-config',
    },
    {
      ok: /VITE_LEGAL_ANBIETER_NAME/.test(verifyLegalCfg),
      msg: 'validator must require VITE_LEGAL_ANBIETER_NAME',
    },
  ]))

  // ── v1.0.3 hot-fix drift checks (POST_SMOKE_TEST_INVESTIGATION — wire VorlaeufigFooter into result tabs) ──
  // Per the locked spec: every result tab + SuggestionCard imports
  // VorlaeufigFooter; per-card render uses the locked broadened
  // isPending predicate (source !== 'DESIGNER' || quality !== 'VERIFIED').
  results.push(failures('v1.0.3 UX: isPending broadened to !DESIGNER+VERIFIED', [
    {
      ok: /return\s+!\(source\s*===\s*'DESIGNER'\s*&&\s*quality\s*===\s*'VERIFIED'\)/.test(vorlaeufigSrc),
      msg: 'isPending must use the v1.0.3 broadened predicate (anything not DESIGNER+VERIFIED is pending)',
    },
  ]))
  const overviewTab = await readFileText('src/features/result/components/tabs/OverviewTab.tsx')
  const procDocsTab = await readFileText('src/features/result/components/tabs/ProcedureDocumentsTab.tsx')
  const teamTab = await readFileText('src/features/result/components/tabs/TeamTab.tsx')
  const costTab = await readFileText('src/features/result/components/tabs/CostTimelineTab.tsx')
  const suggestionsTab = await readFileText('src/features/result/components/tabs/SuggestionsTab.tsx')
  const suggestionCard = await readFileText('src/features/result/components/Cards/SuggestionCard.tsx')
  const VORL_IMPORT_RE = /from\s+['"]@\/features\/architect\/components\/VorlaeufigFooter['"]/
  const FOOTER_RENDER_RE = /<VorlaeufigFooter\b/
  results.push(failures('v1.0.3 UX: every result tab imports VorlaeufigFooter', [
    {
      ok: VORL_IMPORT_RE.test(overviewTab),
      msg: 'OverviewTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(procDocsTab),
      msg: 'ProcedureDocumentsTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(teamTab),
      msg: 'TeamTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(costTab),
      msg: 'CostTimelineTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(suggestionsTab),
      msg: 'SuggestionsTab must import VorlaeufigFooter',
    },
    {
      ok: VORL_IMPORT_RE.test(suggestionCard),
      msg: 'SuggestionCard must import VorlaeufigFooter',
    },
  ]))
  results.push(failures('v1.0.3 UX: every result tab renders VorlaeufigFooter', [
    {
      ok: FOOTER_RENDER_RE.test(overviewTab),
      msg: 'OverviewTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(procDocsTab),
      msg: 'ProcedureDocumentsTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(teamTab),
      msg: 'TeamTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(costTab),
      msg: 'CostTimelineTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(suggestionsTab),
      msg: 'SuggestionsTab must render <VorlaeufigFooter ... />',
    },
    {
      ok: FOOTER_RENDER_RE.test(suggestionCard),
      msg: 'SuggestionCard must render <VorlaeufigFooter ... />',
    },
  ]))
  results.push(failures('v1.0.3 UX: per-card render reads THIS card qualifier', [
    {
      ok: /<VorlaeufigFooter[\s\S]{0,160}source=\{primary\.qualifier\?\.source\}/.test(procDocsTab),
      msg: 'ProcedureDocumentsTab primary procedure must read primary.qualifier.source',
    },
    {
      ok: /<VorlaeufigFooter[\s\S]{0,160}source=\{doc\.qualifier\?\.source\}/.test(procDocsTab),
      msg: 'DocumentCard must read doc.qualifier.source per-card (inline)',
    },
    {
      ok: /<VorlaeufigFooter[\s\S]{0,160}source=\{role\.qualifier\?\.source\}/.test(teamTab),
      msg: 'RoleCard must read role.qualifier.source per-card (inline)',
    },
  ]))
  results.push(failures('v1.0.3 UX: tab-level aggregate uses isPending().some(...)', [
    {
      ok: /isPending\([\s\S]{0,400}\.some\(/.test(overviewTab) || /\.some\([\s\S]{0,200}isPending\(/.test(overviewTab),
      msg: 'OverviewTab aggregate must use isPending() across recommendations/procedures/documents/roles',
    },
    {
      ok: /\.some\([\s\S]{0,200}isPending\(/.test(procDocsTab),
      msg: 'ProcedureDocumentsTab aggregate must use isPending() across procedures+documents',
    },
    {
      ok: /\.some\([\s\S]{0,200}isPending\(/.test(teamTab),
      msg: 'TeamTab aggregate must use isPending() across roles',
    },
    {
      ok: /\.some\([\s\S]{0,200}isPending\(/.test(costTab),
      msg: 'CostTimelineTab aggregate must use isPending() across procedures+documents',
    },
  ]))

  // Phase 13 Week 4 — metrics view + CLI + audit doc.
  // The view + CLI together implement the 13b conditional-trigger
  // surface (kept deferred per locked decisions, but the data path
  // must exist so an operator can spot a regression).
  const metricsView = await readFileText('supabase/migrations/0029_qualifier_metrics_view.sql')
  results.push(failures('phase-13 week 4: 0029_qualifier_metrics_view.sql shape', [
    {
      ok: /create or replace view public\.qualifier_rates_7d_global/.test(metricsView),
      msg: '0029 must define qualifier_rates_7d_global view',
    },
    {
      ok: /create or replace view public\.qualifier_rates_7d_per_project/.test(metricsView),
      msg: '0029 must define qualifier_rates_7d_per_project view',
    },
    {
      ok: /create or replace view public\.qualifier_field_breakdown_7d/.test(metricsView),
      msg: '0029 must define qualifier_field_breakdown_7d view',
    },
    {
      ok: /interval\s+'7\s+days'/.test(metricsView),
      msg: '0029 views must use the 7-day rolling window from the spec',
    },
  ]))
  const cliSrc = await readFileText('scripts/qualifier-downgrade-rate.mjs')
  results.push(failures('phase-13 week 4: qualifier-downgrade-rate.mjs shape', [
    {
      ok: /SMOKE_SUPABASE_URL/.test(cliSrc) && /SMOKE_SUPABASE_SERVICE_KEY/.test(cliSrc),
      msg: 'CLI must read SMOKE_SUPABASE_URL + SMOKE_SUPABASE_SERVICE_KEY',
    },
    {
      ok: /qualifier_rates_7d_global/.test(cliSrc),
      msg: 'CLI must query qualifier_rates_7d_global',
    },
    {
      ok: /numerator\s*>\s*5/.test(cliSrc) && /turns\s*>=?\s*100/.test(cliSrc),
      msg: 'CLI must encode the 13b threshold (>5 events AND ≥100 turns)',
    },
  ]))
  const reviewDoc = await readFileText('docs/PHASE_13_REVIEW.md')
  results.push(failures('phase-13 week 4: PHASE_13_REVIEW.md audit trail', [
    {
      ok: /Manual deploy checklist/.test(reviewDoc),
      msg: 'PHASE_13_REVIEW.md must include the manual deploy checklist',
    },
    {
      ok: /Rollback playbook/.test(reviewDoc),
      msg: 'PHASE_13_REVIEW.md must include the rollback playbook',
    },
    {
      ok: /Migration ordering/.test(reviewDoc),
      msg: 'PHASE_13_REVIEW.md must record the 0028→0029 migration renumber',
    },
  ]))

  for (const f of QUALIFIER_GATE_FIXTURES) {
    // Deep-clone so cross-fixture mutation can't bleed through.
    const cloned = JSON.parse(JSON.stringify(f.input))
    const events = gateQualifiersByRoleJS(cloned, f.role)
    const conditions = [
      {
        ok: events.length === f.expectEventCount,
        msg: `expected ${f.expectEventCount} downgrade event(s) for role=${f.role}; got ${events.length}: ${JSON.stringify(events)}`,
      },
    ]
    if (f.expectFinalQuality) {
      const actual = readQualifierFromFixture(cloned, f.expectFinalQuality)
      conditions.push({
        ok: actual === f.expectFinalQuality.quality,
        msg: `expected post-gate qualifier=${f.expectFinalQuality.quality} on ${f.expectFinalQuality.kind}; got ${actual}`,
      })
    }
    results.push(failures(`phase-13 fixture: ${f.label}`, conditions))
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
// `--phase=13` filters the static-gate report to only Phase 13 results
// (gate function drift + qualifier-gate fixtures). Used by the Week 1
// daily gate to surface qualifier-gate regressions without scrolling
// through 80+ unrelated fixtures.
const phase13Filter = process.argv.includes('--phase=13')

const staticResults = await runStaticGate()
const filteredResults = phase13Filter
  ? staticResults.filter((r) => r.label.startsWith('phase-13'))
  : staticResults
const staticOk = report(
  phase13Filter ? 'static gate (phase 13 only)' : 'static gate',
  filteredResults,
)

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
