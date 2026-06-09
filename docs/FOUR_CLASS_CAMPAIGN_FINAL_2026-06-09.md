# Four-Class Campaign — Final Report (2026-06-09)

Branches: `fix/four-class-campaign` (Phases 0/1/1b/2/4/3 — **merged + deployed**) and
`fix/campaign-final` (Phases 5a/5b/5c-frontend + **6a gate wired** + this report —
**NOT merged, NOT deployed**).
Bayern SHA: re-baselined `ed6f109e…b9d746 → f9743ff3…0d75e` (full-prefix; see §SHA).
Updated 2026-06-09 with the **MV live walk** result (Rostock T-03) — see §MV-WALK.

## Board: 83 RED · 16 YELLOW → **0 RED · 2 YELLOW**

```
ORIGINAL (Phase 0)                 FINAL
all states ~123·/1234         →    all states ··3·   (only CLASS 3 latent, ×2)
```
`audit:four-class`: **0 RED · 2 YELLOW** (CLASS 1:0 · 2:0-orphans+1-INFO · 3:2 · 4:0-RED).
The 2 residual YELLOW are CLASS-3 *inherent/low-priority*, documented below.

## §MV-WALK — Mecklenburg-Vorpommern live walk (Rostock · Lange Straße 14 · T-03 renovation)

The walk briefing (Overview + 5 tabs + read-only `.md` + 12-page PDF) was reviewed.
It is the FIRST live evidence against the Phase-3 CLASS-2 directive (deployed chat-turn
v13). The PDF **Key Data (Section 09)** is the ground truth for what the persona emits:

| Field | Value | Qualifier |
|---|---|---|
| Street / House / Postal / City | (address) | CLIENT · DECIDED |
| Procedure indication | Simplified building permit · § 63 LBauO M-V | LEGAL · CALCULATED |
| Building class | "eaves height not recorded; architect to confirm" | LEGAL · ASSUMED |
| Plot · outside-München acknowledged | true | CLIENT · DECIDED |

**CLASS-2 verdict = the persona does NOT emit the 7 contract reader keys** —
`eingriff_tragende_teile`, `eingriff_aussenhuelle`, `aenderung_aeussere_erscheinung`,
`denkmalschutz`, `ensembleschutz`, `mk_gebietsart`, `bauvoranfrage_hard_blocker`
(nor `gebaeudeklasse`). NONE appear as facts. Yet the persona ASSERTS them in **prose**:
Area B *"Gebäudeklasse 2 established, § 63 procedure confirmed, structural and energy
roles identified"*; Area C *"No Denkmal, no ensemble, GEG retrofit under § 48 GEG"*.
The Phase-3 write-directive did not produce the keys in this walk.

**BUT the failure mode is SAFE, not silent-wrong** — which is the campaign's acceptance
bar. Everywhere a key is missing, the frontend resolvers degrade to honest deferral /
conservative flag, never to a fabricated confident answer:
- **GK** → `deriveGebaeudeklasse` returns honest "eaves height not recorded; architect to
  confirm" (it correctly does NOT trust the prose "GK 2 established", which is itself
  ungrounded). The PDF showed this; **At-a-Glance was the lone outlier showing a bare
  "—"** → fixed as 5c-frontend below.
- **Denkmal/ensemble** → the Risk Register conservatively flags "Heritage-protection
  requirement" to verify. For a building in Rostock's historic core this conservative
  flag is the *correct* posture; the persona's prose "no Denkmal" is the overconfident
  claim, and the frontend rightly does not act on it.
- **Procedure** → simplified § 63 LBauO M-V tagged "likely / preliminary".

**Implication for the gate (6a):** the offline sweep CANNOT see live emission, so
"CLASS 2 = 0 orphans" means *every reader key has a safe default* (resolver robustness),
NOT *keys are captured*. The walk confirms the safe-default path works end-to-end. The
gate is therefore wired to guard **resolver robustness**, with the **CLASS-2 live-capture
gap kept as an explicit advisory INFO** (printed on every gated build) — not silently
treated as resolved. Closing it for real is the edge-fn item in §CLASS-2-OPEN below.

**5b timeline win VALIDATED by the walk:** the live Executive Read read "timeline ~6
months" while At-a-Glance and the PDF read "~4–6 months" — exactly the outlier 5b unifies
(not yet live; on this branch).

## Per-phase ledger

| Phase | Class | What | Side / redeploy | SHA |
|---|---|---|---|---|
| 0 | — | re-ground; confirmed 83 RED·16 YELLOW; corrected framing (CLASS 1 = 78 not 80; NRW-neubau already clean) | — | held |
| 1 `ef4c6ef` | 1+3 | **structural verdict honoring** in resolveProcedure (§-comparison vs the state's free/simplified/regular §§) — **CLASS 1 78→0** | frontend / no | held |
| 1b `ac17e14` | 1 | honor a *contradicting* (regular/free) verdict § over the simplified default (NRW-neubau/sanierung/umnutzung) — sweep blind-spot | frontend / no | held |
| 2 `84cfed5` | 3 | statute regex (`§30/34`, no-space), non-string fact coercion, English verdict variants — **CLASS 3 8→3** | frontend / no | held |
| 4 `e29d0be` | 4 | **acknowledged-out-of-corpus registry** + gate hardening (unregistered out-of-corpus now fails) — **CLASS 4 RED 5→0** | build-time / no | held |
| 3 `45377c3` | 2 | persona **write-directive** for the exact reader keys + **fixed the SHA-guard blind spot** | **EDGE-FN / YES (deployed v13)** | **re-baselined** |
| 5a `62b2d14` | 3 | detectProcedure reads the structured kind (title), not rationale text — **CLASS 3 3→2** | frontend / no | held (new) |
| 5b `075074e` | — | unify the timeline on one procedure-aware source (Executive Read was the flat-"6mo" outlier) | frontend / no | held (new) |
| 5c-fe | 1 | **At-a-Glance GK** null case routes through the SAME `formatGebaeudeklasseValue` the PDF renders (MV walk: At-a-Glance "—" vs PDF honest sentence for identical `derivedKlasse`) + smoke guard | frontend / no | held |
| 6a | 2/3 | **wire `audit:four-class --gate` into prebuild** — RED + new-YELLOW block; 2 CLASS-3 YELLOW allow-listed; CLASS-2 INFO advisory; gate proven non-vacuous | build-time / no | held |

## 🔧 SHA-guard blind spot — discovered, fixed, re-baselined (Phase 3)

`bayernSha.mjs` `readBlock` used a **lazy** regex that terminated at the **first escaped
backtick**, so it hashed only each slice's prefix before its first `` \`inline-code\` ``:
`PERSONA_BEHAVIOURAL_RULES` = **5191 of 15382 chars (~34%)**; the full prefix is **91295**,
of which the old hash covered only **49612 (~54%)**. The guard was blind to the A.5/D.5
fact-persistence directive, B.1, and the tails of SHARED/BAYERN/MUENCHEN — which is why the
Phase-3 persona edit didn't move the old SHA, and why Sprint-2's A.5/D.5 addition didn't
either. Fixed `readBlock` to scan to the first *unescaped* backtick; re-baselined
`ed6f109e → f9743ff3` (49612 → 91295 chars), logged in `bayernSha.mjs`. The guard now pins
the **full** Bayern prompt.

## Phase 5c (DONE-fe), 5d (deferred), 6b (deferred) — outcomes

- **5c — At-a-Glance GK consistency: FIXED (frontend, deterministic).** The MV walk
  surfaced a concrete two-sources-of-truth split: for the identical `derivedKlasse`
  (klasse=null), the PDF Key Data rendered `formatGebaeudeklasseValue`'s honest sentence
  while **At-a-Glance rendered a bare "—"**. At-a-Glance now routes the null case through
  the SAME `formatGebaeudeklasseValue`, so both surfaces show one honest-deferral string
  (truncated in the narrow row, full text in the `title` hover). Pinned by a smokeWalk
  source guard (WIN 3b). The underlying **GK *capture* stays as-is by design** — the honest
  "not recorded; architect to confirm" is correct; a guessed GK is worse, and the persona's
  prose "GK 2 established" is itself ungrounded. Capturing GK for real is an edge-fn
  directive (§CLASS-2-OPEN), not a frontend fix.
- **5d — edge-fn retry-budget-vs-wall (3×50s ≈ 158s > ~150s wall): DEFERRED, no recurrence.**
  No telemetry shows this recurring, and the MV walk **completed cleanly** (83% confidence,
  full 12-page briefing rendered — no timeout). Per your gate, not changed. If telemetry
  later shows timeouts hitting the wall, the fix is `MAX_ATTEMPTS=2` or a lower per-attempt
  timeout in `anthropic.ts`/`retryPolicy.ts` (edge-fn, redeploy).
- **6b — evaluated-runtime SHA: DEFERRED (recommend, needs sign-off).** The Phase-3
  `readBlock` fix already made the source hash cover the **full** 91295-char prefix, so the
  guard now catches every source edit to the Bayern prefix — the real blind spot is closed.
  Hashing the *evaluated* `composeLegalContext('bayern')` would be the byte-true fingerprint,
  but it (a) requires importing the legal module graph into the gate (the guard deliberately
  uses text-extraction to avoid import side-effects/env coupling) and (b) forces its own new
  baseline. That is exactly the Bayern-SHA re-baseline class you gate explicitly — so I did
  **not** force it. Marginal benefit over the now-correct source hash; **deferred pending your
  go.** (If you want it, it lands as an *additive* companion hash with its own constant, leaving
  the working source guard intact — no re-baseline of `f9743ff3`.)

## §CLASS-2-OPEN — the one real open item (edge-fn; needs deploy + re-walk)

The MV walk proves the Phase-3 prose directive is **insufficient** to make the persona emit
the contract keys. This cannot be fixed or verified offline. Recommended next step (your
go — it moves the Bayern SHA and needs a fresh walk to confirm):
1. Strengthen `PERSONA_BEHAVIOURAL_RULES` A.5/D.5 from a soft "emit these keys" into a
   **hard structured-fact emission contract**: an explicit checklist the persona MUST write
   as boolean/enum facts before composing area prose (the prose already states the
   conclusions — the gap is purely "write the fact too"). Consider a worked example in the
   directive showing `eingriff_tragende_teile: true` alongside the sentence.
2. This edits the persona prefix → **Bayern SHA re-baseline** (justify + log in
   `bayernSha.mjs`), then `supabase functions deploy chat-turn`, then a fresh walk to confirm
   the keys land in PDF Key Data. **I did not do this** — an unverifiable SHA-moving edge-fn
   edit in one shot is exactly what your gates protect against; honest deferral beats false
   completeness. Until then the system is SAFE (honest deferral), just not RICH.

## Phase 6a — DONE (wired; CLASS-2 kept honest)

`npm run audit:four-class:gate` (= the sweep with `--gate`) is now wired into `prebuild`.
Gate semantics, verified this run:
- **RED always blocks.** **YELLOW blocks unless `${cls}::${surface}` is in `GATE_ALLOWLIST`**
  (the 2 accepted CLASS-3 inherent edges). **INFO never blocks** — it is printed as advisory.
- **Proven non-vacuous:** dropping one allow-list entry → `GATE FAIL`, exit 1; restored → exit 0.
- **Current result:** `0 RED · 0 new YELLOW (accepted: 2, advisory INFO: 7)` → PASS.
- **CLASS-2 stays honest:** the live-emission caveat is INFO BY DESIGN. The gate guards
  resolver ROBUSTNESS (every reader key has a safe default), NOT live capture — so it does
  **not** falsely declare CLASS 2 resolved. Closing live capture is §CLASS-2-OPEN.

## What STILL needs a human walk (the sweep's permanent blind spots — be explicit)

- **CLASS 2 live emission — WALKED 2026-06-09: the persona does NOT emit the keys** (see
  §MV-WALK). The Phase-3 directive (chat-turn v13) is insufficient. The frontend degrades to
  honest deferral (SAFE), so the gate guards resolver robustness and keeps this as advisory
  INFO; the real fix is the edge-fn directive in §CLASS-2-OPEN. Each future state walk should
  re-check whether the keys land in PDF Key Data.
- **Corpus-correct ≠ concept-correct.** CLASS 4 confirms a § exists; it cannot judge whether
  it's the *right* § for the concept (that's `verify:concept-citations` + a human).
- **Out-of-corpus §§ are acknowledged, not checked.** BayDSchG/StPlS/BauuntPrüfVO/DSchG/LBOVVO
  are registered + justified but not existence-checkable until ingested (deferred).
- **PDF/React rendering** isn't pixel-tested by the sweep; `smoke:pdf-matrix` + a walk own that.

## Remaining deferred / accepted (with reasoning)

- **CLASS 3 ×2 (the 2 residual YELLOW):** (a) `extractProcedureCitation` no-space edge ("§62BauO")
  — rare; the §-comparison handles the common spaced forms. (b) `roleFunction` title-keyword
  classification — *inherent* to title-based dedup (an unrecognised synonym falls back to
  *distinct*, which is safe). Both accepted, not bugs.
- **PDF procedure-aware timeline** (5b follow-up) — the PDF duration string + Gantt are
  procedure-agnostic (common-case-consistent); a ~10-line threading of the helper figure.
- **Out-of-corpus ingestion** (CLASS 4) — own data sprint.
- **5c GK capture, 5d retry-budget, 6b evaluated-SHA** — above.

## Gates (every phase, all green; final on `fix/campaign-final`, re-run 2026-06-09)
tsc -b ✓ · npm run build ✓ (bundle **293.8/300 gz**, prebuild now runs the gate) ·
verify:citations:strict ✓ · audit:allowlist ✓ · verify:concept-citations ✓ ·
smoke:citations (smokeWalk, incl. WIN 3b) ✓ · smoke:pdf-matrix 16/16 · smoke:pdf-text 386/0 ·
smoke:thin-state 139/0 · smoke:cost-procedure 9/0 ·
**audit:four-class:gate → 0 RED · 0 new YELLOW · 2 accepted · 7 INFO → PASS** (proven non-vacuous).
**Bayern SHA `f9743ff3` MATCH start AND end of every phase** (5c-fe/6a are frontend + build-time;
no persona edit → SHA untouched).
