# Phase 12 Scope — Top-4 State Persona Content

**Goal.** Replace the stub-grade systemBlock for **NRW / BW /
Niedersachsen / Hessen** with persona-grade content matching the
depth `src/legal/bayern.ts` already carries (~200–250 LOC each).

**Frame.** Phase 11 was structural; the Bayern SHA gate proved
correctness algorithmically. **Phase 12 is content.** There is no
SHA-equivalent gate — substantive correctness is human-reviewed.
Single bad citation = single bad commit. The discipline below
exists to keep that from happening.

---

## Per-state primary sources

Every TYPISCHE / VERBOTENE Zitate citation in Phase 12 must trace
to one of these. Inline-cite the source in the commit message.
No Wikipedia, no SEO blog content, no "according to general
practice."

> **Confidence ratings here are advisory. Per-state fetch dry-runs
> supersede these — when the dry-run finds a discrepancy, the
> dry-run wins.** See `docs/PHASE_12_HESSEN_FETCH_DRYRUN.md` for
> the pattern; one dry-run lands per state before content writing.

| State | LBO consolidated text | Architektenkammer guidance | Verfahrens-/Ausführungs-VV | Confidence |
| --- | --- | --- | --- | --- |
| NRW | `recht.nrw.de` — BauO NRW (Fassung 2018) **+ 2024-Novelle** consolidated | `aknw.de` Bauherreninformation; IK-Bau NRW Bauvorlage-Richtlinien | VV TB NRW (Technische Baubestimmungen); Stellplatzverordnung NRW | **HIGH** for the 2018 base; **MEDIUM** for 2024-Novelle (verify changed articles via consolidated text) |
| BW | `landesrecht-bw.de` — LBO BW **+ Modernisierungsnovelle 2023** | `akbw.de` Bauherrenmappe | LBOAVO (Allgemeine Ausführungsverordnung); LBOVVO (Verfahrensverordnung) | **MEDIUM** — the 2023 Modernisierung needs Drucksache 17/4334 (Landtag) verification; AKBW summary alone is not sufficient |
| NS | `voris.niedersachsen.de` — NBauO 2012 + 2022-Novelle | `aknds.de` Bauherreninformation; IKN | DVO-NBauO; AVV-NBauO | **HIGH** — voris is well-structured, NBauO is stable |
| HE | `ingkh.de` (Synopse + consolidated PDF) — HBO 2018 **+ Drittes Änderungsgesetz / Baupaket I, in Kraft 14.10.2025 (GVBl. 2025 Nr. 66)** | `akh.de/beratung/bauen-mit-architekten` Bauherreninformation; IngKH | HBauVwV (Hessische Bauaufsichts-VV) — **omit citations from systemBlock unless a reachable post-Baupaket-I version surfaces mid-commit** | **MEDIUM-HIGH** for HBO via IngKH (state portal `rv.hessenrecht.hessen.de` is JS-rendered SPA, unreachable via server-side fetch); **LOW** for HBauVwV (same SPA limitation, no IngKH-equivalent identified) — see PHASE_12_HESSEN_FETCH_DRYRUN.md |

---

## Per-state content scope (~200–250 LOC each)

Each state's `systemBlock` expands from the commit-2 stub to include:

1. **Bundesland-Disziplin block** — analogous to `bayern.ts:12-105`. Wrong-citation anchors (✗ FALSCHE / ✓ KORREKTE) for that state's LBO. ~80 LOC.
2. **Per-template TYPISCHE / VERBOTENE blocks** — ~25 LOC per template × 8 templates = ~200 LOC. **Reuse where honest:** T-01 EFH-Neubau in NRW vs BW will share most logic; the divergent paragraphs are what gets state-specific text. Don't pad.
3. **Verfahrenstypen detail** — analogous to `bayern.ts:164-258`. What the state's verfahrensfrei / vereinfacht / regulär verfahren cover, with article-and-Absatz precision. ~60 LOC.
4. **Architektenkammer + Vermessung detail** — extend the commit-2 reference card with full addresses + Bauherrenservice URL + canonical Vermessungsstellen language (NRW: ÖbVI; BW: ÖbVI; NS: ÖbVI; HE: ÖbVI — all four states converge here, unlike Bayern's ADBV).
5. **State-specific Modernisierungsstand** — what changed and when, what the Bauherr should know about transition periods.
6. **State-specific Sonderbau-Schwellen** — flagged blocker below.

`allowedCitations` extends from ~10 stub entries to ~25–35 per
state (every canonical article touched in the new content).

---

## Per-state acceptance criteria

Per state X:

- **Source citations.** Commit message lists every primary source used (file path, paragraph, retrieval date). Format: `recht.nrw.de retrieved 2026-MM-DD: BauO NRW § 5 (Abstandsflächen)`. If a paragraph couldn't be sourced, the commit must say so explicitly.
- **smokeWalk fixtures.** Add state-X positive fixtures (5+ canonical citations don't flag in `active=X`) and state-X negative fixtures (Bayern + 14 other LBO citations flag in `active=X`).
- **Structural assertion.** smokeWalk asserts state-X systemBlock contains TYPISCHE / VERBOTENE blocks for all 8 templates (regex on the file).
- **Bayern SHA gate.** Green. The frozen baseline `b18d3f7f...3471` must remain unchanged across every Phase 12 commit. Phase 12 touches state-X content only; Bayern is untouchable.
- **Human read-through by Rutik before the next state lands.** This is the substitute for Phase 11's automated SHA proof.

---

## Commit cadence

**Order: Hessen → Niedersachsen → NRW → BW.** Rationale:

- **Hessen first.** Cleanest open-data posture (HVBG, 2022 free-access), simplest source landscape, HBO is well-consolidated. Establishes the discipline pattern with the lowest research friction.
- **Niedersachsen second.** NBauO is stable; voris well-organized. Builds on the Hessen pattern.
- **NRW third.** XPlanung complexity + 2024-Novelle creates extra moving parts; the per-template citation patterns need more care.
- **BW last.** 2023 Modernisierungsnovelle is the highest research risk in the batch. By the time we hit BW, the discipline pattern is established and the review machinery is warm.

**One state per commit.** Each commit ends with: *"Awaiting Rutik
review before next state."* No batched merges. ~5 commits total
(four state commits + an optional cleanup commit if smokeWalk
needs structural updates).

---

## Source-availability blockers — surface BEFORE content writing

These are the specific risks that warrant Rutik's go/no-go before
the corresponding state commit starts.

1. **BW 2023 Modernisierungsnovelle** — exact article-by-article changes need **Drucksache 17/4334** (Landtag Baden-Württemberg). AKBW summary is informative but not exhaustive. **Mitigation if Drucksache unreachable:** use pre-2023 LBO BW as the primary anchor, frame the 2023 changes as "die Modernisierungsnovelle 2023 berührt insbesondere [verifizierten Bereich] — weitere Änderungen sind im Detail noch zu verifizieren," and surface that limitation in the commit.

2. **NRW 2024-Novelle** — smaller amendment; need recht.nrw.de consolidated-text confirmation of which articles changed. **Mitigation if unconfirmable:** anchor to BauO NRW 2018 base, omit 2024-specific claims.

3. **HBauVwV (Hessen)** — Verwaltungsvorschrift, not Gesetz. Public consolidated version may lag the latest amendment. **Mitigation:** cite HBauVwV only for stable provisions; for amended sections, fall back to HBO statutory text.

4. **State-specific "Bauherr typischerweise" framings.** Phase 12 risks inventing claims that are plausible but not grounded. **Hard rule:** every "typically" / "in der Praxis" / "Bauherr in [state] geht oft davon aus" claim must trace to an AKNW / AKBW / AKNDS / AKH Bauherreninformation document or a comparable primary source. If no source supports the claim, use neutral structural framing ("Verfahrenstypisch sind nach § N: …") instead of editorial inference.

5. **Sonderbau-Schwellen-Divergenzen** — most states match the MBO 2002 baseline; BW notably has Versammlungsstätten ≥ 300 Personen (not the MBO 200), and other states may have local divergences. **Required before T-05-Abbruch and any Sonderbau-touching template:** per-state Sonderbau-Tatbestandskatalog comparison against the MBO baseline. Without it, T-05 / T-02 (MFH) / T-04 (Umnutzung) state content will hallucinate thresholds.

6. **My access to primary sources.** Honest disclosure: I (the assisting model) can fetch public German legal portals via WebFetch where they don't require login or geo-restrict. Drucksache PDFs sometimes require Landtag account access; HVBG documents are usually free. **Mitigation:** before the corresponding state commit, run a fetch dry-run on the named primary source URLs and flag any that 4xx / 403 / require auth. Switch to "honest in-Vorbereitung framing for that section" rather than confabulate.

---

## What this scoping doc does NOT decide

- Which exact paragraphs land in which state's TYPISCHE / VERBOTENE per template — that's per-state research at commit time.
- Whether Phase 12 will require a `cityBlock` for any of the four states (e.g., Köln, Stuttgart, Hannover, Frankfurt city-specific content). Default: no, stays null until Phase 14+.
- Whether the firewall warrants per-template Bayern-style anchors (e.g., "wrong T-01 citation in NRW") or just per-state-LBO is enough. Default: per-state-LBO suffices.

These are decided at the start of the corresponding state commit,
not now.

---

**Awaiting Rutik signoff on this scoping doc before Phase 12 commit
1 (Hessen) starts.**
