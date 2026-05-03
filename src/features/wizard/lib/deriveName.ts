import type { Intent } from './selectTemplate'
import { extractCity } from '@/lib/addressParse'

const INTENT_LABELS_DE: Record<Intent, string> = {
  neubau_einfamilienhaus: 'Neubau Einfamilienhaus',
  neubau_mehrfamilienhaus: 'Neubau Mehrfamilienhaus',
  sanierung: 'Sanierung',
  umnutzung: 'Umnutzung',
  abbruch: 'Abbruch',
  aufstockung: 'Aufstockung',
  anbau: 'Anbau',
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
    const city = extractCity(plotAddress)
    if (city) return `${label} · ${city}`
    return label
  }

  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()
  return `${label} · Projekt vom ${dd}.${mm}.${yyyy}`
}
