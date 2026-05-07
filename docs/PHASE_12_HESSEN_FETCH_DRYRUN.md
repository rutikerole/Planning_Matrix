# Phase 12 — Hessen fetch dry-run

**Date:** 2026-05-07. **Probe method:** `WebFetch` from this Claude
session against named primary sources. **Goal:** surface
PHASE_12_SCOPE.md blocker #6 (source-access reachability) BEFORE
Hessen content writing begins, not during.

---

## TL;DR

- Three sources reachable, three not. Hessen content is shippable;
  the source mix shifts away from the official state portal.
- **Scoping-doc correction.** PHASE_12_SCOPE.md cited HBO 2018 +
  2020-Novelle (HIGH/MEDIUM confidence). The current consolidated
  HBO is **HBO 2018 + Drittes Änderungsgesetz / Baupaket I**, in
  force since **14 October 2025** (GVBl. 2025 Nr. 66). The Hessen
  content must anchor to the post-2025 text, not the 2020 fassung.
- **Working primary sources:**
  - `ingkh.de/ingkh/recht/hessische-bauordnung-hbo.php` — IngKH
    hosts the consolidated HBO PDF (Fassung Juli 2024) + Synopse
    of the October 2025 changes. **Best practical primary source
    available via WebFetch.**
  - `akh.de/beratung/bauen-mit-architekten` — AKH Bauherren guidance,
    contains specific Hessen-anchored quotes (200 m² / 2 WE
    Bauvorlage threshold, Schwarzbau risks, insurance gap).
  - `wirtschaft.hessen.de/wohnen-und-bauen/...hbo` — Ministry
    overview page; confirms 14 Oct 2025 amendment date and links to
    Baupaket-I implementation notes.
- **Not reachable:**
  - `rv.hessenrecht.hessen.de` — official Hessen Bürgerservice legal
    portal. JavaScript-rendered SPA; WebFetch returns the page title
    only ("Bürgerservice Hessenrecht") with no body content. The
    portal itself is **healthy in a browser** — the limitation is
    server-side fetching from this Claude session.
  - `gesetze-im-internet.de` (federal Bundesjustizministerium) —
    returned HTTP 404 on the BauGB index page and on `__34.html`.
    Likely CDN-level bot blocking. Federal-law citations during
    Phase 12 must trace to an alternative portal (buzer.de or
    dejure.org for now; the federal Verlinkung is still safe to
    write into the persona text — only our verification fetch is
    blocked).
  - `buzer.de` — works in principle but my guessed permalink for
    HBO was wrong (returned a fertilizer regulation). The real HBO
    URL on buzer requires search-derivation; deferred.

---

## Per-URL probe table

| URL | Status | What we got | Verdict |
| --- | --- | --- | --- |
| `https://www.rv.hessenrecht.hessen.de/bshe/document/jlr-BauOHE2018rahmen` | 200, but body empty (SPA) | Page title only | **Unusable for Phase 12 fetch.** Browser-readable; server-fetch returns nothing useful. |
| `https://www.rv.hessenrecht.hessen.de/bshe/document/VVHE-VVHE000027917` | 200, but body empty (SPA) | Page title only | **Unusable.** Same SPA issue. |
| `https://www.akh.de/` | 200 | Homepage with link to `/beratung/bauen-mit-architekten` | Works. Use as discovery entry point. |
| `https://www.akh.de/beratung/bauen-mit-architekten` | 200 | Bauherren guidance with quotable Hessen-specific warnings | **Works. Best AKH primary source for "Bauherr typischerweise" framings.** |
| `https://wirtschaft.hessen.de/wohnen-und-bauen/baurecht-und-bautechnik/hessische-bauordnung-hbo` | 200 | Ministry HBO overview; 14 Oct 2025 amendment date confirmed; Baupaket-I implementation notes linked | **Works. Best amendment-date confirmation source.** |
| `https://ingkh.de/ingkh/recht/hessische-bauordnung-hbo.php` | 200 | Consolidated HBO PDF (Fassung Juli 2024) + Synopse of Oct 2025 changes | **Works. Best practical primary source for Hessen — replaces rv.hessenrecht as the consolidated-text anchor.** |
| `https://www.gesetze-im-internet.de/baugb/` | 404 | Server returned 404 | **Blocked.** Use buzer.de / dejure.org for federal cross-references during Phase 12 verification. |
| `https://www.gesetze-im-internet.de/baugb/__34.html` | 404 | Server returned 404 | Blocked. Same. |
| `https://www.buzer.de/gesetz/8528/index.htm` | 200 | Wrong document — returns DüMV (Düngemittelverordnung) | URL guess was wrong. Defer until correct buzer permalink for HBO is search-derived. |

---

## Quotable AKH passages (already verified usable)

These three passages from `akh.de/beratung/bauen-mit-architekten`
are the kind of grounded-source content the Phase 12 Hessen
systemBlock can cite by paraphrase. Each is a primary AKH
statement, **not** Claude-inferred editorial:

1. *"Ab einer bestimmten Größenordnung (z.B. bei Wohngebäuden bereits ab 200m² Wohnfläche und mehr als zwei Wohneinheiten) des Bauvorhabens müssen Bauanträge in Hessen von einem Entwurfsverfasser eingereicht werden, der eine unbeschränkte Bauvorlageberechtigung besitzt."*
   → Bauvorlage-threshold framing. Citable.

2. *"ein Schwarzbau... kann bestenfalls seitens der Behörde nachträglich genehmigt werden, wenn eine bauvorlageberechtigte Person einen neuen Bauantrag stellt. Das führt allerdings zu zusätzlichen Kosten für den Bauherrn."*
   → Schwarzbau-risk framing. Citable.

3. *"Es ist daher nicht sicher, ob der bzw. die Auftragnehmer*in im Schadensfall eine Berufshaftpflichtversicherung besitzt... droht bei fehlender Berufshaftpflichtversicherung der Bauherrschaft die Gefahr, auf dem Schaden 'sitzen zu bleiben'."*
   → Berufshaftpflicht framing. Citable.

---

## Implications for Hessen content commit

1. **Anchor changes.** Replace `rv.hessenrecht.hessen.de` references in PHASE_12_SCOPE.md with `ingkh.de` for HBO consolidated text + `wirtschaft.hessen.de` for amendment-date confirmation. AKH stays as the Bauherren-framing source.
2. **HBO version target.** Use **HBO 2018 + Drittes Änderungsgesetz (Baupaket I, 14 Oct 2025)**, not the pre-2025 fassung. The IngKH PDF labelled "Fassung Juli 2024" is **not** current; the IngKH Synopse pins the October 2025 deltas.
3. **Federal-cite verification.** When the persona references `BauGB § 34` etc., we cannot fetch-verify against gesetze-im-internet.de from this session. **Mitigation:** verify federal cites against buzer.de or dejure.org in the source ledger; flag in the review doc if any cite couldn't be machine-verified.
4. **Confidence rating update.** PHASE_12_SCOPE.md called Hessen **HIGH** for HBO and **MEDIUM** for HBauVwV. Post-dry-run: HBO drops to **MEDIUM-HIGH** because the official portal is unreachable and we depend on IngKH-derived consolidated text. HBauVwV drops to **LOW** — same SPA limitation, no IngKH-equivalent identified yet. Recommend **omitting HBauVwV citations** from the Hessen systemBlock unless a reachable consolidated source is found mid-commit; fall back to "HBO statutory text only" framing.
5. **Blocker #6 fired** — exactly as predicted in `PHASE_12_SCOPE.md` §6. Mitigation strategy works: switch to reachable secondary sources, surface the limitation in the per-state review doc, never confabulate. Phase 12 commit 1 (Hessen) ships content with explicit "noch zu verifizieren via official portal" framing on any provision the IngKH Synopse doesn't fully resolve.

---

## What this dry-run does NOT decide

- The exact systemBlock prose for Hessen — that's commit-time
  research, post-greenlight.
- Whether to retry rv.hessenrecht.hessen.de via a different fetch
  strategy (headless browser, MCP server, etc.) — out of scope for
  Phase 12; documented limitation.
- Whether the same SPA limitation affects landesrecht-bw.de /
  voris.niedersachsen.de / recht.nrw.de. **Re-run this dry-run
  per state before each Phase 12 state commit.**

---

**Awaiting Rutik greenlight on this dry-run before Phase 12 Hessen
content commit starts.**
