# Phase 12 review — Hessen

## State metadata

- **State (code / label):** `hessen` — Hessen
- **Phase 12 commit:** *(fill after commit)*
- **Reviewer:** Rutik
- **Reviewed at:** *(fill on signoff, ISO date)*

---

## 1. Uncertain claims — READ THIS FIRST

> **Status — post-hot-fix.** Inferences #2 / #3 / #4 received explicit
> Rutik decisions and were resolved in the hot-fix patch (commit
> *(fill after commit)*). Resolutions noted inline below.

| # | Claim (verbatim from systemBlock) | Closest source | Inferential gap | Resolution |
| --- | --- | --- | --- | --- |
| 1 | "Hinweis: Die Detail-Spezifika der Baupaket-I-Novelle 2025 sind über die Synopse der Ingenieurkammer Hessen (ingkh.de) zu verifizieren." (header Stand-line) | `wirtschaft.hessen.de` confirmed 14.10.2025 amendment date; `ingkh.de` confirmed Synopse exists but PDF not directly fetched | IngKH Synopse PDF not downloaded; AKH-hosted HBO PDF is 2018 base text, pre-Baupaket-I. systemBlock's "Persona-Inhalte folgen der HBO-2018-Basis" is honest acknowledgment. | **Accepted** as-is. Visible gap is acceptable for v1; Phase 14 expansion candidate. |
| 2 | "§ 63 HBO baugenehmigungsfreie Maßnahmen für Instandsetzungen ohne Eingriff in tragende Bauteile / Brandwände / Fluchtwege" (T-03 TYPISCHE block, ORIGINAL) | HBO 2018 ToC verified § 63 = Baugenehmigungsfreie Bauvorhaben | Description was paraphrased from BayBO Art. 57 Abs. 3 Nr. 3 analogue, NOT from HBO § 63 body text. | **SOFTENED** to neutral structural framing. The new T-03 TYPISCHE block reads: *"§ 63 HBO als Eingangsverweisung für baugenehmigungsfreie Bauvorhaben — der konkrete Maßnahmenkatalog steht in der Anlage zur HBO und ist im Einzelfall gegen den Anlagentext zu prüfen, nicht aus BayBO-/MBO-Analogie zu inferieren."* The corresponding VERBOTENE block now explicitly bans the BayBO-analogue inference. |
| 3 | "§ 64 HBO Genehmigungsfreistellung ... Die Gemeinde kann binnen einem Monat die Durchführung des vereinfachten Verfahrens nach § 65 HBO verlangen" | HBO 2018 ToC verified § 64 = Genehmigungsfreistellung | "1-Monats-Frist" was inferred from analogous BayBO Art. 58a structure. | **VERBATIM VERIFIED** from HBO 2018 PDF pp. 59-60. Confirmed: § 64 Abs. 3 Satz 4 HBO sets exactly **1 month** ("innerhalb eines Monats nachdem die Bauvorlagen bei ihr eingegangen sind"). systemBlock now carries the verbatim Frist-text + the cumulative 5-criterion list from § 64 Abs. 1 + the Schwellen-Ausschlüsse from § 64 Abs. 2 (Wohnflächen >5,000 m², öffentliche Anlagen >100 zusätzliche Besucher, Tageseinrichtungen für Kinder im Sicherheitsabstand eines Bundes-Immissionsschutz-Betriebsbereichs). |
| 4 | "Sonderbauten ... durchlaufen das reguläre Baugenehmigungsverfahren nach § 66 mit erweitertem Prüfumfang und besonderen Nachweispflichten nach § 68" | ToC + § 68 read | Explicit claim that Sonderbauten "always" route via § 66 not directly read in § 65/§ 66 body. | **ACCEPTED** as-is. § 65 verbatim read post-hot-fix confirms it applies "Liegen bei Vorhaben, die keine Sonderbauten sind, die Voraussetzungen der Genehmigungsfreistellung nach § 64 nicht vor"; § 66 body opens with "Bei Sonderbauten sowie bei zugehörigen Nebengebäuden und Nebenanlagen prüft die Bauaufsichtsbehörde die Zulässigkeit". Structural inference fully validated by verbatim text. |
| 5 | "T-05 / T-06 / T-07 / T-08 Detail-Spezifika ... werden in einer späteren Bearbeitungsphase ergänzt" — explicit in-Vorbereitung framing | Visible-gap rule. No primary source needed for absence. | Honest gap. Phase 14 expansion candidate. | **Accepted** as-is. |
| 6 | (NEW — discovered during hot-fix) Original ✗ FALSCHE entry "Anlage 1 HBO existiert nicht" + § 63 prose claim "Hessen regelt die Baugenehmigungsfreiheit DIREKT in § 63 HBO" | HBO 2018 PDF p. 59 verbatim § 63: *"Vorhaben nach § 62 Abs. 1 Satz 1 bedürfen nach Maßgabe der Anlage keiner Baugenehmigung"* | **The HBO HAS an Anlage** that lists baugenehmigungsfreie Vorhaben — the original Phase-12-commit-1 claim that the HBO regulates Verfahrensfreiheit directly in § 63 (and that an "Anlage HBO" doesn't exist) was wrong. Same wildly-wrong-claim category as the 2025 Baupaket finding. | **HOT-FIX CORRECTED.** The ✗ FALSCHE entry now reads (paraphrased): the BayBO-context "Anlage 1" structure stays disqualified in Hessen, but a separate ⚠-Hinweis acknowledges that the HBO does carry an Anlage (§ 63 verweist "nach Maßgabe der Anlage"); "Anlage zu § 63 HBO" is a zulässiges Zitat when a concrete entry is belegt. § 63 prose now reads verbatim § 63 body text — no "direct" claim. |

---

## 2. Source ledger

### Primary source citations

| Citation token (exact) | Primary source URL | Retrieval date | Paragraph / Section |
| --- | --- | --- | --- |
| `§ 6 HBO` (Abstandsflächen, Tiefe 0,4 H / 0,2 H, mind. 3 m) | `https://www.akh.de/fileadmin/Beratung/Recht/Gesetze/HBO/HBO_2018.pdf` | 2026-05-07 | HBO 2018 PDF, pp. 14–17 (§ 6 Abs. 1 verbatim quote + Abs. 5 thresholds) |
| `§ 67 HBO Abs. 3` (200 m² / 2 WE Bauvorlageberechtigung-Schwelle) | same PDF | 2026-05-07 | HBO 2018 PDF, p. 62 (§ 67 Abs. 3 Nr. 1–4 verbatim list) |
| `§ 68 HBO` (Bautechnische Nachweise, Typenprüfung) | same PDF | 2026-05-07 | HBO 2018 PDF, p. 63 (§ 68 Abs. 1, 3, 4) |
| `§ 70 HBO Abs. 4` (3-Monats-Frist außer Sonderbauten, Verlängerung 2 Monate) | same PDF | 2026-05-07 | HBO 2018 PDF, p. 66 (§ 70 Abs. 4) |
| `§ 71 HBO` (Nachbarbeteiligung, 2-Wochen-Einwendungsfrist) | same PDF | 2026-05-07 | HBO 2018 PDF, p. 66 (§ 71 Abs. 1) |
| `§ 73 HBO Abs. 1` (Abweichungs-Schutzziel-Betrachtung) | same PDF | 2026-05-07 | HBO 2018 PDF, p. 68 (§ 73 Abs. 1) |
| `§ 74 HBO Abs. 7` (Geltungsdauer 3 Jahre, verlängerbar 2 Jahre) | same PDF | 2026-05-07 | HBO 2018 PDF, p. 69 (§ 74 Abs. 7) |
| HBO Inhaltsübersicht (Korrektur des Phase 11 Stubs: § 49 ≠ Bauvorlage, § 56 ≠ Nachweise, § 64 ≠ Vereinfacht, § 67 ≠ Sonderbauten, § 78 ≠ Genehmigungsfreistellung) | same PDF | 2026-05-07 | HBO 2018 PDF, pp. 4–7 (Inhaltsübersicht) |

### Background sources

| Source | URL | Retrieval date | Used for |
| --- | --- | --- | --- |
| AKH Bauherreninformation | `https://www.akh.de/beratung/bauen-mit-architekten` | 2026-05-07 | "200 m² / 2 WE Bauvorlage-Schwelle" Bauherren-pitched framing; Schwarzbau-Risiko, Berufshaftpflicht-Lücke. Cross-checked against § 67 Abs. 3 HBO PDF. |
| Hessisches Wirtschaftsministerium | `https://wirtschaft.hessen.de/wohnen-und-bauen/baurecht-und-bautechnik/hessische-bauordnung-hbo` | 2026-05-07 | Amendment-date confirmation: 14.10.2025 (GVBl. 2025 Nr. 66) — Drittes Änderungsgesetz / Baupaket I. |
| Ingenieurkammer Hessen — HBO Synopse page | `https://ingkh.de/ingkh/recht/hessische-bauordnung-hbo.php` | 2026-05-07 | Synopse-Verfügbarkeit der Baupaket-I-Änderungen. PDF-URL surfaced but PDF body not directly fetched (see Section 1 entry #1). |
| dejure.org BauGB § 34 (federal cross-reference foundation) | `https://dejure.org/gesetze/BauGB/34.html` | 2026-05-07 (federal-source-check commit) | Federal cite verification fallback; gesetze-im-internet.de paragraph permalinks return 404. |

---

## 3. Blockers encountered

### Blocker B6 (source access) — fired

- **Blocker ID:** B6 (source access).
- **What fired:** `rv.hessenrecht.hessen.de` is a JS-rendered SPA; WebFetch returns page title only, no body. Confirmed in `docs/PHASE_12_HESSEN_FETCH_DRYRUN.md` (commit `be86fa8`). `gesetze-im-internet.de` paragraph permalinks return 404 (not specifically for Hessen but affects federal cross-references).
- **Affected systemBlock sections:** all HBO §-citations (would have liked to verify each via the official state portal; instead anchored to AKH-hosted HBO 2018 PDF).
- **Mitigation taken:** Switched to AKH-hosted HBO 2018 PDF (`akh.de/fileadmin/.../HBO_2018.pdf`) for primary verbatim §-text. Verbatim quotes in the systemBlock for §§ 6 / 67 / 68 / 70 / 71 / 73 / 74 read directly from the PDF. Federal cross-references (BauGB / BauNVO) anchored to dejure.org per the source-access check (commit `3974df9`).
- **Residual risk:** The AKH PDF is the **2018 base text**. Baupaket I (October 2025) deltas are NOT reflected in the verbatim quotes. The systemBlock acknowledges this in the Stand-line and in Section 1 of this review doc. Practical impact: if Baupaket I changed any of the §§ I cited (most likely candidates: § 64 Genehmigungsfreistellung, § 65 Vereinfachtes Verfahren), the systemBlock prose may be subtly outdated. Architekt:in-Prüfung covers this. **Severity: minor wording in worst case; would not mislead a Bauherr on structural questions.**

### Blocker B3 (HBauVwV) — fired

- **Blocker ID:** B3 (HBauVwV).
- **What fired:** No reachable post-Baupaket-I version of HBauVwV identified during the dry-run. IngKH-equivalent Synopse for HBauVwV not found.
- **Affected systemBlock sections:** the HBAUVWV section + any T-template that would have leaned on Verwaltungsvorschrift specifics.
- **Mitigation taken:** Per the visible-gap rule (locked into PHASE_12_SCOPE.md by commit `cb3d517`), the systemBlock surfaces the HBauVwV gap explicitly with the "in Vorbereitung" framing. `PHASE_12_HESSEN_VV_REQUESTS.md` is empty.
- **Residual risk:** A user asking about specific Verwaltungsvorschrift-Inhalte gets the honest "in Vorbereitung" answer + redirect to the zuständige Bauaufsichtsbehörde. **Severity: visible quality gap, but visible-by-design and consistent with the Phase 11 minimum-stub pattern.**

### Blocker (Phase 11 quality issue, not in the original 6) — fired

- **Blocker ID:** none of the original six; this is a Phase 11 stub-quality issue surfaced during Phase 12 verification.
- **What fired:** **5 wrong § numbers in the Phase 11 Hessen stub.** Specifically: § 49 was claimed as Bauvorlageberechtigung (actually Blitzschutzanlagen; Bauvorlage is § 67); § 56 was claimed as Bautechnische Nachweise (actually Bauherrschaft; Nachweise is § 68); § 64 was claimed as Vereinfachtes Verfahren (actually Genehmigungsfreistellung; Vereinfachtes is § 65); § 67 was claimed as Sonderbauten (actually Bauvorlageberechtigung; Sonderbauten als Kategorie sind in § 53); § 78 was claimed as Genehmigungsfreistellung (actually Fliegende Bauten; Freistellung ist § 64).
- **Affected systemBlock sections:** the Phase 11 stub used wrong §-numbers throughout. Phase 12 corrects all of them in the systemBlock + allowedCitations.
- **Mitigation taken:** Phase 12 systemBlock uses the verified §-numbers from the HBO 2018 ToC (PDF pp. 4–7).
- **Residual risk:** zero on the corrected §-numbers; the verification is byte-direct from the HBO 2018 PDF Inhaltsübersicht. **Severity: Phase 11 issue, fully closed in Phase 12.** This is exactly why the dry-run + content-discipline pattern matters.

---

## Reviewer signoff

- [ ] Section 1 (Uncertain claims) read; the 5 entries acceptable for v1.
- [ ] Section 2 (Source ledger) spot-checked: at least 3 random citations clicked through to confirm the URL works and the paragraph matches.
- [ ] Section 3 (Blockers) reviewed; the Phase 11 stub-correction note registered.
- [ ] `npm run verify:bayern-sha` green on the commit.
- [ ] `npm run smoke:citations` green on the commit.
- [ ] State systemBlock spot-read: persona prose reads as honest reference content, not editorial filler.

**Signed off:** *(name + ISO date)*
