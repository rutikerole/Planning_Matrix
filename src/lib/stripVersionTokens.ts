// v1.0.29 Bug 67/82 — defensive scrub of internal version tokens (e.g.
// "v1.0.21", "in v1.0.23") that must never reach user-facing text. The data
// roots are fixed at source (stateCitations STUB_VERIFY, pdfSections/glossary);
// this is a belt-and-braces guard for persona-emitted strings the deterministic
// pipeline cannot edit. Idempotent and safe on already-clean text.

const VERSION_TOKEN = /\b(?:in\s+)?v\d+\.\d+(?:\.\d+)?\b/gi

export function stripVersionTokens(text: string): string {
  if (!text) return text
  return text
    .replace(VERSION_TOKEN, '')
    .replace(/\(\s*\)/g, '') // empty parens left behind, e.g. "(v1.0.23)"
    .replace(/\s+([—,.;:)])/g, '$1') // orphaned space before punctuation
    .replace(/\s{2,}/g, ' ')
    .trim()
}
