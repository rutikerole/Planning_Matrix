# `/public/fonts/`

## Self-hosted brand fonts (DSGVO compliant)

All font assets are served directly from this origin to remove the third-party Google Fonts CDN dependency. Background: LG München I, 20 January 2022 (3 O 17493/20) ruled that embedding Google Fonts via `fonts.googleapis.com` transmits the visitor's IP address to a third country (US) without legal basis under DSGVO Art. 6 — €100 damages per request. Self-hosting eliminates the cross-border data flow.

## Formats and consumers

WOFF2 covers the rendered UI. `pdf-lib` + `@pdf-lib/fontkit` cannot decode WOFF2, so the PDF export path (`src/lib/fontLoader.ts`, dynamic-imported by `chat/lib/exportPdf.ts`) uses TTF directly. Both formats are cached immutably via `vercel.json`.

| File | Format | Used by |
|---|---|---|
| `Inter-Variable-latin.woff2` | WOFF2 | SPA `@font-face` (UI) |
| `InstrumentSerif-Regular-latin.woff2` | WOFF2 | SPA `@font-face` (UI) |
| `InstrumentSerif-Italic-latin.woff2` | WOFF2 | SPA `@font-face` (UI) |
| `JetBrainsMono-Regular.woff2` | WOFF2 | SPA `@font-face` (UI) |
| `JetBrainsMono-Medium.woff2` | WOFF2 | SPA `@font-face` (UI) |
| `Inter-Regular.ttf` | TTF | PDF export (`pdf-lib`) |
| `Inter-Medium.ttf` | TTF | PDF export (`pdf-lib`) |
| `InstrumentSerif-Regular.ttf` | TTF | PDF export (`pdf-lib`) |
| `InstrumentSerif-Italic.ttf` | TTF | PDF export (`pdf-lib`) |

WOFF2 files are the `latin` subset only (DE + EN don't need cyrillic / vietnamese / latin-ext) — total ~278 KB. TTF files ship unsubsetted (~970 KB total) so the PDF export never tofu-renders an unexpected glyph; they're only fetched at export time and cached immutably thereafter.

## Sources

- **Inter** (Regular + Medium TTFs from Inter v4.1 release, Variable WOFF2 latin subset) — https://github.com/rsms/inter — OFL-1.1
- **Instrument Serif** (TTFs + WOFF2 latin subset) — https://github.com/Instrument/instrument-serif — OFL-1.1
- **JetBrains Mono** (WOFF2) — https://github.com/JetBrains/JetBrainsMono — OFL-1.1

See `LICENSES.txt` for the full OFL-1.1 license text. OFL § 4 explicitly permits embedding into other software, including web embedding via `@font-face` and PDF embedding via `pdf-lib`, provided the license text travels with the font.

## CSS reference

`src/styles/globals.css` and `src/features/landing/styles/tokens.css` have the `@font-face` blocks pointing at the WOFF2 files. `index.html` does not preconnect or stylesheet-load from `fonts.googleapis.com` / `fonts.gstatic.com`.
