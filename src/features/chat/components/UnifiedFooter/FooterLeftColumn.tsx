// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #75 / #77 — Footer left column
//
// Pulls the four bottom-of-left-rail items into the unified footer:
//
//   ▎ Briefing ansehen →           ← primary CTA (Q8 locked: drafting-blue/15)
//     Das ausführliche Dokument
//
//   Cockpit öffnen                  ← secondary
//   Exportieren                     ← secondary
//   Projekt verlassen               ← destructive
//
// Visual hierarchy: primary stands out as a real action band; secondary
// links are calm Inter 13 ink/75; the leave-project link gets a separator
// and a clay/68 tone (destructive but restrained).
// ───────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectRow, MessageRow } from '@/types/db'
import type { ProjectEventRow } from '../../hooks/useProjectEvents'
import { ExportMenu } from '../ExportMenu'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
}

export function FooterLeftColumn({ project, messages, events }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      {/* Primary CTA — Briefing ansehen → */}
      <Link
        to={`/projects/${project.id}/result`}
        className={cn(
          'group relative flex items-center justify-between gap-2 px-3 py-2',
          'bg-drafting-blue/15 border border-drafting-blue/25',
          'rounded-[var(--pm-radius-button,0.5rem)]',
          'transition-colors duration-soft hover:bg-drafting-blue/20 hover:border-drafting-blue/35',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drafting-blue/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[13px] font-medium text-drafting-blue leading-none">
            {t('chat.footer.briefingPrimary', {
              defaultValue: 'Briefing ansehen',
            })}
          </span>
          <span className="text-[11px] italic text-drafting-blue/75 leading-none">
            {t('chat.footer.briefingSubtitle', {
              defaultValue: 'Das ausführliche Dokument',
            })}
          </span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 text-drafting-blue/85 shrink-0 motion-safe:group-hover:translate-x-0.5 transition-transform duration-soft"
        />
      </Link>

      {/* Secondary cluster */}
      <div className="flex flex-col gap-1.5">
        <Link
          to={`/projects/${project.id}/overview`}
          className="text-[13px] text-ink/75 hover:text-ink transition-colors duration-soft self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          {t('chat.footer.cockpitSecondary', {
            defaultValue: 'Cockpit öffnen',
          })}
        </Link>

        <ExportMenu
          project={project}
          messages={messages}
          events={events}
          variant="ghost"
        />
      </div>

      <span aria-hidden="true" className="block h-px bg-ink/10 mt-1" />

      <Link
        to="/dashboard"
        className="text-[12.5px] text-clay/75 hover:text-clay-deep transition-colors duration-soft self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        {t('chat.footer.leaveSecondary', {
          defaultValue: '← Projekt verlassen',
        })}
      </Link>
    </div>
  )
}
