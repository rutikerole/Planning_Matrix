// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #73 — PDF text sanitizer (formerly "WinAnsi-safe").
//
// pdf-lib's standard Helvetica family is WinAnsi-encoded (Latin-1
// only). Characters outside that range — em dash, en dash, smart
// quotes, ellipsis, arrows, non-breaking space variants, zero-width
// joiners — throw `Error: WinAnsi cannot encode 0x…` from drawText.
//
// v1.0.11 Bug 22 — extended scope. The brand-TTF path (Inter +
// Instrument Serif) previously bypassed sanitization entirely, so
// pdf-lib + fontkit could auto-apply the OpenType `liga` GSUB feature
// during text layout. The resulting PDF stream carried ligature
// glyph indices (ﬁ / ﬂ / ﬃ / ﬄ) that PDF viewers' text extraction
// chain mapped to substitute codepoints (visible "conċrmed" /
// "PČicht" / "Čoor"). Two-part fix:
//
//   (1) decomposeLigatures — ALWAYS run, regardless of font path.
//       Strips any literal U+FB0x ligature codepoints that already
//       exist in source / persona-emitted content, swapping them
//       for plain ASCII pairs.
//
//   (2) preventBrandLigatures — only on brand-TTF path. Injects a
//       U+200C zero-width-non-joiner between f+i / f+l / f+f pairs.
//       The ZWNJ is a Unicode default-ignorable character; Inter
//       and most modern TTFs render it as nothing. Crucially, it
//       breaks the GSUB ligature substitution chain so fontkit's
//       layout() leaves the underlying "f" and "i" / "l" glyphs
//       separate. Text extraction then yields clean "fi" /  "fl".
//
//       ZWNJ is OUTSIDE WinAnsi range, so it MUST NOT run on the
//       Helvetica fallback path — that path strips ZWNJ via the
//       existing zero-width drop rule below.
//
// Layout: REPLACEMENTS is the WinAnsi-fallback-only table (kept
// verbatim from Phase 3.6); the new ligature helpers are exported
// separately for the brand-TTF path.
// ───────────────────────────────────────────────────────────────────────

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Dashes
  [/[—―]/g, '-'], // em dash, horizontal bar
  [/[‒–]/g, '-'], // figure dash, en dash
  [/[‐‑]/g, '-'], // hyphen, non-breaking hyphen
  // Quotes
  [/[‘’‚‛]/g, "'"], // ‘ ’ ‚ ‛
  [/[“”„‟]/g, '"'], // “ ” „ ‟
  // Ellipsis + bullets + interpunct preserve
  [/…/g, '...'], // …
  [/•/g, '-'], // •
  // Arrows
  [/→/g, '->'], // →
  [/←/g, '<-'], // ←
  [/↑/g, '^'], // ↑
  [/↓/g, 'v'], // ↓
  // Whitespace edge cases — regexes match NBSP and zero-width by codepoint.
  /* eslint-disable no-irregular-whitespace */
  [/ /g, ' '], // nbsp → space (WinAnsi has nbsp at 0xA0 but pdf-lib's Helvetica WinAnsi mapping is fussy)
  [/​|‌|‍|﻿/g, ''], // zero-widths (INCLUDES U+200C ZWNJ — must run AFTER preventBrandLigatures wouldn't, but this table is fallback-only so safe)
  /* eslint-enable no-irregular-whitespace */
  // Common ligature codepoints pdf-lib's Helvetica often refuses.
  // (Also handled separately by decomposeLigatures for the brand-TTF
  // path — kept here for the fallback path as a belt-and-braces.)
  [/ﬀ/g, 'ff'], // ﬀ U+FB00
  [/ﬁ/g, 'fi'], // ﬁ U+FB01
  [/ﬂ/g, 'fl'], // ﬂ U+FB02
  [/ﬃ/g, 'ffi'], // ﬃ U+FB03
  [/ﬄ/g, 'ffl'], // ﬄ U+FB04
  [/ﬅ/g, 'st'], // ﬅ U+FB05
]

/**
 * Map common Unicode characters to their nearest WinAnsi-safe ASCII
 * equivalent. Idempotent on already-safe input. Falls through unmapped
 * codepoints — at least the WinAnsi-supported ones (Latin-1) survive
 * untouched; the remainder may still throw, but the hot path (literal
 * em dashes in our own copy + smart quotes from model output) is
 * covered.
 */
export function winAnsiSafe(text: string): string {
  let out = text
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement)
  }
  return out
}

/**
 * v1.0.11 Bug 22 — ALWAYS run. Decomposes any literal Unicode ligature
 * codepoints (U+FB00..U+FB05) into their ASCII letter pairs. Safe
 * regardless of font path: source strings rarely contain these
 * codepoints, but persona-emitted content or copy-pasted German text
 * sometimes does.
 *
 * Distinct from the WinAnsi-fallback table above (which has additional
 * mappings for dashes / quotes / arrows). This helper is the
 * minimum-viable ligature decomposition that runs even when brand
 * TTFs are loaded successfully.
 */
export function decomposeLigatures(text: string): string {
  return text
    .replace(/ﬀ/g, 'ff') // U+FB00
    .replace(/ﬁ/g, 'fi') // U+FB01
    .replace(/ﬂ/g, 'fl') // U+FB02
    .replace(/ﬃ/g, 'ffi') // U+FB03
    .replace(/ﬄ/g, 'ffl') // U+FB04
    .replace(/ﬅ/g, 'st') // U+FB05
}

/**
 * v1.0.11 Bug 22 — brand-TTF path ONLY (do not call on the
 * Helvetica/WinAnsi fallback path). Injects a U+200C zero-width-non-
 * joiner between f+i, f+l, f+f letter pairs to prevent fontkit's
 * layout() from applying OpenType `liga` substitution at PDF embed
 * time. Without this, the embedded PDF text stream carries ligature
 * glyph indices that some PDF viewers' text-extraction layer maps
 * to substitute codepoints (visible "conċrmed" / "PČicht" / "Čoor"
 * in production).
 *
 * U+200C is a Unicode default-ignorable character; Inter renders it
 * as nothing visible. Crucially, it breaks the GSUB ligature
 * substitution chain so f and i (or l, or f) end up as separate
 * glyph runs. Text extraction yields clean "fi" / "fl" / "ff".
 *
 * Must NOT run on the WinAnsi fallback path: U+200C is outside
 * WinAnsi range and would throw `Error: WinAnsi cannot encode 0x200C`.
 */
export function preventBrandLigatures(text: string): string {
  // Match the f-pairs that commonly auto-ligature: fi, fl, ff (which
  // may further compose to ffi / ffl). Use the ZWNJ to break the
  // shaping chain between EACH consecutive letter pair so chained
  // triples like "ffi" become "f‌f‌i" — three separate
  // glyph runs, no ffi-ligature.
  // Case-sensitive on purpose: F+I usually doesn't auto-ligature in
  // OpenType `liga` (it's lowercase-only by convention).
  return text.replace(/f([ifl])/g, 'f‌$1')
}
