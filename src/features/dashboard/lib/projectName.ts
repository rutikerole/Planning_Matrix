import i18n from 'i18next'
import type { Intent } from '@/features/wizard/lib/selectTemplate'

const LABEL_BY_INTENT: Record<Intent, { de: string; en: string }> = {
  neubau_einfamilienhaus: { de: 'Einfamilienhaus', en: 'Single-family home' },
  neubau_mehrfamilienhaus: { de: 'Mehrfamilienhaus', en: 'Multi-family home' },
  sanierung: { de: 'Sanierung', en: 'Renovation' },
  umnutzung: { de: 'Umnutzung', en: 'Change of use' },
  abbruch: { de: 'Abbruch', en: 'Demolition' },
  aufstockung: { de: 'Aufstockung', en: 'Storey addition' },
  anbau: { de: 'Anbau', en: 'Extension' },
  sonstige: { de: 'Projekt', en: 'Project' },
}

/**
 * Friendly project-name suggestion derived from the user's intent
 * and (optionally) their plot address. Replaces the previous
 * `Neubau Einfamilienhaus, Türkenstraße 25` template-flavoured
 * default so the dashboard rows don't collide on identical names.
 *
 *   intent = neubau_einfamilienhaus, address = "Türkenstraße 25, 80799 München"
 *   → "Einfamilienhaus Türkenstraße"
 */
export function suggestProjectName(intent: Intent, address?: string | null): string {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'de'
  const label = LABEL_BY_INTENT[intent][lang]
  if (!address) return label
  const street = extractStreetName(address)
  return street ? `${label} ${street}` : label
}

/**
 * Pull the street name out of an address. Handles compound names
 * with hyphens (e.g. "Hans-Sachs-Straße 10, 80469 München" →
 * "Hans-Sachs-Straße"). Returns null if no street + house-number
 * pattern is present.
 */
export function extractStreetName(addr: string): string | null {
  const match = addr.match(/^([\p{L}\p{M}\d.\- ]+?)\s+\d+/u)
  return match?.[1]?.trim() ?? null
}
