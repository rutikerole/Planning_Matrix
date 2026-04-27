import type { Intent } from './selectTemplate'

const INTENT_LABELS_DE: Record<Intent, string> = {
  neubau_einfamilienhaus: 'Neubau Einfamilienhaus',
  neubau_mehrfamilienhaus: 'Neubau Mehrfamilienhaus',
  sanierung: 'Sanierung',
  umnutzung: 'Umnutzung',
  abbruch: 'Abbruch',
  sonstige: 'Sonstiges',
}

/**
 * Project display name for the dashboard list. Always German — this is
 * a stored attribute of the project record, not UI text, and our brand
 * voice keeps named-things in German even when the UI is switched to
 * English. The format:
 *
 *   With plot:    "<intent_de_label> · <city>"
 *   Without plot: "<intent_de_label> · Projekt vom DD.MM.YYYY"
 *
 * `city` is extracted from the postcode segment of the address
 * (`\b\d{5}\s+(\w+)`); falls back to the last comma-separated chunk;
 * falls back to no city suffix at all.
 */
export function deriveName(intent: Intent, plotAddress: string | null): string {
  const label = INTENT_LABELS_DE[intent]

  if (plotAddress) {
    const trimmed = plotAddress.trim()

    // Prefer the postcode-anchored capture (Bayern PLZ start with 8 or 9
    // but we don't gate on that here — the model is the sanity check).
    const postcodeMatch = trimmed.match(/\b\d{5}\s+([^,]+)/)
    const cityFromPostcode = postcodeMatch?.[1]?.trim()
    if (cityFromPostcode) {
      return `${label} · ${cityFromPostcode}`
    }

    // Fall back to the last comma-separated chunk if it differs from the
    // whole address (i.e. there IS a comma).
    const lastChunk = trimmed.split(',').pop()?.trim()
    if (lastChunk && lastChunk !== trimmed) {
      return `${label} · ${lastChunk}`
    }

    return label
  }

  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()
  return `${label} · Projekt vom ${dd}.${mm}.${yyyy}`
}
