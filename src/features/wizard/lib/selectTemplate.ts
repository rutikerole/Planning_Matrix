import type { TemplateId } from '@/types/projectState'

export type Intent =
  | 'neubau_einfamilienhaus'
  | 'neubau_mehrfamilienhaus'
  | 'sanierung'
  | 'umnutzung'
  | 'abbruch'
  | 'aufstockung'
  | 'anbau'
  | 'sonstige'

/**
 * Order rendered by the wizard's Q1 chip / sketch grid. v3 keeps the
 * legacy 6-item order for commit 1 so the existing chip grid still
 * renders unchanged; commit 2 swaps in the 8-card sketch grid and
 * extends this constant to all 8 intents.
 */
export const INTENT_VALUES: readonly Intent[] = [
  'neubau_einfamilienhaus',
  'neubau_mehrfamilienhaus',
  'sanierung',
  'umnutzung',
  'abbruch',
  'sonstige',
] as const

/**
 * Full 8-intent order for the v3 sketch grid. Used by commit 2's
 * QuestionIntent rewrite. Kept here so commit 2 can import it
 * without reaching into a migration-only file.
 */
export const INTENT_VALUES_V3: readonly Intent[] = [
  'neubau_einfamilienhaus',
  'neubau_mehrfamilienhaus',
  'sanierung',
  'umnutzung',
  'abbruch',
  'aufstockung',
  'anbau',
  'sonstige',
] as const

/**
 * The DB enum and the i18n key tree use slightly different slugs.
 * `Intent` is fixed by the `projects.intent` CHECK constraint; the
 * i18n tree is keyed by short slugs picked for the chip / sketch labels.
 */
export const INTENT_TO_I18N: Record<Intent, string> = {
  neubau_einfamilienhaus: 'neubau_efh',
  neubau_mehrfamilienhaus: 'neubau_mfh',
  sanierung: 'sanierung',
  umnutzung: 'umnutzung',
  abbruch: 'abbruch',
  aufstockung: 'aufstockung',
  anbau: 'anbau',
  sonstige: 'sonstige',
}

/**
 * Map the user's intent to the project template. v3 promotes
 * `sonstige` to its own template (T-08) instead of falling back to
 * T-01, and adds T-06 / T-07 for Aufstockung / Anbau.
 *
 * The chat-turn Edge Function will proxy T-06/T-07/T-08 through
 * T-01's system-prompt content for v1 of v3 — no changes there.
 */
export function selectTemplate(intent: Intent): TemplateId {
  switch (intent) {
    case 'neubau_einfamilienhaus':
      return 'T-01'
    case 'neubau_mehrfamilienhaus':
      return 'T-02'
    case 'sanierung':
      return 'T-03'
    case 'umnutzung':
      return 'T-04'
    case 'abbruch':
      return 'T-05'
    case 'aufstockung':
      return 'T-06'
    case 'anbau':
      return 'T-07'
    case 'sonstige':
      return 'T-08'
  }
}
