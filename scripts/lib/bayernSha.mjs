// ───────────────────────────────────────────────────────────────────────
// Bayern composed-prefix SHA helper.
//
// Shared by scripts/verify-bayern-sha.mjs (debug CLI) and
// scripts/smokeWalk.mjs (regression gate). Single source of truth so
// the two paths cannot drift.
//
// Re-derives composeLegalContext('bayern') from the raw slice files and
// hashes the result. The expected baseline was frozen at Phase 11
// commit 1 (667bb44). When Bayern content is intentionally edited,
// update EXPECTED_BAYERN_SHA below and call out the change in the
// commit message.
//
// SCOPE — what this SHA DOES and DOES NOT cover (audit-remediation M5):
//
//   The SHA hashes ONLY the six string constants that build the
//   composeLegalContext('bayern') PREFIX (Block 1 of the multi-block
//   cache architecture):
//     SHARED_BLOCK + FEDERAL_BLOCK + BAYERN_BLOCK + MUENCHEN_BLOCK
//       + PERSONA_BEHAVIOURAL_RULES + TEMPLATE_SHARED_BLOCK
//   joined by SLICE_SEPARATOR and capped with the PROJEKTKONTEXT TAIL.
//
//   ✅ Caught by this SHA:
//      • Any byte-level edit to one of the six string constants above.
//      • Re-ordering of SLICE_SEPARATOR concatenation in compose.ts
//        (mirrored exactly here).
//      • Bayern's StateDelta swapping cityBlock — would change MUENCHEN.
//
//   ❌ NOT caught by this SHA (pinned by OTHER gates — listed for the
//      next reader so the "Bayern unchanged" claim isn't oversold):
//      • BLOCKS[T-01..T-08] (the per-template TAIL Bayern projects
//        receive as Block 2). Pinned by `verify:template-tail-noop`
//        via the `(no-bundesland) controls` step + every cell stays in
//        ACKNOWLEDGED_OVERRIDES.
//      • src/legal/templates/stateOverrides.ts['T-xx'].bayern — none
//        registered today, but a future entry would alter Bayern's
//        Block 2 output. Same `verify:template-tail-noop` gate catches.
//      • src/legal/stateCitations.ts BAYERN_PACK / allowedCitations /
//        procedure labels — affect Bayern UI cards + Layer-C firewall,
//        not the prompt prefix. Pinned by `verify:citation-drift` for
//        the citation-allowlist drift axis only.
//      • factLabels.de.ts / factLabels.en.ts — Bayern UI labels. Pinned
//        by `verify:factlabels-leak` for the cross-state-leak axis only;
//        an intentional Bayern label change goes uncaught by SHA.
//      • src/legal/states/bayern.ts wrapper — wires BAYERN_BLOCK into
//        StateDelta. Wrapper changes don't alter the computed prefix
//        (which is what SHA hashes), so SHA stays MATCH while the
//        wrapper drifts. Pinned only by tsc + the wrapper's own tests.
//
//   When a gate-suite change touches one of the ❌ items, run the
//   matching gate AND verify:bayern-sha together — neither alone gives
//   "Bayern unchanged" full coverage.
//
// RE-BASELINE LOG:
//   - 667bb44 (Phase 11): b18d3f7f…b3471 (held across 34+ commits).
//   - v1.0.34 C4a (phase-2/full-matrix): a2ffc7bb…f31a8 — INTENTIONAL.
//     Corrected the § 246e BauGB ("Bau-Turbo") dating inside FEDERAL_BLOCK
//     from the wrong "(eingefügt 2024)" to "(in Kraft seit 30.10.2025,
//     befristet bis 31.12.2030)" (verified: gesetze-im-internet.de/bbaug/
//     __246e.html). Only the FEDERAL_BLOCK date parenthetical changed;
//     BAYERN_BLOCK / MUENCHEN_BLOCK / SHARED / PERSONA / TEMPLATE_SHARED
//     are byte-unchanged. Length 47923 → 47959 (+36).
//   - v1.0.34 Bayern procedure-article correction: 85155d2d…17b2 — INTENTIONAL.
//     Corrected the BayBO procedure-article mapping in BAYERN_BLOCK +
//     SHARED_BLOCK + TEMPLATE_SHARED_BLOCK: Art. 58 = Genehmigungsfreistellung,
//     Art. 59 = vereinfachtes Verfahren, Art. 60 = reguläres Verfahren;
//     removed the fabricated "Art. 58a" (HTTP 404 on gesetze-bayern.de). The
//     München EFH/MFH default-procedure assertions were softened to a neutral
//     conditional (Freistellung Art. 58 bei qualifiziertem B-Plan, sonst
//     vereinfacht Art. 59) pending a licensed-architect call — none available
//     at correction time. Verified against gesetze-bayern.de BayBO-58/59/60;
//     see docs/V1_0_34_BAYERN_PROCEDURE_CORRECTION.md. Length 47959 → 48473.
//   - phase-b/wire-spine GEG §8→§10 correction: cdf3c625…daaf — INTENTIONAL.
//     The Wärmeschutznachweis was cited as "GEG § 8" in FEDERAL_BLOCK
//     (federal.ts: "§ 8 GEG") and BAYERN_BLOCK (bayern.ts: "… · GEG § 8"); § 8
//     GEG is "Verantwortliche", not the Wärmeschutznachweis. Corrected both to
//     "§ 10 GEG" (Grundsatz und Niedrigstenergiegebäude) — the verifier ROLE
//     finding the legal-spine surfaced. Verified: gesetze-im-internet.de/geg/
//     __8.html vs __10.html; corpus scripts/legal-corpus/federal.json. Only the
//     two GEG-citation tokens changed; SHARED / MUENCHEN / PERSONA /
//     TEMPLATE_SHARED are byte-unchanged. Length 48473 → 48475 (+2).
//   - 2026-06-08 Sprint 2 shared fact-capture directive: cdf3c625…daaf →
//     ed6f109e…d746 — INTENTIONAL, additive-only. Two new prompt sections were
//     ADDED (no existing line altered): (1) personaBehaviour.ts A.5/D.5 —
//     MUSS-PERSISTENZ directive instructing the persona, in EVERY state, to
//     persist a canonical `gebaeudeklasse` = "GK<N>" fact + each Sonderbau
//     trigger as `sonderbau_tatbestand_<x>` + an `anzahl_sonderbau_tatbestaende`
//     count (closes the thin-state fact-CAPTURE gap proven on the LSA Breiter
//     Weg T-02 walk). (2) federal.ts — § 19 Abs. 4 BauNVO GRZ garage-surcharge
//     rule (Tiefgarage → GRZ up to 0,8) + § 10 GEG Nichtwohngebäude note (KiTa
//     energy concept = § 10 GEG, NOT § 4 GEG). Corpus-verified: BauNVO § 19 +
//     GEG § 10 are primary-source; § 17 BauNVO / § 4 GEG are NOT in corpus and
//     were deliberately NOT cited. BAYERN_BLOCK + MUENCHEN_BLOCK byte-unchanged
//     → Bayern's existing capture behaviour is reinforced, not altered (verify
//     via a Bayern T-02 re-walk per Sprint 2 sign-off). Length 48475 → 49612.
//   - 2026-06-09 Four-class campaign Phase 3: ed6f109e…b9d746 → f9743ff3…0d75e —
//     INTENTIONAL re-baseline, TWO causes, both justified:
//     (a) BUGFIX to readBlock (below): its LAZY regex `([\s\S]*?)\`` terminated
//         at the FIRST backtick — which inside these template literals is an
//         ESCAPED inline-code backtick (\`areas_update\`, \`gebaeudeklasse\`, …).
//         So the SHA hashed only the prefix of each slice BEFORE its first
//         escaped backtick: for PERSONA_BEHAVIOURAL_RULES only 5191 of 15382
//         chars (~34%). Across all slices the hashed prefix was 49612 chars; the
//         TRUE full prefix is 91295 (~46% was NEVER hashed). The guard was BLIND
//         to the A.5/D.5 fact-persistence directive, B.1 Zitate-Disziplin, and
//         the tails of SHARED/BAYERN/MUENCHEN. This is why the Sprint-2 A.5/D.5
//         addition did NOT actually move the SHA — that +1137 came from the
//         federal.ts change (in a hashed region); the persona half was silently
//         invisible. Fixed to scan to the first UNESCAPED backtick → the SHA now
//         pins the FULL prefix.
//     (b) Phase 3 (CLASS 2) ADDED a "STRUKTUR- UND VERFAHRENS-FAKTEN" write-
//         directive to personaBehaviour.ts A.5/D.5 — instructs the persona to
//         persist the EXACT reader keys the resolvers read (eingriff_tragende_teile,
//         eingriff_aussenhuelle, denkmalschutz, ensembleschutz,
//         aenderung_aeussere_erscheinung, mk_gebietsart, bauvoranfrage_hard_blocker),
//         closing the CLASS-2 capture→read gap. EDGE-FN: needs a manual
//         `supabase functions deploy chat-turn`, and a LIVE walk to confirm the
//         persona actually emits the keys (the offline sweep cannot see live
//         emission).
//     NB the hash fingerprints raw SOURCE (escape sequences intact), as it
//     always has — not the evaluated runtime string; hashing the evaluated
//     constants is a recommended follow-up. Length 49612 → 91295.
//   - 2026-06-10 CLASS-2 capture fix (fix/class2-capture): f9743ff3…0d75e →
//     45aea17a…209231 — INTENTIONAL re-baseline. The MV live walk PROVED the
//     Phase-3 soft directive was insufficient (the persona wrote conclusions in
//     prose but emitted NONE of the 7 reader keys; layer diagnosis confirmed the
//     pipeline/composer pass an emitted key through, so the gap is purely model
//     emission). The STRUKTUR- UND VERFAHRENS-FAKTEN block in
//     personaBehaviour.ts A.5/D.5 was HARDENED into an explicit emission
//     CONTRACT, WITH an over-emission safety valve: emit a fact ONLY when the
//     conclusion is GROUNDED (correct quality tag — CALCULATED only when computed
//     from a stated fact, never for an unconfirmed value); a NEGATIVE (e.g.
//     denkmalschutz=false) needs the SAME grounding as a positive — if unknown,
//     emit NO key and raise an open question, because an ungrounded `false`
//     suppresses the conservative risk flag (composeRisks Bug 57/96: value===false
//     OR ASSUMED-negative both suppress Heritage) → "rich but wrong". The old
//     directive's "kein Denkmal → denkmalschutz=false" example was REMOVED (it was
//     the over-emission pressure). Length 91295 → 93181 (+1886). EDGE-FN: needs a
//     manual `supabase functions deploy chat-turn` + a fresh MV walk verifying
//     TWO things — keys now appear in PDF Key Data AND are correctly valued/
//     qualified (denkmalschutz not asserted false without grounding; procedure
//     still §63 CALCULATED, no CLASS-1 regression).
//   - 2026-06-11 T-05 sprint C5 (fix/t05-procedure-class): 45aea17a…209231 →
//     1ed863c6…105c86 — INTENTIONAL re-baseline, additive-only. The Sachsen/
//     Leipzig T-05 walk proved the persona persists its PROCEDURE VERDICT
//     under bespoke descriptive keys (abbruch_verfahrensfrei_sachsbo) the
//     resolver's key-scan can never read — the unwritten half of the capture
//     contract. A.5/D.5 gains the VERFAHRENS-VERDIKT bullet: persist the
//     verdict under the canonical `verfahren_indikation` key with a PINNED
//     value vocabulary („verfahrensfrei nach <§>" / „anzeigepflichtig nach
//     <§>" / „Genehmigungsfreistellung nach <§>" / „vereinfachtes Verfahren
//     nach <§>" / „reguläres Verfahren nach <§>" / „Bauvoranfrage empfohlen"),
//     LEGAL · CALCULATED-or-ASSUMED, update-in-place on verdict change. No
//     existing line altered; the frontend additionally gained a tolerant
//     bespoke-key fallback (resolveVerfahrensIndikation step 3) so live walks
//     are belt-and-braces. Length 93181 → 94271 (+1090). EDGE-FN: needs a
//     manual `supabase functions deploy chat-turn` + a T-05 walk verifying the
//     canonical key lands.
// ───────────────────────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

export const EXPECTED_BAYERN_SHA =
  '1ed863c63f66508048281ea40b2c2d7c3bcac00f179cc8aa3d37555427105c86'

const SLICE_SEPARATOR = '\n\n---\n\n'
const TAIL =
  '\n\n══════════════════════════════════════════════════════════════════════════' +
  '\nPROJEKTKONTEXT' +
  '\n══════════════════════════════════════════════════════════════════════════' +
  '\n\nEs folgt: Template-Kontext (T-XX), Locale-Hinweis, aktueller Projektzustand' +
  '\n(Grundstück, A/B/C-Bereiche, jüngste Fakten, Top-3-Empfehlungen, zuletzt' +
  '\ngestellte Fragen, jüngste Bauherreneingabe, letzte sprechende Fachperson).\n'

async function readBlock(relPath, exportName) {
  const content = await readFile(join(REPO_ROOT, relPath), 'utf-8')
  // Four-class campaign Phase 3 — BUGFIX. The previous regex
  //   export const NAME =\s*`([\s\S]*?)`
  // was LAZY and terminated at the FIRST backtick, which inside these template
  // literals is an ESCAPED inline-code backtick (\`areas_update\`, \`gebaeudeklasse\`,
  // …). It therefore extracted only the prefix BEFORE the first \` — for
  // PERSONA_BEHAVIOURAL_RULES that was 5191 of 15382 chars (~34%), leaving the
  // A.5/D.5 fact-persistence section, B.1 Zitate-Disziplin, and everything after
  // INVISIBLE to the Bayern SHA. The guard could not detect changes to ~66% of
  // the persona block. Fix: scan to the first UNESCAPED backtick (the real
  // template-literal close), preserving escaped backticks — so the SHA now pins
  // the FULL slice. (See the re-baseline note below for the resulting SHA move.)
  const decl = `export const ${exportName} =`
  const di = content.indexOf(decl)
  if (di === -1) throw new Error(`Could not find ${exportName} in ${relPath}`)
  const open = content.indexOf('`', di)
  if (open === -1) throw new Error(`Could not find opening backtick for ${exportName} in ${relPath}`)
  let out = ''
  for (let i = open + 1; i < content.length; i++) {
    const ch = content[i]
    if (ch === '\\') { out += ch + (content[i + 1] ?? ''); i++; continue } // keep escape pair
    if (ch === '`') return out // first UNESCAPED backtick = template close
    out += ch
  }
  throw new Error(`Unterminated template literal for ${exportName} in ${relPath}`)
}

/**
 * Compose the Bayern prefix string and return its SHA-256 hex digest.
 * Mirrors the runtime composeLegalContext('bayern') byte-for-byte.
 */
export async function computeBayernSha() {
  const SHARED   = await readBlock('src/legal/shared.ts',           'SHARED_BLOCK')
  const FEDERAL  = await readBlock('src/legal/federal.ts',          'FEDERAL_BLOCK')
  const BAYERN   = await readBlock('src/legal/bayern.ts',           'BAYERN_BLOCK')
  const MUE      = await readBlock('src/legal/muenchen.ts',         'MUENCHEN_BLOCK')
  const PERS     = await readBlock('src/legal/personaBehaviour.ts', 'PERSONA_BEHAVIOURAL_RULES')
  const TPLS     = await readBlock('src/legal/templates/shared.ts', 'TEMPLATE_SHARED_BLOCK')
  const composed = [SHARED, FEDERAL, BAYERN, MUE, PERS, TPLS].join(SLICE_SEPARATOR) + TAIL
  return {
    sha: createHash('sha256').update(composed).digest('hex'),
    length: composed.length,
  }
}
