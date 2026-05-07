# Phase 12 — Niedersachsen fetch dry-run

**Date:** 2026-05-07. **Method:** WebFetch + WebSearch on
voris.wolterskluwer-online.de.

## TL;DR

- Path A pure: voris.wolterskluwer-online.de paragraph permalinks
  serve readable § text via server-side fetch (UUID-based URLs;
  search-derivable). Confirmed for §§ 5 / 60 / 62 / 63 / 64 / 70.
- **Wildly-wrong-claim discovery (surfaced per the rule):** the
  PHASE_12_SCOPE.md NS row cites "NBauO 2012 + 2022-Novelle". Reality:
  there is also an **NBauO Novelle in Kraft seit 01.07.2025**
  (referenced by IHK Hannover and weka.de). The Phase 11 NS stub
  predates it; Phase 12 NS content commit anchors to the post-
  01.07.2025 fassung where reachable.
- **Phase 11 stub-correction overhead (5 wrong §§ — same density
  as Hessen):**
  - § 53: stub claimed "Bauvorlageberechtigung" → actual title is
    "Entwurfsverfasserin und Entwurfsverfasser" (the substantive
    content is the same — Entwurfsverfasser must be bauvorlage-
    berechtigt — but the §-title differs).
  - § 62: stub claimed "Vereinfachtes Verfahren" → actual is
    "Sonstige genehmigungsfreie Baumaßnahmen". Vereinfachtes
    Verfahren is § 63.
  - § 63: stub claimed "Reguläres Verfahren" → actual is
    "Vereinfachtes Baugenehmigungsverfahren". Reguläres is § 64.
  - § 65: stub claimed "Sonderbauten" → actual is "Bautechnische
    Nachweise, Typenprüfung". Sonderbauten als Kategorie sind in
    § 2 Abs. 5 definiert; ein eigenes Sonderbau-Verfahren existiert
    nicht — Sonderbauten laufen über § 64 (regulär), per § 63
    Verbatim-Ausschluss.
  - § 67: stub claimed "Bautechnische Nachweise" → actual is
    "Bauantrag und Bauvorlagen". Nachweise sind § 65.

## Working URL pattern + retrieved §§

| § | UUID | Verbatim retrieved | Stand |
| --- | --- | --- | --- |
| § 5 NBauO Grenzabstände | `e807db8f-7202-30e1-a88b-8f1ff76cf135` | 0,4 H allgemein, mind. 3 m (current; 0,5 H is OLD pre-2024 fassung) | aktuelle Fassung |
| § 60 NBauO Verfahrensfreie Baumaßnahmen | `6714cd1e-...` | Abs. 1 verbatim: *"Die im Anhang genannten baulichen Anlagen und Teile baulicher Anlagen dürfen in dem dort festgelegten Umfang ohne Baugenehmigung errichtet ... (verfahrensfreie Baumaßnahmen)."* | 01.07.2024 |
| § 62 NBauO Sonstige genehmigungsfreie Baumaßnahmen | `3ff226fc-...` (current; older URL `45e744d6-...` returned 2012-Fassung) | Abs. 1 (partial, current Stand 01.07.2025): *"Keiner Baugenehmigung bedarf die Errichtung von Wohngebäuden der Gebäudeklassen 1, 2 und 3, auch mit Räumen für freie Berufe..."* | 01.07.2025 |
| § 63 NBauO Vereinfachtes Baugenehmigungsverfahren | `605e21f7-...` (older — Stand 2019-2021) | Abs. 1 verbatim: *"Das vereinfachte Baugenehmigungsverfahren wird durchgeführt für die genehmigungsbedürftige Errichtung, Änderung oder Nutzungsänderung baulicher Anlagen, mit Ausnahme von baulichen Anlagen, die nach Durchführung der Baumaßnahme Sonderbauten im Sinne des § 2 Abs. 5 sind."* | 01.01.2019 - 16.11.2021 (alte Fassung — current may differ) |
| § 64 NBauO Baugenehmigungsverfahren | `1221d8ee-...` | Abs. 1 verbatim: *"Bei genehmigungsbedürftigen Baumaßnahmen, die nicht im vereinfachten Baugenehmigungsverfahren nach § 63 geprüft werden, prüft die Bauaufsichtsbehörde die Bauvorlagen auf ihre Vereinbarkeit mit dem öffentlichen Baurecht."* | ab 01.11.2012 (aktuelle Fassung) |
| § 70 NBauO Baugenehmigung und Teilbaugenehmigung | `f1f99283-...` | Abs. 1 verbatim: *"Die Baugenehmigung ist zu erteilen, wenn die Baumaßnahme, soweit sie genehmigungsbedürftig ist und soweit eine Prüfung erforderlich ist, dem öffentlichen Baurecht entspricht."* | 28.06.2023 (current) |
| Anhang NBauO Verfahrensfreie Baumaßnahmen | `ac680a18-...` | Catalogue referenced by § 60 — not directly fetched in dry-run | (current) |

## Verdict

PROCEED with Path A statutory text via voris permalinks. Source
quality: HIGH for the §§ I retrieved (verbatim quotes confirmed),
MEDIUM for any § not yet fetched (current-Stand uncertainty).

## What this dry-run does NOT decide

- Verbatim Anhang catalogue. The Anhang URL is known
  (`ac680a18-...`); a full read of the Anhang is deferred to commit
  time when specific entries are needed.
- DVO-NBauO + AVV-NBauO (Verwaltungsvorschriften). Path B manual per
  Rutik's hybrid; PHASE_12_NS_VV_REQUESTS.md captures the request
  list (likely empty for v1).

**NS content commit cleared to start.**
