# /public/fonts/

PDF embedding for the export module (Phase 3.4 #55) prefers the
brand fonts. Drop the following TTF files here for the architectural-
document register:

- `Inter-Regular.ttf` (Google Fonts → Inter, weight 400)
- `Inter-Medium.ttf` (Google Fonts → Inter, weight 500)
- `InstrumentSerif-Regular.ttf` (Google Fonts → Instrument Serif, weight 400)
- `InstrumentSerif-Italic.ttf` (Google Fonts → Instrument Serif, italic 400)

Source URLs (download once, commit the .ttf files):
- https://fonts.google.com/specimen/Inter
- https://fonts.google.com/specimen/Instrument+Serif

If any of these files are missing at runtime, `fontLoader.ts` falls
back to the PDF-built-in Helvetica family + logs a console warning.
The export still works; the type just renders in Helvetica instead of
the brand stack.

These files are NOT lazy-loaded by the SPA — they only ship when the
user clicks Export, via the dynamic-imported `exportPdf.ts` module.
The brand TTFs together are ~600 kB; the export bundle keeps them
out of the main JS bundle.
