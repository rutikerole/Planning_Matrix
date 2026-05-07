# Phase 12 Hessen — VV verification requests

**Status:** EMPTY — no Verwaltungsvorschrift cites requested.

The Hessen systemBlock (Phase 12 commit 1) does not cite any specific
HBauVwV (Hessische Bauaufsichts-Verwaltungsvorschrift) provisions.
Per the dry-run finding (`docs/PHASE_12_HESSEN_FETCH_DRYRUN.md`,
commit `be86fa8`), no reachable post-Baupaket-I HBauVwV consolidated
text was identified.

Per the visible-gap rule (`docs/PHASE_12_SCOPE.md` "Per-state content
scope" → "Visible-gap rule", landed in commit `cb3d517`), the
systemBlock surfaces this gap explicitly to the persona:

> *"Verwaltungsvorschriften zum HBauVwV werden in einer späteren
> Bearbeitungsphase ergänzt — bitte verifizieren Sie verfahrens-
> spezifische Anforderungen mit der zuständigen Bauaufsichtsbehörde
> des Landkreises bzw. der kreisfreien Stadt."*

A user asking about HBauVwV-Inhalte therefore gets an honest
"in Vorbereitung" answer + redirect to the zuständige Behörde,
not a confabulated paraphrase or a confident silence.

## When this file becomes non-empty

If a future Phase 12 follow-up identifies a reachable post-Baupaket-I
HBauVwV consolidated source (e.g., an IngKH Synopse extension, a
ministerial publication, or browser-side manual extraction by Rutik),
list each requested cite here in the format:

```
- HBauVwV Nr. X.Y (Kurz-Beschreibung)
  Claim in systemBlock: <verbatim sentence>
  Verification needed: paragraph text from the consolidated source
```

Rutik then opens the source in their browser and pastes the verified
text into a sibling `PHASE_12_HESSEN_VV_VERIFIED.md` file. The
systemBlock is updated to cite against that pasted text in a
subsequent commit.

For Phase 12 commit 1 (Hessen): NOT NEEDED. Empty.
