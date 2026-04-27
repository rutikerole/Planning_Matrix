import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  specialist: string
  className?: string
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
 * 6 px filled clay dot followed by an uppercase Inter 11 / tracking-
 * 0.16em label. Rendered above every assistant message.
 */
export function SpecialistTag({ specialist, className }: Props) {
  const { t } = useTranslation()
  const label = t(SPECIALIST_LABEL_KEYS[specialist] ?? `chat.specialists.${specialist}`)
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-clay leading-none',
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-clay shrink-0" />
      <span>{label}</span>
    </p>
  )
}
