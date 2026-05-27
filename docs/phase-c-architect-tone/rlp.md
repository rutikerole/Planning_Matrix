# Rheinland-Pfalz — Architect-Tone Diagnostic (Phase C item #2)

Rendered DE PDF: `/tmp/atone-rlp.txt`. Classified against [`_FINDINGS.md`](./_FINDINGS.md).

> **Outlier note:** RLP is the structural-deferral outlier. It carries a hand-coded regular § (`§ 70 LBauO`) and an *honest* structural deferral (no Tragwerk § rendered on the Standsicherheitsnachweis row), and its extract DOES show the docs stub-footer (F10). The classification below reflects that.

## ⛔ Tier-0 leaks (wrong citations actually rendered in this state's PDF)

- **[F1] Brandschutznachweis → `§ 14 NBauO`** (extract line 130: "· Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse) · § 14 NBauO") — should be an RLP § (fire-protection in LBauO, e.g. § 15 LBauO per `_FINDINGS.md` F1), not Niedersachsen. Source `src/legal/requiredDocuments.ts:108`.

_F2 not applicable: this is a regular Baugenehmigungsverfahren render (T-01); no verfahrensfrei / Anzeige-Formular row appears in the extract._

_F3 not applicable: Denkmalschutz = false (extract line 204), so no "Denkmalrechtliche Erlaubnis · … DSchG § 9" row is rendered._

## ⚠ Boilerplate / template-stamped prose (quoted from this state's PDF)

| Rendered string (quote) | Extract line | Finding | Source file:line |
|---|---|---|---|
| "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 70 LBauO) als Ausgangspunkt" | 63–64 (also 112–113) | F7 (procedure-name doubling) | `src/legal/resolveProcedure.ts:436` + `src/legal/stateLocalization.ts:377` |
| "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 64 (also 113) | F9 (generic procedure hedge) | `src/legal/resolveProcedure.ts:436` |
| "• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt." | 114–115 | F8 (procedure deferral caveat) | `src/legal/resolveProcedure.ts:445-446` |
| "Landesspezifische Einreichungs-§§ in Vorbereitung — die genauen Dokumentanforderungen mit dem lokalen Bauamt abklären." | 143 | F10 (documents stub-footer) | `src/features/chat/lib/pdfStrings.ts:480-481` |
| "Landesamt für Denkmalpflege Rheinland-Pfalz; DSchG regelt Erlaubnispflichten." | 272–273 | F4 (generic monument-authority name) | `src/legal/stateCitations.ts:196` surfaced via `src/features/chat/lib/pdfSections/glossary.ts:162` |
| "Detail-§ noch nicht hinterlegt — mit Bauamt oder Architektenkammer abklären Tragwerk)." | 269–270 | F6 (Architektenkammer reference) / structural deferral in glossary | `src/legal/stateLocalization.ts:360-361`; structural-cert gap surfaced via `glossary.ts:156-157` |
| "Bauvorlageberechtigt nach § 64 LBauO; reicht den Antrag ein." | 152 | F12 (generic role qualification) | `src/features/result/lib/roleEffortLookup.ts:55-84` |

_F5 (Untere Denkmalbehörde (Stadt {capital})) not surfaced: no Denkmal document row in this render (Denkmalschutz false)._
_F11 (LegalLandscape federal overrides) not part of the PDF render._

## ✅ Authored — state-specific, reads correct (leave alone)

- Regular procedure §: **`§ 70 LBauO`** (hand-coded, A1) — extract lines 63, 111, 112, 208.
- Adjacent-law short names (A2): **`BauuntPrüfVO`** (extract lines 120, 122, 124, 138, 140, glossary 267) and **`DSchG`** (glossary 271).
- Submission §§ (A3): Bauantragsformular **`§ 63 LBauO`** (lines 126, glossary 268), role qualification **`§ 64 LBauO`** (line 152).
- Capital city (A4): **Mainz** — "Stadtarchiv Mainz" (line 59); also "bei Neubauten in Rheinland-Pfalz Pflicht" (line 158).

## State-specific notes

- **Monument authority (F4 target):** the generic "Landesamt für Denkmalpflege Rheinland-Pfalz" is rendered (extract line 272). The likely-correct name to author is **Generaldirektion Kulturelles Erbe (GDKE)** — mark as "verify before authoring"; do NOT assert as verified.
- **Does F10 (docs stub-footer "Landespezifische Einreichungs-§§ in Vorbereitung") appear?** **Yes.** It renders at extract line 143, immediately after the Asbest-/PCB row, closing the Dokumente section. This is the structural-deferral outlier behaviour described in the task — RLP still trips the stub-footer path because its submission §§ are not fully wired from the corpus.
- **Honest structural deferral (outlier signature):**
  - The Standsicherheitsnachweis (Statik) row renders with NO citation — "· Tragwerksplaner:in" (extract line 128), unlike Hamburg/M-V which show a § 66 anchor. This is the honest structural-cert deferral, not a leak.
  - The Tragwerksplaner:in role line reads "Standsicherheitsnachweis nach geltendem Landesrecht." (extract line 154) — a deferral phrasing rather than a hard §.
  - The glossary entry for BauuntPrüfVO carries the deferral inline: "Detail-§ noch nicht hinterlegt — mit Bauamt oder Architektenkammer abklären Tragwerk)" (extract lines 268–270). This is honest, but it surfaces the F6 Architektenkammer reference and reads awkwardly (the "Tragwerk)" tail is a template seam).
- **Cost-section quirk (F13-adjacent, out of scope):** the Tragwerksplanung cost row grounds on "Landesbauordnung Rheinland-Pfalz Nachweis" (extract line 79) instead of a specific § — consistent with the structural deferral, but listed only for awareness; cost calibration is Phase C item #4 and not touched here.
