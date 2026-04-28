import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import type { Procedure } from '@/types/projectState'
import { ScheduleRow, ScheduleSection } from './ScheduleSection'
import { StatusPill } from './StatusPill'

interface Props {
  procedures: Procedure[]
}

/**
 * Phase 3.2 #40 — Verfahren in architectural-schedule register:
 * Roman numeral I, italic Serif row indices in a 24px column,
 * StatusPill on the right of each row.
 */
export function ProceduresPanel({ procedures }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const active = useChatStore((s) => s.currentActivitySection) === 'procedures'

  return (
    <ScheduleSection
      numeral="I"
      title={t('chat.rail.procedures')}
      count={procedures.length}
      active={active}
      emptyCopy={t('chat.rail.proceduresEmpty')}
    >
      {procedures.length > 0
        ? procedures.map((p, idx) => (
            <ScheduleRow
              key={p.id}
              index={idx + 1}
              title={lang === 'en' ? p.title_en : p.title_de}
              meta={<StatusPill status={p.status} />}
              sub={lang === 'en' ? p.rationale_en : p.rationale_de}
              qualifier={`${p.qualifier.source} · ${p.qualifier.quality}`}
            />
          ))
        : null}
    </ScheduleSection>
  )
}
