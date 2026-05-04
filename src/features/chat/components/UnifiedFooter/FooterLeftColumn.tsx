// ───────────────────────────────────────────────────────────────────────
// Phase 7 Pass 2 — Footer left column collapsed to a single mono-caps row.
//
//   View briefing  ·  Checklist  ·  Export ↗  ·  ← Leave
//
// The Phase 4.1.11 stack (drafting-blue Briefing CTA + secondary-row
// links) was visually heavy and duplicated the right-rail "Open
// checklist" outline button. Pass 2 reduces this to four sibling
// links separated by hairline dots — same destinations, less weight.
// ───────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectEventRow } from '../../hooks/useProjectEvents'
import { ExportMenu } from '../ExportMenu'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
}

const LINK_CLS =
  'font-mono text-[10px] tracking-[0.14em] uppercase text-ink-mute hover:text-clay transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm leading-none'

export function FooterLeftColumn({ project, messages, events }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 flex-wrap min-w-0">
      <Link
        to={`/projects/${project.id}/result`}
        className={LINK_CLS}
      >
        {t('chat.footer.briefingPrimary', { defaultValue: 'View briefing' })}
      </Link>
      <Sep />
      <Link
        to={`/projects/${project.id}/overview`}
        className={LINK_CLS}
      >
        {t('chat.footer.cockpitSecondary', { defaultValue: 'Checklist' })}
      </Link>
      <Sep />
      <ExportMenu
        project={project}
        messages={messages}
        events={events}
        variant="ghost"
        placement="top"
      />
      <Sep />
      <Link to="/dashboard" className={LINK_CLS}>
        {t('chat.footer.leaveSecondary', { defaultValue: '← Leave' })}
      </Link>
    </div>
  )
}

function Sep() {
  return (
    <span aria-hidden="true" className="text-clay/45 text-[10px]">
      ·
    </span>
  )
}
