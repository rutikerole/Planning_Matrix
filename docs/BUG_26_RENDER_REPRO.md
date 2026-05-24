# BUG 26 — PDF RENDER-TIME REPRODUCTION (`§ 65 BauO {CODE}` fabrication)

**Repo:** `/Users/rutikerole/Planning_Matrix` · **HEAD:** `c374ef7` · **Date:** 2026-05-24 · **Mode:** READ-ONLY, no execution. Bayern SHA MATCH preserved.
**Trigger:** NON_BAYERN_PROD_FORENSICS §6 reframed Bug 26 as render-time (not chat-state). This probe statically confirms when the fabrication fires and whether any test catches it.

## VERDICT
- **Reproducibility: CONFIRMED-WOULD-FIRE.** A stub-state project with no hard blocker (e.g. Sachsen × T-01, plain residential plot) deterministically reaches `resolveProcedure.ts:294` and emits `§ 65 BauO SACHSEN` into the PDF. Static path is airtight (no LLM nondeterminism in this branch).
- **Test coverage: UNREACHED.** No automated test/smoke/CI gate exercises the generic branch for a stub state without a hard blocker. The one stub-state fixture (Berlin) is deliberately a hard-blocker case that short-circuits *before* line 294.

---

## 1. STATIC TRACE — what reaches `resolveProcedure.ts:294`, and the branch order

`resolveProcedure(c: ProcedureCase)` (`resolveProcedure.ts:239`) decides in this order:

1. **`detectHardBlockers(c)` (`:242`)** — if any blocker, return `bauvoranfrage` with an honest, *non-fabricated* citation (`:248-253`: nrw→`§ 71 BauO NRW`, bayern→`BayBO Art. 71`, else `'state-specific Voranfrage/Vorbescheid §'`). Blockers fire on (`:130-168`): `mk_gebietsart` ∨ `denkmalschutz` ∨ `sonderbau_scope` ∨ `bauvoranfrage_hard_blocker`.
2. **`nrw` × `sanierung`** → `resolveNrwSanierung` (`:268`) — real NRW citations.
3. **`nrw` × `neubau`** → `§ 64 BauO NRW` (`:271-289`) — real.
4. **GENERIC (everything else, `:291-309`)** → `kind:'standard'`, **`citation: \`§ 65 BauO ${c.bundesland.toUpperCase()}\``** (`:294`), `confidence:'ASSUMED'`, caveat "Resolver deckt diesen Fall noch nicht ab".

**The inputs** come from `exportPdf.ts:353-374`, built via `factBool(key)` / `factNum(key)` over the project's `state.facts`:
- `intent = intentFromTemplate(state.templateId ?? 'T-03')` (`:354`) — T-01/T-02→neubau, T-03→sanierung, …, T-08/default→sonstiges (`resolveProcedure.ts:56-75`).
- `bundesland = (project.bundesland ?? 'nrw')` (`:355`) — note the `?? 'nrw'` default (FULL_GERMANY_AUDIT Bug 37).
- **Every hard-blocker flag defaults to `false`** unless the persona explicitly emitted that fact: `denkmalschutz` (`:360`), `ensembleschutz` (`:361`), `mk_gebietsart` (`:371`), `bauvoranfrage_hard_blocker` (`:372`), `sonderbau_scope` (`:373`).

**Therefore the generic branch (line 294) executes whenever:** `bundesland ∉ {nrw with neubau/sanierung}` **AND** the persona set none of the four blocker facts. For all 11 stub states that is the *default* path for any ordinary project. The fabricated citation is then threaded into **three** PDF surfaces — Areas-B body, Procedure card, Key-Data "Verfahren Indikation" row (`exportPdf.ts:375` decision reused across renderers; the module header `resolveProcedure.ts:6-13` documents the single-source-three-renderers design).

### Per-stub-state condition (when does `§ 65 BauO {CODE}` fire vs get masked?)

| State | `§ 65 BauO {CODE}` would render as | Fires by default? | Masked when… |
|---|---|---|---|
| sachsen | `§ 65 BauO SACHSEN` (real: SächsBO) | **yes** | persona sets Denkmal/MK/Sonderbau/blocker |
| sachsen-anhalt | `§ 65 BauO SACHSEN-ANHALT` (real: BauO LSA) | yes | ″ |
| thueringen | `§ 65 BauO THUERINGEN` (real: ThürBO) | yes | ″ |
| rlp | `§ 65 BauO RLP` (real: LBauO RLP) | yes | ″ |
| saarland | `§ 65 BauO SAARLAND` (real: LBO Saarland) | yes | ″ |
| sh | `§ 65 BauO SH` (real: LBO SH) | yes | ″ |
| mv | `§ 65 BauO MV` (real: LBO M-V) | yes | ″ |
| brandenburg | `§ 65 BauO BRANDENBURG` (real: BbgBO) | yes | ″ |
| berlin | `§ 65 BauO BERLIN` (real: BauO Bln) | yes | heritage/MK plot trips a blocker |
| hamburg | `§ 65 BauO HAMBURG` (real: HBauO) | yes | ″ |
| bremen | `§ 65 BauO BREMEN` (real: BremLBO) | yes | ″ |

Every rendered citation is **doubly wrong**: the abbreviation `BauO {CODE}` is not the state's actual code name, and the uppercased registry slug (`SACHSEN-ANHALT`, `RLP`, `MV`) is not how any statute is cited. The Stadtstaaten on landmark/heritage sites (Pariser Platz, Dresden Theaterplatz) tend to trip Denkmal/MK blockers and dodge the branch — which is exactly why the bug stayed invisible in the prod dump (NON_BAYERN_PROD_FORENSICS §5). A plain non-heritage residential plot (suburban Leipzig/Dresden, Magdeburg, Erfurt, Schwerin, Kiel…) does **not** trip a blocker → fires.

---

## 2. SYNTHETIC FIXTURE (thought-experiment template — docs only, NOT executed, NOT in src/test)

Minimal payload that deterministically reaches `resolveProcedure.ts:294` → `§ 65 BauO SACHSEN`. Mirrors the `test/fixtures/*.json` shape; **do not** place in `test/` without intending it as a regression test (and if you do, it should assert the *fixed* output, not the buggy one).

```jsonc
// docs-only fixture template — Sachsen × T-01, no hard blocker
{
  "project": {
    "id": "00000000-0000-0000-0000-0000000026bug",
    "bundesland": "sachsen",          // → not nrw → skips nrw branches
    "city": null,                      // Stadtstaat/non-bayern → null (correct)
    "template_id": "T-01",             // intentFromTemplate → 'neubau'
    "intent": "neubau_einfamilienhaus",
    "has_plot": true,
    "plot_address": "Lindenstraße 12, 04317 Leipzig",  // plain residential, no heritage
    "name": "EFH-Neubau Leipzig",
    "status": "in_progress",
    "state": {
      "schemaVersion": 1,
      "templateId": "T-01",
      "areas": { "A": { "state": "ACTIVE" }, "B": { "state": "ACTIVE" }, "C": { "state": "ACTIVE" } },
      "facts": [
        { "key": "bundesland", "value": "Sachsen", "qualifier": { "source": "CLIENT", "quality": "DECIDED" } },
        { "key": "vorhaben_typ", "value": "Neubau Einfamilienhaus", "qualifier": { "source": "CLIENT", "quality": "DECIDED" } }
        // NB: NO denkmalschutz / mk_gebietsart / sonderbau_scope / bauvoranfrage_hard_blocker fact
        //     → factBool() returns false for all four → detectHardBlockers() = []
      ],
      "procedures": [], "documents": [], "roles": [], "recommendations": []
    }
  },
  "messages": [], "events": []
}
```

**Predicted deterministic output** (no LLM in this path): `procedureCase = { intent:'neubau', bundesland:'sachsen', denkmalschutz:false, mk_gebietsart:false, sonderbau_scope:false, bauvoranfrage_hard_blocker:false, … }` → `detectHardBlockers` = `[]` → not nrw → generic branch → **`citation: "§ 65 BauO SACHSEN"`, `kind:'standard'`, `confidence:'ASSUMED'`** → rendered on PDF Areas-B body + Procedure card + Key-Data Verfahren row. (To actually render, one would run `smoke:pdf-text` against this fixture — **not done here** per the no-execution rule.)

---

## 3. EXISTING TEST COVERAGE — why nothing catches it

| Harness | What it covers | Hits line 294 for a stub? |
|---|---|---|
| `scripts/smoke-pdf-text.mts` (the PDF "5th gate") | Renders `nrw-t03-koenigsallee.json` (default) + references `berlin-t01-pariser-platz.json` (`:61,448`). Asserts `§ 62 BauO NRW` ×3, no `§ 64 … REQUIRED`, etc. | **No.** NRW T-03 → `resolveNrwSanierung` (real). Berlin fixture carries **all four** blocker facts (`mk_gebietsart`, `denkmalschutz`, `ensembleschutz`, `bauvoranfrage_hard_blocker` — confirmed by grep) → short-circuits to `bauvoranfrage` at `:243`, never reaches `:294`. |
| `scripts/smokeWalk.mjs` | `:2553` asserts `resolveProcedure(c: ProcedureCase)` is **exported** (source grep). `:3815` asserts NRW citations `§ 62/63/64/65/67 BauO NRW` appear. | **No.** Source-presence + NRW-only string assertions; never renders a stub-state PDF. |
| `scripts/smoke-walk-matrix.mjs` | State×template **persona-transcript** matrix incl. `sachsen×T-01` (Dresden) + `berlin×T-01`; asserts the chat `expectedAnchor` (e.g. `/Vorbereitung|Sachsen-spezifisch/`). | **No.** Tests the **persona chat output**, not the PDF deterministic resolver; it's a heavy live harness (creates projects + calls chat-turn), **not a CI gate**, and never invokes `resolveProcedure`/PDF render. |

**Why the Berlin fixture didn't catch it:** it was authored as the *hard-blocker* regression case (Bug E / the v1.0.20 "Berlin × T-01 with two blockers" fix, `resolveProcedure.ts:230-231`). Carrying all four blocker facts is exactly what makes it dodge line 294. So the only stub-state PDF fixture in the repo is structurally incapable of exercising Bug 26.

**Conclusion:** Bug 26's generic branch is **unreached by automated tests for any stub state** in the no-blocker scenario. It is statically guaranteed to fire there; nothing guards it.

---

## 4. MINIMAL FIX SHAPE (no code in this probe)

**Option A — per-state article lookup.** Replace `§ 65 BauO ${CODE}` with the real procedure citation from the localization pack. *For:* substantive states get a correct §. *Against:* the 11 stub states **have no real article numbers** in `stateLocalization.ts` (their `procedure.*.citation` is empty by design) — so pure Option A cannot produce a citation for them; it would either crash or fall back, so it is insufficient alone.

**Option B — UNKNOWN qualifier + honest "in Vorbereitung" string.** Replace the fabricated § with a non-citation string (e.g. `'landesrechtliche Verfahrensvorschrift — Detail-Spezifika in Vorbereitung'` / `'state procedure provision — details being finalized'`) and keep `confidence:'ASSUMED'` + the existing caveat. *For:* never ships a wrong citation; matches the state files' honest stub framing and the Vorläufig posture. *Against:* substantive non-NRW states (BW/Hessen/Niedersachsen) would *lose* the real § they could have shown.

**RECOMMENDED — the hybrid that already exists for the result tab.** Drive the generic branch off `getStateLocalization(bundesland)` and compose exactly like `deriveBaselineProcedure.ts:63-68`: `citation ? \`${name} · ${citation}\` : name` — i.e. emit the **real §** when the localization pack has one (substantive states), and the **honest name with no fabricated §** when it doesn't (the 11 stubs). Rationale:
1. It eliminates the fabrication for stubs (Option B's safety) **and** preserves real citations for substantive states (Option A's value) — strictly dominates either pure option.
2. It **unifies the PDF resolver with the result-tab resolver**, which already uses `getStateLocalization` and is therefore state-correct today (`deriveBaselineProcedure.ts:57`). This is the root cause of the PDF-vs-tab divergence FULL_GERMANY_AUDIT flagged: two resolvers, one fabricates. One source closes the gap on both surfaces.
3. Minimal blast radius: a single branch in `resolveProcedure.ts:291-309` (plus an import of `getStateLocalization`), no schema/prompt/Bayern-SHA impact. Bayern keeps its existing `detectProcedure` path (unchanged), so the SHA invariant is untouched.

**Regression guard to add alongside the fix:** a `sachsen-t01-leipzig.json` (or similar non-blocker stub) fixture in `test/fixtures/` + a `smoke:pdf-text` assertion that the rendered PDF contains **no** `BauO SACHSEN`/`BauO {UPPERCASE}` token — the exact gate that is missing today.

*Bayern SHA verified MATCH. No production code modified; the fixture above is an illustrative template inside this doc, not a file in src/ or test/.*
