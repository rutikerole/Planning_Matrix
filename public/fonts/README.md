# `/public/fonts/`

## Phase 8 — self-hosted brand fonts (DSGVO compliant)

Three WOFF2 files served directly from this origin to remove the third-party Google Fonts CDN dependency. Background: LG München I, 20 January 2022 (3 O 17493/20) ruled that embedding Google Fonts via `fonts.googleapis.com` transmits the visitor's IP address to a third country (US) without legal basis under DSGVO Art. 6 — €100 damages per request. Self-hosting eliminates the cross-border data flow.

| File | Family | Style | Subset | Source |
|---|---|---|---|---|
| `Inter-Variable-latin.woff2` | Inter | normal, weights 400–600 (variable) | latin | Google Fonts → Inter |
| `InstrumentSerif-Regular-latin.woff2` | Instrument Serif | normal 400 | latin | Google Fonts → Instrument Serif |
| `InstrumentSerif-Italic-latin.woff2` | Instrument Serif | italic 400 | latin | Google Fonts → Instrument Serif |

`latin` subset only — DE + EN don't need cyrillic / vietnamese / latin-ext. Total payload: ~91 KB across all three.

## Licenses

Both fonts are licensed under the SIL Open Font License v1.1 (OFL). See `LICENSES.txt` in this directory for the full license text. OFL § 4 explicitly permits embedding into other software, including web embedding via `@font-face`, provided the license text travels with the font.

## CSS reference

`src/index.css` has the `@font-face` blocks pointing at these files. `index.html` no longer preconnects or stylesheet-loads from `fonts.googleapis.com` / `fonts.gstatic.com`.

## PDF export

The export module (`src/lib/exportPdf.ts` via Phase 3.4 #55) used to look for separate `.ttf` files in this directory. WOFF2 is sufficient for the SPA; if the PDF export needs a different format, that will be wired in a follow-up commit. The fontLoader fallback to PDF-built-in Helvetica still works.
