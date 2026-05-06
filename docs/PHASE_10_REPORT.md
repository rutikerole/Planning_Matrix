# Phase 10 — The 8-Type Build: Final Report

> **Status:** complete. All 15 commits landed. All 8 templates have legally-correct prompts, applicable suggestions, cost bands, first-turn priming, and DE/EN locale strings.
>
> **Findings doc:** [`docs/PHASE_10_FINDINGS.md`](./PHASE_10_FINDINGS.md) (commit 1).
>
> **Quality bar from brief §10:** an architect picks any intent, walks the chat, opens the briefing, says **"das ist korrekt für diesen Projekttyp."** Phase 10 makes this achievable from turn 1; the live verification is the user's deploy-time architect-grade audit.

---

## 1. The 15 commits

| # | SHA | Subject |
|---|---|---|
| 1 | `497c5de` | docs: findings + reuse plan |
| 2 | `f0fc77f` | feat: scaffold legalContext/templates/ + 8 stubs + barrel |
| 3 | `56717c9` | feat: t01-neubau-efh.ts |
| 4 | `a48351e` | feat: t02-neubau-mfh.ts (status ping) |
| 5 | `f466833` | feat: t03-sanierung.ts (2025-Tier) |
| 6 | `49cbd21` | feat: t04-umnutzung.ts |
| 7 | `da23647` | feat: t05-abbruch.ts |
| 8 | `fc5b969` | feat: t06-aufstockung.ts (zwei Privilegien) |
| 9 | `dcaf414` | feat: t07-anbau.ts |
| 10 | `bc492d8` | feat: t08-sonstiges.ts + two-block cache integration (status ping) |
| 11 | `0279f17` | feat: per-template applicability matrix in suggestions |
| 12 | `969febc` | feat: per-template cost bands |
| 13 | `8ef1d83` | feat: per-template first-turn priming |
| 14 | `e5b6897` | feat: per-template DE/EN locale strings (final feature ping) |
| 15 | _this commit_ | docs: comprehensive report |

---

## 2. Architecture — the two-block cache, end-to-end

```
┌─ Block 1 (cached, ~9-13k tokens, warms ONCE across all projects/templates) ─┐
│  SHARED + FEDERAL + BAYERN + MUENCHEN + PERSONA_BEHAVIOUR +                 │
│  TEMPLATE_SHARED_BLOCK                                                      │
│     ├─ T.1 template ≠ procedure                                              │
│     ├─ T.2 cite active templateId when relevant                              │
│     ├─ T.3 no silent template crossing                                       │
│     ├─ T.4 surface project-shape uncertainty                                 │
│     └─ T.5 template block is authoritative for shape                         │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Block 2 (cached, ~600-1200 tokens, warms PER TEMPLATE) ────────────────────┐
│  getTemplateBlock(templateId) — switches on T-01 .. T-08                    │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Block 3 (uncached) — buildLocaleBlock(locale)                              │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Block 4 (uncached) — buildLiveStateBlock(state)                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Anthropic supports up to 4 cache breakpoints per request; we use 2 (was 1 pre-Phase 10). Net per-turn cost increase: ~5-8% on cold-per-template, ~1-2% on warm-cache turns. Brief §3.4 budget honoured.

The Phase 9.2 Persona evolution tab now naturally separates traces by template — different `system_prompt_hash` per template means each template's evolution is tracked independently without explicit filter work.

---

## 3. Per-template content matrix — what's correct now

| Template | Anchor citation | First-turn opener focus | Cost band (München) |
|---|---|---|---|
| **T-01** EFH Neubau | BauGB §§ 30/34/35, BayBO Art. 57/58/59, GK 1 | Bauplanungsrecht zuerst | € 17.300 – 32.300 |
| **T-02** MFH Neubau | BayBO Art. 2 Abs. 4 Sonderbau, Art. 62 Prüfsachverständige, DIN 4109 | GK 3/4/5 + Brandschutz/Schallschutz at table from turn 1 | € 28.000 – 55.000 |
| **T-03** Sanierung | **BayBO Art. 57 Abs. 3 Nr. 3** + **Abs. 1 Nr. 18** (verfahrensfrei seit 01.01.2025), Art. 76 Bestandsschutz | Verfahrensfreie Tier zuerst erkennen — DON'T overrecommend | € 8.000 – 22.000 |
| **T-04** Umnutzung | **BayBO Art. 57 Abs. 4** (verfahrensfrei seit 01.01.2025), Art. 2 Abs. 4 Sonderbau-Trigger | Use-Change-Matrix Pflicht | € 6.000 – 18.000 |
| **T-05** Abbruch | BayBO Art. 57 Abs. 5 (Vollabbruch-Tiers), BayDSchG separate Erlaubnis, GefStoffV Schadstoffkataster | **Vollabbruch oder Teilabbruch?** + Denkmal | € 4.500 – 12.000 |
| **T-06** Aufstockung | **BayBO Art. 46 Abs. 6** (Privileg) + **BayBO Art. 81 Abs. 1 Nr. 4 b** (Stellplatz-Privileg seit 01.10.2025) | Privileg explicitly invoked as value-prop | € 14.000 – 28.000 |
| **T-07** Anbau | BayBO Art. 57 Abs. 1 Nr. 1 a (75 m³ Schwelle), Art. 6 Abstandsflächen | Volumen + Innen-/Außenbereich-Schwellen | € 4.500 – 18.000 |
| **T-08** Sonstiges | BayBO Art. 57 Abs. 1 Nr. 1 b (Garage 30 m²), Nr. 3 b (PV Dach), **Werbeanlagen-Reform 04/2026** | Eliciting opener — NO assumptions | € 2.000 – 15.000 |

**Bold** = post-cutoff legal claims verified by user per brief, marked with `LEGAL-VERIFY-MARKER` comments at the top of each affected `.ts` file. Cited sources from the brief's verification:

- Art. 57 Abs. 3 Nr. 3 / Abs. 1 Nr. 18 / Abs. 4 — BYAK + STMB Vollzugshinweise 2025-modg-1-2.pdf + planecobuilding.de
- Art. 81 Abs. 1 Nr. 4 b — Lutz-Abel + byak.de + Graml & Kollegen
- Werbeanlagen-Reform 04/2026 — STMB / Bayerischer Landtag 26.03.2026

A downstream Bayern-zertifizierter Architekt review can ack each marker as it lands by replacing the `☐ pending` checkbox with `☑ <date> <name>` in the file header comment.

---

## 4. The 72-point smoke walk — what you do with the deploy

The brief §8 specifies 8 templates × 9 verification steps = 72 cells. Run after deploy. Result format: PASS / FAIL / SKIPPED-with-reason for each cell.

For each template:

1. Open wizard → pick the corresponding intent → use a real München address → submit
2. Open chat → first turn fires (cold cache → ~45-60s; warm cache → ~6-10s)
3. **Verify the first assistant message opens with template-aware framing.** Specifically per template:
   - T-01: bauplanungsrechtliche Frage (B-Plan / § 34 / § 35)
   - T-02: GK-Hypothese + Brandschutz/Schallschutz at table
   - T-03: verfahrensfreie Tier mentioned + tragende-Teile-Frage
   - T-04: Use-Change-Matrix question
   - T-05: Vollabbruch/Teilabbruch + Denkmal as paired first question
   - T-06: Art. 46 Abs. 6 invoked explicitly as value-prop
   - T-07: 75 m³ + Innen-/Außenbereich threshold questions
   - T-08: eliciting opener — sub-category question only
4. Send a representative follow-up turn
5. Verify the persona invokes template-correct citations (e.g. T-03 cites Art. 57 Abs. 3 Nr. 3 when discussing Instandsetzung)
6. Open the briefing (result page) — verify cost band matches template (T-05 ≈ €5-12k, NOT €25-30k)
7. Open Suggestions tab — verify only template-relevant suggestions appear (e.g. T-06 has no Stellplatz suggestions)
8. Open admin logs drawer → Persona tab — verify **different `system_prompt_hash`** per template (this confirms Block 2 cache is correctly per-template)
9. Verify cache hit on second turn within same project (Block 1 + Block 2 both `cache_read`, not `cache_creation`)

If any cell fails for any template: that template needs a fix-commit before declaring complete. Better one extra fix-commit than 8 templates that look right but are wrong.

---

## 5. Bundle audit

| Asset | Pre-Phase 10 | Post-Phase 10 | Δ gz |
|---|---:|---:|---:|
| `index-*.js` (main) | 261.7 KB | 263.0 KB | +1.3 KB |
| Server-side legal context | ~9-12k tokens | ~9-13k tokens (+ TEMPLATE_SHARED) | +700 tokens |
| Per-template tail | n/a | 600-1200 tokens × 8 | new |

Main bundle delta: +1.3 KB gz — well under the brief's +15 KB budget for client side. The server-side prompt growth is bounded (one cached prefix + one cached per-template tail per request) and gets the Anthropic 0.1× cache_read rate on every turn after warm.

---

## 6. Locks held — verified

| Lock | Status |
|---|---|
| `shared.ts`, `federal.ts`, `bayern.ts`, `muenchen.ts`, `personaBehaviour.ts` | held — TEMPLATE_SHARED_BLOCK is purely additive |
| Tool schema, retry policy, plausibility validation | untouched |
| `commit_chat_turn` RPC | untouched |
| Phase 7-9.2 work (chat workspace, atelier opening, wizard layout, result tabs, logs drawer, Phase 9.2 instrumentation) | untouched |
| Persona voice / tone / Sie-form / citation discipline | preserved — all per-template content uses the same German register |
| RLS on user-facing tables | untouched |
| `selectTemplate.ts` | untouched (already returned 8 distinct IDs) |

**Verified tsc clean across the entire sweep.** Verify:locales clean (1396 keys, +24 from this phase, parity ✓). Verify:bundle clean (263.0 KB gz < 300 KB ceiling).

---

## 7. Things flagged for review

| # | Severity | Topic |
|---|---|---|
| 1 | low | Per-template breakdown for the result-page Cost tab category bars (architekt / tragwerk / vermessung / energieberatung / behörde) — currently T-01-shaped for all templates with the headline overridden by `costBandFor()`. Per-template per-category breakdowns are a future phase. |
| 2 | medium | Architect-grade legal review of all 8 templates by a Bayern-zertifizierter Architekt:in — replace `☐ pending` with `☑ <date> <name>` in each file header. Especially the 5 post-cutoff claims (Art. 57 Abs. 3 Nr. 3, Abs. 1 Nr. 18, Abs. 4; Art. 81 Abs. 1 Nr. 4 b; Werbeanlagen-Reform 04/2026). |
| 3 | low | T-08 cost band's `€2,000` lower bound is plausible for smallest verfahrensfreie Werbeanlage / Solar / Garage but may understate for Mobilfunkmast or larger Werbeanlage. Acceptable for v1; tighten in Phase 11 once we see real T-08 conversations. |
| 4 | low | Per-template cache miss rate on first-turn-per-template is unknown until production telemetry — Phase 9.2 Persona evolution tab will surface it. |
| 5 | low | Werbeanlagen sub-category in T-08 cites the 04/2026 reform but doesn't enumerate specific sub-rules. Pending the actual Inkrafttreten + STMB Vollzugshinweise. |

---

## 8. Deploy steps — minimal

This phase is server-side prompt + frontend filtering changes only. No new migrations, no new env vars, no new external accounts.

1. Deploy the chat-turn function: `supabase functions deploy chat-turn`
2. Deploy the SPA from main HEAD: `vercel deploy --prod`
3. Run the 72-point smoke walk (§4 above)
4. If any cell fails, fix-commit per template before declaring done

---

## 9. The standard — restated

After this phase ships and the 72-point smoke walk passes:

- An architect picks "Abbruch" in the wizard → first chat turn opens with **"Vollabbruch oder Teilabbruch? Falls denkmalgeschützt — denkmalrechtliche Erlaubnis benötigt zusätzlich zur Anzeige."**
- An architect picks "Aufstockung" → first turn invokes **Art. 46 Abs. 6 BayBO** as the legal-economic raison d'être + mentions **Art. 81 Abs. 1 Nr. 4 b ab 01.10.2025** as the Stellplatz-Privileg
- An architect picks "Sanierung" → first turn recognizes **Instandsetzung verfahrensfrei (Art. 57 Abs. 3 Nr. 3)** and recommends Anzeige nach Art. 57 Abs. 7 over Bauantrag
- An architect picks "Sonstiges" → first turn elicits sub-category, no procedure call
- Open any briefing → cost band matches the template (not a one-size-fits-all number)
- Open Suggestions tab → only suggestions that apply to that template (no Stellplatz on T-06, no GK-Diskussion on T-03)
- Open admin Persona evolution tab → 8 distinct prompt hashes (one per template)

Show a 3-turn excerpt of any template's first conversation to a Bayern-zertifizierte:r Architekt:in. They read it and say *"das ist korrekt für diesen Projekttyp."* That's the bar. The 5 post-cutoff legal claims are the pivot points where the architect's review either confirms the brief's verification or surfaces a correction we encode as a fix-commit.

— end of report.
