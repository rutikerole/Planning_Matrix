# Phase 12 review — NRW

## State metadata

- **State:** `nrw` — Nordrhein-Westfalen
- **Reviewer:** Rutik

---

## 1. Uncertain claims — READ THIS FIRST

| # | Claim | Closest source | Inferential gap | Resolution |
| --- | --- | --- | --- | --- |
| 1 | "§ 6 BauO NRW Abstandsflächen ... Schwellen weichen vom bayerischen 0,4 H ab und folgen einer eigenen NRW-Logik" — but no specific NRW threshold cited | recht.nrw.de PDF ToC + § 6 page exists; verbatim Abs. 5 not byte-fetched | The systemBlock declines to make a numerical claim about the NRW Abstandsflächen-Tiefe. **Visible gap by design.** Architekt:in must verify the actual NRW threshold (NRW historically used 0,4 H but with specific Bestand-Sonderregelungen). | **Accepted (visible gap).** Honest framing replaces a specific numerical claim with "im Einzelfall gegen den Wortlaut zu prüfen". |
| 2 | "§ 63 BauO NRW Abs. 1 Satz 1: 'Keiner Baugenehmigung bedarf unter den Voraussetzungen des Absatzes 2 die Errichtung, Änderung oder Nutzungsänderung von...'" | gesetze.co/NW/BauO_NRW/63 verbatim retrieval | Abs. 1 first sentence is verbatim from gesetze.co; Abs. 2 contents (the actual Voraussetzungs-Liste) are paraphrased per BayBO Art. 58a / HBO § 64-analogue patterns ("qualifizierter B-Plan, gesicherte Erschließung, kein Befreiungsbedarf, kein Abweichungsbedarf"). Verbatim Abs. 2 NOT fetched. | **Accepted with explicit "im Einzelfall gegen den aktuellen Text zu prüfen" framing.** Same pattern as Hessen Section 1 #4 — invariant across recent fassungen, but Architekt:in verifies the specific Voraussetzungs-Liste. |
| 3 | "§ 62 BauO NRW Verfahrensfreie Bauvorhaben — der konkrete Maßnahmenkatalog steht im Wortlaut" | recht.nrw.de PDF ToC | § 62 Abs. 1 body NOT byte-fetched. Unlike NBauO/HBO which reference an Anhang, § 62 BauO NRW likely lists Maßnahmen directly in the §-body. systemBlock declines to inferred-list specific Maßnahmen. | **Accepted (visible gap).** T-03/T-04 blocks explicitly ban BayBO-analogue inference. |
| 4 | "§ 8 BauO NRW Kinderspielplatzpflicht — Schwelle gegen Wortlaut prüfen" | recht.nrw.de PDF ToC | Specific Wohnungs-Anzahl-Schwelle for Kinderspielplatzpflicht NOT verified | **Accepted (visible gap).** T-02 block declines specific number. |
| 5 | "Eingeschränkte Bauvorlageberechtigung für Handwerker (Meister)" reference + IK-Bau NRW FAQ link | IK-Bau NRW FAQ-page surfaced in dry-run | The systemBlock references the Existenz of this Sonderregel but doesn't quote thresholds | **Accepted (visible gap).** No numerical claims made; reader directed to IK-Bau NRW FAQ. |
| 6 | T-05 / T-06 / T-07 / T-08 in Vorbereitung framing | Visible-gap rule | Honest gap | **Accepted.** |

---

## 2. Source ledger

### Primary source citations

| Citation token | URL | Retrieval date | Stand |
| --- | --- | --- | --- |
| BauO NRW 2018 ToC + structural verification of all §§ | `https://recht.nrw.de/system/files/pdf/state-law-and-regulations/2018/08/08/c3e1a4/2024-01-01-bauordnung-fuer-das-land-nordrhein-west.pdf` (123-page PDF) | 2026-05-07 | 01.01.2024 (post-Zweitem-Änderungsgesetz vom 31.10.2023, GV. NRW. S. 1172) |
| `§ 63 BauO NRW Abs. 1` first sentence verbatim | `https://gesetze.co/NW/BauO_NRW/63` | 2026-05-07 | 31.10.2023 (in Kraft 01.01.2024) |

### Background sources

| Source | URL | Used for |
| --- | --- | --- |
| AKNW Synopse PDF (2024) | `https://www.aknw.de/fileadmin/user_upload/Gesetze-Verordnungen/Synopse_Landesbauordnung_NRW_24122023.pdf` | Begründung für die 31.10.2023-Novelle (Background-Kontext) |
| AKNW homepage | `https://www.aknw.de/` | Architektenkammer-Referenz |
| IK-Bau NRW homepage | `https://www.ikbaunrw.de/` | Ingenieurkammer-Referenz, FAQ Bauvorlageberechtigung |
| recht.nrw.de Stand-Page | `https://recht.nrw.de/lrgv/gesetz/01012024-bauordnung-fuer-das-land-nordrhein-westfalen-landesbauordnung-2018-bauo-nrw/` | Stand-Confirmation |
| gesetze.co BauO NRW main entry | `https://gesetze.co/NW/BauO_NRW/63` | Paragraph-permalink Fallback |

---

## 3. Blockers encountered

### Phase 11 stub-correction overhead — fired (7 wrong §§ — WORST density)

  | § (Phase 11 stub) | Stub claim | Actual title | Real § |
  | --- | --- | --- | --- |
  | § 5 | Abstandsflächen | Zugänge und Zufahrten | § 6 |
  | § 6 | Bauliche Anlagen mit großen Abmessungen | Abstandsflächen | (no separate §; Phase 11 phantom title) |
  | § 49 | Stellplätze und Garagen | Barrierefreies Bauen | § 48 |
  | § 50 | Spielplätze | Sonderbauten (Definition) | § 8 |
  | § 60 | Gebäudeklassen | Grundsatz | § 2 (Begriffe) |
  | § 63 | Vereinfachtes Verfahren | Genehmigungsfreistellung | § 64 |
  | § 64 | Reguläres Verfahren | Vereinfachtes | § 65 |
  | § 65 | Sonderbau-Verfahren | reguläres Verfahren | (no separate §; Sonderbauten = § 50) |
  | § 67 | Bauvorlageberechtigung ✓ | (correct) | (correct) |
  | § 71 | Bautechnische Nachweise | Behandlung des Bauantrags | § 68 |

Phase 12 systemBlock + allowedCitations use the verified mapping
throughout. The ✗ FALSCHE block in the systemBlock explicitly bans
the most dangerous historical errors (§ 5 Abstandsflächen / § 49
Stellplätze / § 65 Sonderbau-Verfahren).

This crosses the **>5-stub-error escalation threshold** Rutik
defined. Surfacing for awareness; proceeding per the directive.

### Blocker B6 — partial fire

- **What fired:** recht.nrw.de HTML SPA blocked (per source-access-check). MITIGATION: PDF URL bypasses the SPA; full BauO NRW 2018 (Stand 01.01.2024) PDF retrieved cleanly.
- **Mitigation:** Path A pure on PDF + gesetze.co paragraph permalink fallback.

### Blocker (VV TB NRW + Stellplatzverordnung NRW) — fired

- **What fired:** Verwaltungsvorschrift Technische Baubestimmungen NRW + Stellplatzverordnung NRW not probed.
- **Mitigation:** visible-gap rule. PHASE_12_NRW_VV_REQUESTS.md is empty; systemBlock surfaces "in Vorbereitung" framing.

---

## Reviewer signoff

- [ ] Section 1 (6 entries) read.
- [ ] Section 2 spot-checked.
- [ ] Section 3 — 7 stub corrections + escalation-threshold acknowledgment.
- [ ] `verify:bayern-sha` green.
- [ ] `smoke:citations` green.
- [ ] systemBlock spot-read.

**Signed off:** *(name + ISO date)*
