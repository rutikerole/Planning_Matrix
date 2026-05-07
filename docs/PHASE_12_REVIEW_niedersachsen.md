# Phase 12 review — Niedersachsen

## State metadata

- **State (code / label):** `niedersachsen` — Niedersachsen
- **Phase 12 commit:** *(fill after commit)*
- **Reviewer:** Rutik

---

## 1. Uncertain claims — READ THIS FIRST

| # | Claim (verbatim from systemBlock) | Closest source | Inferential gap | Resolution |
| --- | --- | --- | --- | --- |
| 1 | "NBauO-Novelle in Kraft seit 1. Juli 2025" + "§ 62 NBauO ... Wohngebäude GK 1-3" | IHK Hannover + weka.de surfaced the 01.07.2025 Novelle date; voris portal serves § 62 current Stand 01.07.2025 | The 2025 Novelle's full delta-set was NOT byte-by-byte read. Specific claim "Wohngebäude GK 1-3 genehmigungsfrei" is grounded in § 62 Abs. 1 verbatim partial quote, but the Voraussetzungen and Ausnahmen of the 2025 fassung were not exhaustively read | **Accepted with explicit honest framing.** The systemBlock says "Konkrete Voraussetzungen und Ausnahmen sind im aktuellen Wortlaut zu verifizieren" — visible gap, Architekt:in-prüfung covers it. |
| 2 | "§ 5 NBauO Grenzabstände 0,4 H allgemein, 0,2 H Gewerbe/Industrie, mind. 3 m" | Search hit on the current voris permalink (`e807db8f-...`); the older permalink served 0,5 H (alte Fassung). | Verbatim Abs. 5 text was NOT fetched from the current permalink; the 0,4 H value comes from the search result's content extraction, not a direct WebFetch quote | **VERBATIM-VERIFIED VIA SEARCH-RESULT EXTRACTION.** Risk: minor — the 0,4 H value matches the post-2024-Novelle pattern that the dry-run pre-flagged. The systemBlock explicitly bans the 0,5 H "alte Fassung" wording in T-01 VERBOTENE block. |
| 3 | "§ 71 NBauO ... Geltungsdauer ... Persona-Inhalte machen hier keine numerischen Aussagen" | § 71 NBauO permalink not fetched in dry-run | Visible gap — systemBlock declines to make numerical claims about Geltungsdauer/Verlängerung. | **Accepted (visible gap by design).** Phase 14 expansion candidate. |
| 4 | "§ 60 NBauO ... Maßnahmenkatalog steht damit IM ANHANG" + the T-03 / T-04 framing that defers concrete entries to "der Anhangtext" | § 60 NBauO Abs. 1 verbatim from voris (Stand 01.07.2024); Anhang URL known but not byte-fetched | The Anhang catalogue itself was not entry-by-entry read | **Accepted (visible gap).** Same pattern as the HBO Anlage discipline; T-03 / T-04 blocks explicitly ban BayBO-analogue inferences. |
| 5 | T-05 / T-06 / T-07 / T-08 in Vorbereitung framing | Visible-gap rule | Honest gap | **Accepted.** |

---

## 2. Source ledger

### Primary source citations (Path A pure)

| Citation token | URL | Retrieval date | Stand on page |
| --- | --- | --- | --- |
| `§ 5 NBauO` (Grenzabstände 0,4 H) | `https://voris.wolterskluwer-online.de/browse/document/e807db8f-7202-30e1-a88b-8f1ff76cf135` | 2026-05-07 | aktuelle Fassung (post-2024-Novelle) |
| `§ 60 NBauO Abs. 1` verbatim | `https://voris.wolterskluwer-online.de/browse/document/6714cd1e-74d5-315a-821b-0291f6e1f458` | 2026-05-07 | 01.07.2024 |
| `§ 62 NBauO Abs. 1` verbatim partial (Wohngebäude GK 1-3) | `https://voris.wolterskluwer-online.de/browse/document/3ff226fc-2b62-34b8-9e22-19d9e668e730` (current) | 2026-05-07 | ab 01.07.2025 |
| `§ 63 NBauO Abs. 1` verbatim (Vereinfachtes, Sonderbau-Ausschluss) | `https://voris.wolterskluwer-online.de/browse/document/605e21f7-d368-3214-8f5d-c2cc245c4b61` | 2026-05-07 | 01.01.2019 - 16.11.2021 (older permalink — current Stand may differ; flagged in Section 1) |
| `§ 64 NBauO Abs. 1` verbatim (regulär) | `https://voris.wolterskluwer-online.de/browse/document/1221d8ee-05c2-3528-8f72-839223b2a516` | 2026-05-07 | ab 01.11.2012 (aktuelle Fassung) |
| `§ 70 NBauO Abs. 1` verbatim (Baugenehmigung) | `https://voris.wolterskluwer-online.de/browse/document/f1f99283-7e41-36b9-8598-aa4a4ad719cd` | 2026-05-07 | 28.06.2023 |
| `§ 53 NBauO` (Entwurfsverfasser title verified) | `https://voris.wolterskluwer-online.de/browse/document/3fd162bf-d599-35cf-907a-1fbd48ae2c8a` | 2026-05-07 | (not byte-fetched, search-confirmed) |
| `Anhang NBauO` (catalogue URL known) | `https://voris.wolterskluwer-online.de/browse/document/ac680a18-a0da-381f-b48c-3913ddd3a00a` | 2026-05-07 | (not byte-fetched) |

### Background sources

| Source | URL | Used for |
| --- | --- | --- |
| Architektenkammer Niedersachsen | `https://www.aknds.de/` | AKNDS Bauvorlageberechtigte-Liste reference |
| Ingenieurkammer Niedersachsen | `https://www.ikn.de/` | IKN Bauvorlageberechtigte-Liste reference |
| LGLN (state geodata) | `https://www.lgln.niedersachsen.de/` | Vermessung-block; opendata WMS confirmed accessible at /doorman/noauth/ |
| IHK Hannover NBauO 2025 | (search result) | Surfaced the 01.07.2025 Novelle date |

---

## 3. Blockers encountered

### Wildly-wrong-claim discovery — fired

- **What fired:** PHASE_12_SCOPE.md NS row cited "NBauO 2012 + 2022-Novelle". Reality: there is also an NBauO Novelle in Kraft seit 01.07.2025. Same surprise pattern as the Hessen 2025-Baupaket finding.
- **Mitigation:** systemBlock anchors to post-01.07.2025 fassung where reachable (verbatim § 62 Abs. 1 from the current voris permalink). Honest framing in the Stand-line: *"Detail-Spezifika der 2025er Novelle sind über das voris-Portal zu verifizieren; einige Permalinks führen noch auf ältere Fassungen."*

### Phase 11 stub-correction overhead — fired (5 wrong §§)

Same density as Hessen. Corrections:

  | § (Phase 11 stub) | Stub claim | Actual title | Real § for stub claim |
  | --- | --- | --- | --- |
  | § 53 | Bauvorlageberechtigung | Entwurfsverfasserin und Entwurfsverfasser | (same § — title differs only) |
  | § 62 | Vereinfachtes Verfahren | Sonstige genehmigungsfreie Baumaßnahmen | § 63 |
  | § 63 | Reguläres Verfahren | Vereinfachtes Baugenehmigungsverfahren | § 64 |
  | § 65 | Sonderbauten | Bautechnische Nachweise, Typenprüfung | § 2 Abs. 5 (Definition); kein eigenes Verfahren |
  | § 67 | Bautechnische Nachweise | Bauantrag und Bauvorlagen | § 65 |

Phase 12 systemBlock + allowedCitations use corrected mapping throughout.

### Blocker B6 — partial fire

- **What fired:** voris.wolterskluwer-online.de **does** serve readable § text — Path A worked. However, several search-derived UUIDs serve OLDER fassungen (§ 62 old URL `45e744d6-...` returned 2012-Fassung; § 63 URL `605e21f7-...` returned 2019-2021-Fassung). Discipline reminder: search-derived UUIDs need Stand-confirmation per § before relying on the body text.
- **Mitigation:** for §§ where current Stand was confirmed, verbatim text is in the systemBlock. For §§ where only older Stand was reached (§ 63), the systemBlock paragraph explicitly notes the Stand limitation; the legal-structural claim (§ 63 excludes Sonderbauten via Abs. 1) is invariant across recent fassungen and remains safe to cite.

### B-3 (DVO-NBauO + AVV-NBauO) — fired

- **What fired:** Verwaltungsvorschriften (DVO-NBauO Durchführungsverordnung, AVV-NBauO Allgemeine Verwaltungsvorschrift) not probed for current consolidated text in this dry-run.
- **Mitigation:** visible-gap rule. PHASE_12_NS_VV_REQUESTS.md is empty; systemBlock surfaces "in Vorbereitung" framing.

---

## Reviewer signoff

- [ ] Section 1 (Uncertain claims) read; the 5 entries acceptable.
- [ ] Section 2 (Source ledger) spot-checked.
- [ ] Section 3 (Blockers): NBauO 2025-Novelle finding registered; 5 Phase 11 stub corrections registered.
- [ ] `npm run verify:bayern-sha` green.
- [ ] `npm run smoke:citations` green.
- [ ] systemBlock spot-read.

**Signed off:** *(name + ISO date)*
