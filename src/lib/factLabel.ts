// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #70 — fact-key resolver
//
// `factLabel(key, locale)` is the single resolver for snake_case fact
// keys emitted by the model. Use it everywhere a fact appears in the
// UI: right rail, overview cockpit, result page, PDF + Markdown export.
//
// Lookup order:
//   1. Exact match in factLabelsDe / factLabelsEn (~80 keys each).
//   2. Generic humanizer — splits DOMAIN.SUBKEY on '.', tokenises on
//      '_', title-cases each token. Logs once per session in DEV so
//      we can grow the lookup table proactively.
// ───────────────────────────────────────────────────────────────────────

import { factLabelsDe, type FactLabel } from '@/locales/factLabels.de'
import { factLabelsEn } from '@/locales/factLabels.en'

const warned = new Set<string>()

export type FactLocale = 'de' | 'en'

/**
 * Resolve a fact key into a localised label + optional unit. Falls
 * back to a humanised render of the key itself when unmapped.
 */
export function factLabel(key: string, locale: FactLocale): FactLabel {
  const table = locale === 'en' ? factLabelsEn : factLabelsDe
  const hit = table[key]
  if (hit) return hit

  // Try a case-insensitive lookup before giving up — model
  // occasionally ships keys in mixed case.
  const upperKey = key.toUpperCase()
  const upperHit = table[upperKey]
  if (upperHit) return upperHit

  if (import.meta.env.DEV && !warned.has(key)) {
    warned.add(key)
    // eslint-disable-next-line no-console
    console.warn(
      `[factLabel] unmapped key: ${key}. Falling back to humanizer. ` +
        `Add it to /src/locales/factLabels.${locale}.ts.`,
    )
  }

  return { label: humanize(key) }
}

/**
 * Convenience: render a fact's value with its unit when one exists.
 * Pass through non-string values via JSON.stringify so consumers can
 * default to "{label}: {value}" rendering with no extra type guards.
 */
export function factValueWithUnit(
  key: string,
  value: unknown,
  locale: FactLocale,
): string {
  const { unit } = factLabel(key, locale)
  const rendered = typeof value === 'string' ? value : JSON.stringify(value)
  if (!unit) return rendered
  // Don't double-up a unit if the value already ends with it
  // (e.g. "150–200 mm" already carries "mm").
  if (rendered.toLowerCase().includes(unit.toLowerCase())) return rendered
  return `${rendered} ${unit}`
}

/**
 * The fallback humaniser. Splits on '.', tokenises on '_', title-cases.
 *   "STRUCTURAL.EXECUTION_DRAWINGS_REQUIRED"
 *     → "Structural · Execution Drawings Required"
 */
function humanize(key: string): string {
  return key
    .split('.')
    .map((segment) =>
      segment
        .split('_')
        .map(titleCase)
        .join(' '),
    )
    .join(' · ')
}

function titleCase(word: string): string {
  if (word.length === 0) return word
  // Preserve all-caps acronyms ≤ 4 chars (BPLAN, GRZ, GEG, BayBO, …).
  if (word === word.toUpperCase() && word.length <= 4) return word
  const lower = word.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
