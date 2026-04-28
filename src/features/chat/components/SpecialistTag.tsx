import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { SpecialistSigil } from './SpecialistSigils'

interface Props {
  specialist: string
  className?: string
  /** Polish Move 1 — render the italic German role label below the tag. */
  withRoleLabel?: boolean
  /** Phase 3.4 #56 — pass through to SpecialistSigil so the sigil's
   *  micro-animation runs while this specialist is thinking. */
  isActive?: boolean
}

const SPECIALIST_LABEL_KEYS: Record<string, string> = {
  moderator: 'chat.specialists.moderator',
  planungsrecht: 'chat.specialists.planungsrecht',
  bauordnungsrecht: 'chat.specialists.bauordnungsrecht',
  sonstige_vorgaben: 'chat.specialists.sonstige_vorgaben',
  verfahren: 'chat.specialists.verfahren',
  beteiligte: 'chat.specialists.beteiligte',
  synthesizer: 'chat.specialists.synthesizer',
}

/**
 * Polish Move 1 — Specialist Identity.
 *
 *   ●  PLANUNGSRECHT
 *      Planungsrecht
 *
 * Top line: clay dot 6px + Inter 11 tracking-0.20em (was 0.16em)
 * uppercase clay. Bottom line: italic Instrument Serif 13 ink/55,
 * always in German (the specialist's title — like a French menu uses
 * "sommelier" in English; we don't translate the role name).
 */
export function SpecialistTag({
  specialist,
  className,
  withRoleLabel = true,
  isActive,
}: Props) {
  const { t } = useTranslation()
  const tagLabel = t(SPECIALIST_LABEL_KEYS[specialist] ?? `chat.specialists.${specialist}`)
  const roleLabelDe = SPECIALIST_ROLE_LABELS_DE[specialist] ?? tagLabel

  return (
    <div className={cn('flex flex-col gap-1.5 leading-none', className)}>
      <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.20em] text-clay">
        {/* Phase 3.2 #38 — sigil replaces the simple clay dot.
         * 14×14 architectural drawing glyph in drafting-blue. */}
        <SpecialistSigil specialist={specialist} isActive={isActive} />
        <span>{tagLabel}</span>
      </p>
      {withRoleLabel && (
        <p className="role-running-head pl-[18px]">{roleLabelDe}</p>
      )}
    </div>
  )
}

/**
 * The specialist's printed-card title — German always, regardless of
 * UI locale. Sommelier rule.
 */
const SPECIALIST_ROLE_LABELS_DE: Record<string, string> = {
  moderator: 'Moderation',
  planungsrecht: 'Planungsrecht',
  bauordnungsrecht: 'Bauordnung',
  sonstige_vorgaben: 'Weitere Vorgaben',
  verfahren: 'Verfahrenssynthese',
  beteiligte: 'Beteiligten-Bedarf',
  synthesizer: 'Querschnitt',
}
