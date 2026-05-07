# Phase 12 review template

Copy this file to `docs/PHASE_12_REVIEW_<state>.md` (lower-case state
code, e.g. `PHASE_12_REVIEW_hessen.md`) at the start of each Phase 12
state commit. Fill every section before the commit lands. The file
ships in the same commit as the state's `systemBlock` content; it is
the persistent audit trail for Phase 17 client handoff.

> **Reading order is deliberate.** Section 1 (Uncertain claims) comes
> first because that is what Rutik reads first during review. Source
> ledger and blockers follow.

---

## State metadata

- **State (code / label):** `<bundesland-code>` — `<Bundesland-Label-DE>`
- **Phase 12 commit:** `<short-hash>` — *(fill after commit)*
- **Reviewer:** Rutik
- **Reviewed at:** *(fill on signoff, ISO date)*

---

## 1. Uncertain claims — READ THIS FIRST

Every claim made in the state's `systemBlock` that is **not 100 %
primary-source-grounded**. Bullet list. For each entry: the claim,
the closest source consulted, and the inferential gap that remains.

The discipline rule: if a claim isn't here AND isn't traceable in
section 2, it should not be in the systemBlock at all.

| # | Claim (verbatim from systemBlock) | Closest source | Inferential gap |
| --- | --- | --- | --- |
| 1 | *(quote the exact German sentence or article reference)* | *(URL + paragraph + retrieval date)* | *(what's missing — which year of the LBO version? whether it survived the latest novelle? whether the AKBW summary captured all changes?)* |
| 2 | … | … | … |

If this section is empty, the entry must be the literal text:
> *No uncertain claims. Every TYPISCHE / VERBOTENE Zitate in this
> state's systemBlock is grounded in a primary source listed in
> section 2 below.*

A genuinely empty section is a strong signal. A padded one is a red
flag — over-claiming "I'm sure" when sources weren't checked is
worse than admitting uncertainty.

---

## 2. Source ledger

Every TYPISCHE / VERBOTENE Zitate citation in the state's
`systemBlock`, paired with primary source URL + retrieval date +
paragraph or section identifier. Same content as the commit message,
persisted here for the long-term audit trail.

| Citation token (exact) | Primary source URL | Retrieval date | Paragraph / Section |
| --- | --- | --- | --- |
| `§ 5 BauO NRW` | https://recht.nrw.de/lmi/owa/br_text_anzeigen?v_id=… | 2026-MM-DD | § 5 (Abstandsflächen) |
| `§ 49 BauO NRW` | … | 2026-MM-DD | § 49 (Stellplätze) |
| `Art. … (cross-citation to BauGB)` | https://www.gesetze-im-internet.de/baugb/__34.html | 2026-MM-DD | § 34 |
| … | … | … | … |

**Architektenkammer / Verfahrens-VV / Bauherreninformation sources**
(separate sub-table — these don't fit the citation-token format):

| Source | URL | Retrieval date | Used for |
| --- | --- | --- | --- |
| AKNW Bauherreninformation 2025 | https://www.aknw.de/… | 2026-MM-DD | "Bauherr typischerweise" framings in T-01 / T-04 |
| LBOAVO § 1 Abs. 4 | https://landesrecht-bw.de/… | 2026-MM-DD | Verfahrensfrei-Schwellen |
| … | … | … | … |

If a source was unreachable or required login, log it in section 3
(Blockers) — do **not** cite it here.

---

## 3. Blockers encountered

Which of the six surface-blockers from `docs/PHASE_12_SCOPE.md`
fired during the research for this state, and what mitigation was
taken. Format per fired blocker.

### Blocker template

- **Blocker ID:** *(B1 BW Drucksache / B2 NRW Novelle / B3 HBauVwV / B4 "Bauherr typischerweise" framing / B5 Sonderbau-Schwellen / B6 source access)*
- **What fired:** *(specific sentence — e.g., "Drucksache 17/4334 returned 403 from Landtag-BW PDF endpoint when called via WebFetch on 2026-MM-DD")*
- **Affected systemBlock sections:** *(line ranges or paragraph IDs)*
- **Mitigation taken:** *(e.g., "Anchored the 2023 changes section to the AKBW 'LBO Modernisierung 2023' commentary at akbw.de/recht/… instead of Drucksache. Three paragraphs flagged 'noch zu verifizieren' in the systemBlock prose itself, AND listed in section 1 above.")*
- **Residual risk:** *(what could still be wrong, on a scale of "minor wording" → "could mislead a Bauherr" → "would mislead an Architekt:in." Be honest.)*

### If no blockers fired

Write the literal sentence:
> *No surface-blockers fired during research for this state. Every
> primary source in section 2 was reachable; every "Bauherr
> typischerweise" framing traces to a Bauherreninformation source.*

A no-blocker state is a strong signal. A glossed-over blocker is the
single biggest Phase 12 risk.

---

## Reviewer signoff

- [ ] Section 1 (Uncertain claims) read; gaps acceptable for v1.
- [ ] Section 2 (Source ledger) spot-checked: at least 3 random
  citations clicked through to confirm the URL works and the
  paragraph matches.
- [ ] Section 3 (Blockers) reviewed; mitigations acceptable.
- [ ] `npm run verify:bayern-sha` green on the commit.
- [ ] `npm run smoke:citations` green on the commit.
- [ ] State systemBlock spot-read: persona prose reads as honest
  reference content, not editorial filler.

**Signed off:** *(name + ISO date)*

---

## Failure mode this template prevents

A state ships with content that **looks** correct but cites a
paragraph that was renumbered in the latest novelle, or claims a
threshold (e.g., Versammlungsstätten ≥ 200) that was raised to 300
in the state's local divergence. The persona then reasons from a
wrong foundation, and the bauvorlageberechtigte Architekt:in
catches it on review — but only if they look. A Bauherr would not.

The template surfaces uncertainty up-front so the review converges
on the few claims that need extra scrutiny. The commit message
captures the source ledger; this file persists it for Phase 17
handoff so the client (and any future maintainer) can re-trace
every citation back to a primary source without re-doing the
research.
