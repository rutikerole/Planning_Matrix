# Phase 12 review — Baden-Württemberg

## State metadata

- **State:** `bw` — Baden-Württemberg
- **Reviewer:** Rutik

---

## 1. Uncertain claims — READ THIS FIRST

| # | Claim | Closest source | Inferential gap | Resolution |
| --- | --- | --- | --- | --- |
| 1 | Verfahren-Wahlfreiheit-Matrix (Sonderbauten nur vollumfänglich; GK 1-3 Wohnen nur vereinfacht/Kenntnis; GK 5 volle Wahlfreiheit; etc.) | AKBW Merkblatt 610 p. 3 verbatim quote | The systemBlock summarises the AKBW commentary, which paraphrases the §§ 51/52 LBO Neuordnung. Verbatim §§ 51/52 LBO body NOT byte-fetched in full — only Abs. 1 Satz 1 of § 51 verbatim from dejure.org. | **Accepted** — the AKBW commentary is itself primary-source-grade (Architektenkammer pflicht). The Matrix is exactly as AKBW stated; LE per-Architekt:in verifies edge cases. |
| 2 | "§ 5 LBO Abstandsflächen — konkrete Schwellen sind im Wortlaut zu prüfen" — visible-gap framing | LBO BW Inhaltsverzeichnis read | Verbatim § 5 Abs. body NOT fetched. systemBlock declines the numerical claim. | **Accepted (visible gap).** |
| 3 | "Klimaschutzgesetz-Novelle 2023: Erleichterungen bei Abstandsflächenrecht und Aufzugspflicht für das Bauen im Bestand" (T-03 block) | AKBW Merkblatt 610 p. 2 verbatim mention | Specific §§ that changed in 2023 NOT byte-fetched | **Accepted (AKBW-paraphrase).** Architekt:in verifies on individual project basis. |
| 4 | "§ 58 Abs. 1a LBO Genehmigungsfiktion 3 Monate" + § 54 als Frist-Beginn | AKBW Merkblatt 610 p. 3 verbatim quote | Verbatim § 58 Abs. 1a body NOT directly fetched (only AKBW commentary on it) | **Accepted (AKBW commentary explicit).** |
| 5 | "§ 27f LBO regelt Nutzungsänderungen und Aufstockungen zu Wohnzwecken" — relevance for T-06 | LBO BW Inhaltsverzeichnis (§ 27f title verified verbatim) | § 27f body content NOT read | **Accepted (visible gap).** T-05..T-08 in Vorbereitung framing. |
| 6 | T-05..T-08 in Vorbereitung framing | Visible-gap rule | Honest gap | **Accepted.** |

---

## 2. Source ledger

### Primary source citations

| Citation token | URL | Retrieval date | Stand |
| --- | --- | --- | --- |
| LBO BW Inhaltsverzeichnis (full ToC + § 1 + § 2 verbatim Gebäudeklassen) | `https://www.akbw.de/fileadmin/download/dokumenten_datenbank/AKBW_Merkblaetter/Baurecht_Planungsrecht/Merkblatt610_LBO2026.pdf` (80 pages) | 2026-05-07 | 16. März 2026 (post-Bauturbo + post-Schnelleres-Bauen) |
| `§ 51 LBO Abs. 1 Satz 1` verbatim Kenntnisgabeverfahren | `https://dejure.org/gesetze/LBO/51.html` | 2026-05-07 | 28.06.2025 |
| Verfahren-Wahlfreiheit-Matrix verbatim | AKBW Merkblatt 610 p. 3 | 2026-05-07 | 16.03.2026 |
| § 58 Abs. 1a LBO Genehmigungsfiktion verbatim AKBW-Kommentar | AKBW Merkblatt 610 p. 3 | 2026-05-07 | 16.03.2026 |

### Background sources

| Source | URL | Used for |
| --- | --- | --- |
| AKBW homepage | `https://www.akbw.de/` | Architektenkammer-Referenz |
| AKBW LBO-Änderung 2023 page | `https://www.akbw.de/berufspraxis/bauantragsverfahren-bw/lbo-aenderung-2023-digitalisierung-baurechtlicher-verfahren` | Background-Kontext für 2023er Klimaschutz-Novelle |
| INGBW homepage | `https://www.ingbw.de/` | Ingenieurkammer-Referenz |
| dejure.org LBO main entry | `https://dejure.org/gesetze/LBO` | Paragraph-permalink Fallback |

---

## 3. Blockers encountered

### Wildly-wrong-claim discovery — fired (BIGGEST so far)

- **What fired:** PHASE_12_SCOPE.md cited "LBO BW + Modernisierungs-novelle 2023" as a single recent amendment. Reality: BW had THREE recent novellen — 2023 (drei kleine: Klimaschutz Februar, Antennen Juni, Digitalisierung November), 2025 ("Gesetz für das schnellere Bauen", in Kraft 28.06.2025), 2026 ("Bauturbo" + Solar, Bekanntmachung 15.04.2026). The scoping doc severely under-counted.
- **Mitigation:** systemBlock anchors to Stand 16.03.2026 from AKBW Merkblatt 610. Stand-line surfaces all three relevant Novellen; § 58 Abs. 1a Genehmigungsfiktion (2025-Novelle) explicitly carried in the systemBlock.

### Phase 11 stub-correction overhead — fired (4 wrong §§)

  | § (Phase 11 stub) | Stub claim | Actual title | Real § for stub claim |
  | --- | --- | --- | --- |
  | § 38 | Anlagen für Kinder | Sonderbauten | § 9 (Kinderspielplätze) |
  | § 53 | Reguläres Verfahren | Bauvorlagen und Bauantrag | (no separate "regulär"; vollumfängliches via § 49 + § 58) |
  | § 54 | Bauvorlageberechtigung | Fristen im Genehmigungsverfahren | § 63 |
  | § 73 | Bautechnische Nachweise | Rechtsverordnungen | § 73a (Technische Baubestimmungen) |

Phase 12 systemBlock + allowedCitations use the verified mapping.

### B6 (source access) — partial fire

- **What fired:** landesrecht-bw.de HTML SPA blocked (per source-access-check).
- **Mitigation:** AKBW Merkblatt 610 PDF is the gold-standard primary source AND fully readable. dejure.org provides paragraph-permalink fallback. **Path A pure works for BW.**

### LBOAVO + LBOVVO (Verwaltungsvorschriften) — fired

- **What fired:** LBOAVO + LBOVVO not probed.
- **Mitigation:** visible-gap rule. PHASE_12_BW_VV_REQUESTS.md is empty.

### LGL-BW Service-Modernisierung 05.02.2026 — operational note

- The PHASE_12_OQ3_GEOPORTAL_RESEARCH.md flagged a service-cutover for 05.02.2026. It has now passed; post-cutover endpoints would need re-verification at Phase 15 kickoff. Phase 12 systemBlock notes this as an operational hint (vermessungs-block).

---

## Reviewer signoff

- [ ] Section 1 (6 entries) read.
- [ ] Section 2 spot-checked.
- [ ] Section 3 — Bauturbo + Schnelleres-Bauen Novellen registered; 4 stub corrections registered.
- [ ] `verify:bayern-sha` green.
- [ ] `smoke:citations` green.
- [ ] systemBlock spot-read.

**Signed off:** *(name + ISO date)*
