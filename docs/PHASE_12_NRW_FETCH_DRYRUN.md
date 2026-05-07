# Phase 12 — NRW fetch dry-run

**Date:** 2026-05-07. **Method:** WebFetch on recht.nrw.de PDF +
gesetze.co + AKNW Synopse PDFs.

## TL;DR

- **recht.nrw.de PDF fetchable** via direct PDF URL despite the
  HTML SPA being blocked. The 123-page Stand-01.01.2024 PDF
  retrieved cleanly. Confirms Path A statutory text **plus** a
  primary-source-grade alternative to the SPA portal.
- gesetze.co serves verbatim § text for BauO NRW (probed § 63 —
  works). Confirmed working as a paragraph-permalink fallback.
- AKNW hosts a Stand-01.01.2024 Synopse PDF (with Begründung) —
  background source for amendment context.
- **Phase 11 NRW stub had 7 wrong §§** — worst density of the
  three states so far. Corrections detailed below.

## Working sources

| Source | URL | Status | Used for |
| --- | --- | --- | --- |
| **recht.nrw.de PDF** (BauO NRW 2018, Stand 01.01.2024) | `https://recht.nrw.de/system/files/pdf/state-law-and-regulations/2018/08/08/c3e1a4/2024-01-01-bauordnung-fuer-das-land-nordrhein-west.pdf` | 200, 1.5 MB, 123 pages, readable via PDF Read | **Primary verbatim source.** ToC + Inhaltsübersicht read; specific §§ as needed. |
| gesetze.co BauO NRW | `https://gesetze.co/NW/BauO_NRW/<n>` | 200, readable | Paragraph-permalink fallback. § 63 Abs. 1 retrieved verbatim. |
| AKNW Synopse PDF | `https://www.aknw.de/fileadmin/user_upload/Gesetze-Verordnungen/Synopse_Landesbauordnung_NRW_24122023.pdf` | 200 | Background context: 31.10.2023-Novelle Begründung. |
| AKNW Bauherreninformation | `https://www.aknw.de/` | 200 | Architektenkammer reference. |
| recht.nrw.de HTML | `https://recht.nrw.de/lmi/owa/...` | 200 but SPA shell | Confirmed unusable (per source-access-check commit `3974df9`). |

## Phase 11 stub-correction overhead — 7 wrong §§ (worst yet)

| § (Phase 11 stub) | Stub claim | Actual title in BauO NRW 2018 (Stand 01.01.2024) | Real § for stub claim |
| --- | --- | --- | --- |
| § 5 | Abstandsflächen | "Zugänge und Zufahrten auf den Grundstücken" | § 6 |
| § 6 | Bauliche Anlagen mit großen Abmessungen | "Abstandsflächen" | (no separate § for "große Abmessungen"; Phase 11 phantom title) |
| § 49 | Stellplätze und Garagen | "Barrierefreies Bauen" | § 48 |
| § 50 | Spielplätze | "Sonderbauten" (Definition) | § 8 |
| § 60 | Gebäudeklassen | "Grundsatz" (für Genehmigungspflicht) | § 2 (Begriffe) |
| § 63 | Vereinfachtes Baugenehmigungsverfahren | "Genehmigungsfreistellung" | § 64 |
| § 64 | Baugenehmigungsverfahren (regulär) | "Vereinfachtes Baugenehmigungsverfahren" | § 65 |
| § 65 | Sonderbau-Verfahren | "Baugenehmigungsverfahren" (regulär) | (no separate Sonderbau-§; Sonderbauten als Kategorie = § 50) |
| § 67 | Bauvorlageberechtigung | "Bauvorlageberechtigung" ✓ | (correct) |
| § 71 | Bautechnische Nachweise | "Behandlung des Bauantrags" | § 68 |

Phase 12 systemBlock + allowedCitations use the verified §-mapping
throughout.

## Verbatim quotes available

- § 63 BauO NRW Abs. 1 first sentence (gesetze.co): *"Keiner Baugenehmigung bedarf unter den Voraussetzungen des Absatzes 2 die Errichtung, Änderung oder Nutzungsänderung von"*. Stand: 31.10.2023-Novelle, in Kraft 01.01.2024.

## Verdict

PROCEED. Path A pure for NRW via recht.nrw.de PDF + gesetze.co
permalinks.

**NRW content commit cleared to start.**
