// ───────────────────────────────────────────────────────────────────────
// v1.0.4 — env-driven legal-page config (replaces inline {{...}}
// placeholders).
//
// Keys (all VITE_LEGAL_*, public — they end up rendered to the user
// anyway under § 5 DDG):
//
//   VITE_LEGAL_ANBIETER_NAME
//   VITE_LEGAL_ANBIETER_STRASSE_HAUSNUMMER
//   VITE_LEGAL_ANBIETER_PLZ
//   VITE_LEGAL_ANBIETER_ORT
//   VITE_LEGAL_KONTAKT_TELEFON
//   VITE_LEGAL_KONTAKT_EMAIL
//   VITE_LEGAL_UST_ID_HINWEIS
//   VITE_LEGAL_HANDELSREGISTER_HINWEIS
//
// Build-time validator: scripts/verify-legal-config.mjs.  Wired into
// `npm run prebuild` so any unset value (or any residual `{{...}}`
// placeholder under src/features/legal/) fails the build.
//
// Runtime fail-closed posture: `getLegalConfig()` returns a discriminated
// union — `{ ok: true, ...values }` or `{ ok: false, missing: [...] }`.
// Pages render a fail-closed banner ("Impressum unavailable — contact
// operator") when ok=false, instead of leaking literal `{{...}}` tokens
// to the visitor's eyeballs (the exact failure mode the v1.0.3 audit
// flagged as a § 5 DDG public-traffic violation).
// ───────────────────────────────────────────────────────────────────────

const REQUIRED_KEYS = [
  'VITE_LEGAL_ANBIETER_NAME',
  'VITE_LEGAL_ANBIETER_STRASSE_HAUSNUMMER',
  'VITE_LEGAL_ANBIETER_PLZ',
  'VITE_LEGAL_ANBIETER_ORT',
  'VITE_LEGAL_KONTAKT_TELEFON',
  'VITE_LEGAL_KONTAKT_EMAIL',
  'VITE_LEGAL_UST_ID_HINWEIS',
  'VITE_LEGAL_HANDELSREGISTER_HINWEIS',
] as const

export type LegalConfigKey = (typeof REQUIRED_KEYS)[number]

export interface LegalConfigValues {
  anbieterName: string
  anbieterStrasseHausnummer: string
  anbieterPlz: string
  anbieterOrt: string
  kontaktTelefon: string
  kontaktEmail: string
  ustIdHinweis: string
  handelsregisterHinweis: string
}

export type LegalConfigResult =
  | { ok: true; values: LegalConfigValues }
  | { ok: false; missing: LegalConfigKey[] }

/**
 * Read VITE_LEGAL_* env. Returns ok=false if ANY required value is
 * missing OR still wrapped in {{...}} (defense against an env file
 * that copy-pasted the old placeholder shape).
 *
 * Evaluated lazily so SSR / test harnesses don't blow up at
 * import time.
 */
export function getLegalConfig(): LegalConfigResult {
  const env = import.meta.env as Record<string, string | undefined>
  const missing: LegalConfigKey[] = []
  const values: Partial<LegalConfigValues> = {}
  const map: Array<[LegalConfigKey, keyof LegalConfigValues]> = [
    ['VITE_LEGAL_ANBIETER_NAME', 'anbieterName'],
    ['VITE_LEGAL_ANBIETER_STRASSE_HAUSNUMMER', 'anbieterStrasseHausnummer'],
    ['VITE_LEGAL_ANBIETER_PLZ', 'anbieterPlz'],
    ['VITE_LEGAL_ANBIETER_ORT', 'anbieterOrt'],
    ['VITE_LEGAL_KONTAKT_TELEFON', 'kontaktTelefon'],
    ['VITE_LEGAL_KONTAKT_EMAIL', 'kontaktEmail'],
    ['VITE_LEGAL_UST_ID_HINWEIS', 'ustIdHinweis'],
    ['VITE_LEGAL_HANDELSREGISTER_HINWEIS', 'handelsregisterHinweis'],
  ]
  for (const [k, dst] of map) {
    const v = env[k]?.trim() ?? ''
    if (!v || /\{\{[A-Z_]+\}\}/.test(v)) {
      missing.push(k)
    } else {
      values[dst] = v
    }
  }
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true, values: values as LegalConfigValues }
}

export const LEGAL_CONFIG_REQUIRED_KEYS = REQUIRED_KEYS
