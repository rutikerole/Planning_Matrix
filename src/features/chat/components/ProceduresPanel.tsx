import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import type { Procedure } from '@/types/projectState'
import { RailSectionHeader } from './RailSectionHeader'
import { StatusPill } from './StatusPill'

interface Props {
  procedures: Procedure[]
}

export function ProceduresPanel({ procedures }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const active = useChatStore((s) => s.currentActivitySection) === 'procedures'

  return (
    <RailSectionHeader
      title={t('chat.rail.procedures')}
      count={procedures.length}
      active={active}
      emptyCopy={t('chat.rail.proceduresEmpty')}
    >
      {procedures.length > 0
        ? procedures.map((p) => (
            <div key={p.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-medium text-ink leading-snug">
                  {lang === 'en' ? p.title_en : p.title_de}
                </p>
                <StatusPill status={p.status} />
              </div>
              <p className="text-[11px] text-ink/65 leading-relaxed">
                {lang === 'en' ? p.rationale_en : p.rationale_de}
              </p>
              <p className="text-[10px] text-clay/65 italic uppercase tracking-[0.14em]">
                {p.qualifier.source} · {p.qualifier.quality}
              </p>
            </div>
          ))
        : null}
    </RailSectionHeader>
  )
}
