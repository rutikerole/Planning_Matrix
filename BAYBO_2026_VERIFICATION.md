# BayBO 2025/2026 Modernisierung — Prompt Verification

> Date: 2026-05-04 · Phase 5 sprint · `legalContext/bayern.ts` post-edit
> Outcome: 6 fixed / added · 2 already covered · 1 partial (defer specifics to Designer-stage)

The Phase 4 audit was structural — it confirmed the system prompt cited the right BayBO articles, but did not cross-check whether the *content* of those articles reflected the post-2025 legal state. Bayern passed three Modernisierungsgesetze in 2025 (effective 1 Jan, 1 Aug, 1 Oct 2025) plus a fourth novelle effective 1 Jan 2026, plus the federal *Bau-Turbo* (BauGB §§ 246e, 31 Abs. 3, 34 Abs. 3b, effective 30 Oct 2025) coordinated with Art. 82c BayBO. This document records the per-item verification.

| # | Item | Pre-sprint state in `bayern.ts` | Action | Where now |
|---|---|---|---|---|
| **D.1** | **Stellplatzpflicht kommunalisiert** (Art. 47 i.V.m. Art. 81, ab 01.10.2025) | "Notwendige Kfz-Stellplätze in ausreichender Zahl. Die konkrete Anzahl folgt der kommunalen Stellplatzsatzung." — implicit but not explicit on the kommunalisation | **fixed** | Art. 47 block reworded: explicit that BayBO selbst keine Stellplätze mehr vorschreibt; pflicht ergibt sich nur aus Gemeindesatzung; in München via StPlS 926 |
| **D.2** | **Bauantrag direkt zur Bauaufsichtsbehörde** (Art. 65 ab 01.01.2025) | Absent — Art. 66 mentioned the Gemeinde forwarding to neighbours, but the application path itself was undocumented | **added** | New Art. 65 block: explicit "DIREKT bei der zuständigen Bauaufsichtsbehörde — in München LBK / Sub-Bauamt Mitte/Ost/West", "frühere Weiterleitungsschleife über die Gemeinde entfällt" |
| **D.3** | **Drei-Wochen-Vollständigkeitsprüfung** (Art. 65 Abs. 1) | Already added in Phase A.3 inside the Art. 59 block | **already ✓** + reinforced in the new Art. 65 block | Art. 59 (Phase A.3) and Art. 65 (Phase D) both reference the 3-week gate |
| **D.4** | **Baugenehmigung Verlängerung bis 4 Jahre** (Art. 69 Abs. 2) | Absent — Art. 69 not mentioned at all | **added** | New Art. 69 block: 4-year base validity + up to 4 additional years on request (raised from 2 in 2025); flagged as project-planning-relevant |
| **D.5** | **Sonderbau-Schwellen** (Art. 2 Abs. 4) — Verkaufsstätten 800→2.000 m², Gaststätten >60 Gastplätze | Wrong: said "Verkaufsstätten > 800 m²" | **fixed** | Updated to "> 2.000 m² (Schwelle 2025 von 800 m² heraufgesetzt)" + Gaststätten clause added. Note: I had already drafted the 2.000 m² figure into the new Art. 59 block in Phase A.3, so this resolves the prior internal inconsistency. |
| **D.6** | **Verfahrensfreiheit erweitert** (Anlage 1 BayBO i.V.m. Art. 56) | Absent — only Genehmigungsfreistellung (Art. 57) was covered | **partial** | New "Verfahrensfreie Vorhaben" block added before Art. 57. Frames the concept (Dachgeschossausbau, kleine Außenbereich-Anlagen, Art. 46 Abs. 6 privileged Aufstockung — keep original GK, no Brandschutz-upgrade) but **deliberately does NOT name specific m³ thresholds** because article-level numbers shift between BayBO revisions. Architect:in / Designer-stage verifies the concrete maße. |
| **D.7** | **Bau-Turbo + Art. 82c BayBO** | `federal.ts` covers § 246e BauGB rigorously with the discipline clause; `bayern.ts` Art. 82c was missing | **added** | New Art. 82c block: coordinates BauGB beschleunigungstatbestände with Art. 58 BayBO; München explicitly named as Wohnungsmangelgebiet; same discipline as § 246e (only zu prüfende Möglichkeit, never gegeben) |
| **D.8** | **Freiflächengestaltung Bepflanzung-Kommunalisierung** | Already covered for München in `muenchen.ts:184-202` (GBS § 3 ausgesetzt seit 30.09.2025, Nachfolge-Regelung in Vorbereitung). Federal-level not separately documented but for v1 (München-only) the muenchen.ts coverage is sufficient | **already ✓** for München | No change |
| **D.9** | **Kinderspielplatzpflicht kommunalisiert** (Art. 81 Abs. 1 Nr. 3) — only if Satzung, only ab >5 Wohnungen | Absent | **added** | Brief paragraph appended to the Art. 47 block (parallel kommunalisation context). Notes that for T-01 Einfamilienhaus irrelevant; for T-02 Mehrfamilienhaus to be checked per Einzelfall |

## Summary

- **Fixed:** D.1, D.5
- **Added:** D.2, D.4, D.7, D.9
- **Partial (added framing, deferred specifics):** D.6
- **Already covered:** D.3 (Phase A.3), D.8 (existing muenchen.ts)

`bayern.ts` grew from 161 → 268 lines (+107). Composed prompt rose from ~10.9k → ~12.6k tokens, still comfortably within Anthropic's caching window.

## What this verification did NOT do

- **No new article numbering was asserted from training data alone.** Every concrete article cited (Art. 2 / 6 / 44a / 47 / 56 / 57 / 58 / 59 / 60 / 61 / 62 / 64 / 65 / 66 / 69 / 81 / 82c) reflects the existing prompt or the user-provided sprint brief; nothing was hallucinated from a model's prior of "what BayBO usually says."
- **Specific m³ / m² / Geschoss-Schwellen** in the verfahrensfrei catalogue (Anlage 1 BayBO) were intentionally omitted. These shift between revisions and need a current Bayern-Recht citation; deferring to the Architect:in stage is honest.
- **Munich-specific Bauturbo applicability** (which München-Stadtbezirke have a gemeindliche Festsetzung under § 246e BauGB?) was NOT researched. The prompt frames Bauturbo as a possibility to verify, never as gegeben — same discipline as § 246e in `federal.ts`.

## Pre-launch human-task list (legal review)

The following are NOT code; they need a German Bauingenieur or Fachanwalt für Bau- und Architektenrecht to sign off before public launch:

- [ ] Confirm the Verkaufsstätten 2.000 m² Schwelle is the current law (some sources still cite 800 m² for older revisions).
- [ ] Confirm the 4-Jahre-Verlängerung in Art. 69 Abs. 2 is the post-2025 number (some sources cite 3 Jahre as the older state, others 2 Jahre).
- [ ] Confirm Art. 82c BayBO exists in the cited form and the Wohnungsmangelgebiet-Eigenschaft of München is formally asserted.
- [ ] Confirm Anlage 1 BayBO catalogue post-2025 covers the Dachgeschossausbau case as described.
- [ ] Confirm the Spielplatzpflicht-Kommunalisierung (Art. 81 Abs. 1 Nr. 3) and the >5-Wohnungen threshold under typical Münchner Satzungen.

If any of these turns out to be wrong post-review, a single targeted edit to `legalContext/bayern.ts` plus a chat-turn redeploy is the entire fix.
