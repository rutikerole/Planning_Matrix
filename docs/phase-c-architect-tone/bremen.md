# Bremen — Architect-Tone Diagnostic (Phase C item #2)

Rendered DE PDF: `/tmp/atone-bremen.txt`. Classified against [`_FINDINGS.md`](./_FINDINGS.md).

## ⛔ Tier-0 leaks (wrong citations actually rendered in this state's PDF)

- **[F1] Brandschutznachweis → `§ 14 NBauO`** (extract line 130: "· Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse) · § 14 NBauO") — should be a Bremen §, not Niedersachsen. Bremen's fire-protection § lives in the **BremLBO**, not NBauO. Source `src/legal/requiredDocuments.ts:108`.

> F2 (`§ 60 NBauO` verfahrensfrei/Anzeige row) does NOT appear — this is a regular-procedure T-01 case, no "Anzeige-Formular (verfahrensfrei)" row is rendered.
> F3 (`BremDSchG § 9` Denkmalrechtliche Erlaubnis row) does NOT appear — Denkmalschutz=false (extract line 203), so the Denkmal document row is not rendered.

## ⚠ Boilerplate / template-stamped prose (quoted from this state's PDF)

| Rendered string (quote) | Extract line | Finding | Source file:line |
|---|---|---|---|
| "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 64 BremLBO) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 112–113 (also 63–64) | F7 (procedure-name doubling) | `src/legal/resolveProcedure.ts:436` + `src/legal/stateLocalization.ts:377` |
| "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 113 (also 64) | F9 (generic procedure hedge) | `src/legal/resolveProcedure.ts:436` |
| "• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt." | 114–115 | F8 (procedure deferral caveat) | `src/legal/resolveProcedure.ts:445-446` |
| "Landesamt für Denkmalpflege Bremen; BremDSchG regelt Erlaubnispflichten." | 270–271 | F4 (generic monument authority) | `src/legal/stateCitations.ts:196` → `src/features/chat/lib/pdfSections/glossary.ts:162` |
| "Bauvorlageberechtigt nach § 65 BremLBO; reicht den Antrag ein." | 151 | F12 (generic role qualifications) | `src/features/result/lib/roleEffortLookup.ts:55-84` |

> F5 ("Untere Denkmalbehörde (Stadt Bremen)") does NOT appear — no Denkmal document row is rendered in this extract.
> F10 (docs stub-footer) does NOT appear — see State-specific notes.
> F11 (LegalLandscape FEDERAL_OVERRIDES) is a tab-only string and does not surface in the PDF extract.

## ✅ Authored — state-specific, reads correct (leave alone)

- **A1 · Corpus procedure §** — `§ 64 BremLBO` (regular procedure; extract lines 111, 207) and `§ 63 BremLBO` (extract line 49). Reads state-specific.
- **A2 · Adjacent-law short names** — `BremBauVorlV` (extract lines 120, 122, 124, 138, 140), `BremDSchG` (extract lines 49, 269–271). Correct Bremen short names.
- **A3 · Submission/structural §§** — `§ 68 BremLBO` Bauantragsformular (extract line 126), `§ 66 BremLBO` Standsicherheitsnachweis (extract lines 79, 128, 153). State-specific.
- **A4 · Capital city** — "Stadtarchiv Bremen" (extract line 59); also "Bremen" as Bundesland (extract lines 9, 198). Correct.

## State-specific notes

- **Monument authority (F4 target):** the generic "Landesamt für Denkmalpflege Bremen" is rendered (extract line 270); the likely-correct name to author is **Landesamt für Denkmalpflege Bremen**. (In this case the generic interpolation happens to coincide with the plausibly-correct name — but still **verify before authoring; do NOT assert as verified.**)
- **Does F10 (docs stub-footer "Landesspezifische Einreichungs-§§ in Vorbereitung") appear?** **No.** All document rows render real `BremBauVorlV § 3` / `§ 68 BremLBO` / `§ 66 BremLBO` citations (extract lines 119–140); the stub-footer is not present.
- **Other quirks:** Bremen is a Stadtstaat, so the F5 "Stadt {capital}" templating would happen to be correct here — but it does not surface because Denkmalschutz=false. The glossary header reads "BremBauVorlV · Bremen" then describes it as "Landesbauordnung Bremen" (extract lines 266–268), conflating the BremBauVorlV short name with the Bauordnung description.
