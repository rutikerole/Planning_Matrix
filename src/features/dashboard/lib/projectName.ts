import i18n from 'i18next'
import { INTENT_LABELS, type Intent } from '@/features/wizard/lib/selectTemplate'
import { extractStreetName as extractStreet } from '@/lib/addressParse'

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
  const label = INTENT_LABELS[intent][lang]
  if (!address) return label
  const street = extractStreet(address)
  return street ? `${label} ${street}` : label
}

// Re-export from src/lib/addressParse so existing consumers keep
// importing from this file's path. The real implementation lives
// in the shared lib.
export { extractStreetName } from '@/lib/addressParse'
