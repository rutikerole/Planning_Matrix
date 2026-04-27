import type { TemplateId } from '@/types/projectState'

export type Intent =
  | 'neubau_einfamilienhaus'
  | 'neubau_mehrfamilienhaus'
  | 'sanierung'
  | 'umnutzung'
  | 'abbruch'
  | 'sonstige'

export const INTENT_VALUES: readonly Intent[] = [
  'neubau_einfamilienhaus',
  'neubau_mehrfamilienhaus',
  'sanierung',
  'umnutzung',
  'abbruch',
  'sonstige',
] as const

/**
 * Map the user's I-01 answer to the template that backs the conversation.
 * v1 fully fleshes only T-01; T-02..T-05 fall through to T-01 with
 * annotations in the system prompt. `sonstige` also falls back to T-01
 * and is surfaced in-thread as a SYSTEM row (D12).
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
    case 'sonstige':
      return 'T-01'
  }
}
