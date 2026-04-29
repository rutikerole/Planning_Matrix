// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #75 / #77 — Footer left column
// Phase 4.1.11 — collapsed the secondary stack into a single horizontal
// row so total column height (≈ 70 px) is shorter than the InputBar's
// natural height (≈ 120 px). Was previously 4 stacked items totaling
// ≈ 136 px, which inflated the grid row and left empty space above
// InputBar's chip slot — visually orphaning the Continue / suggestion
// chips. Same actions, same link targets, same primary-vs-secondary
// hierarchy. Just packed horizontally.
//
//   ▎ Briefing ansehen →                              ← primary CTA
//     Das ausführliche Dokument                          (Q8 locked)
//
//   Cockpit · Exportieren · Projekt verlassen        ← secondary row
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
    <div className="flex flex-col gap-2 min-w-0">
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

      {/* Secondary row — [Checkliste öffnen]  ·  Export  ·  ← verlassen.
        * Post-Phase-3 hot-fix: "Cockpit öffnen" → "Checkliste öffnen"
        * (mental-model rename) AND the Checkliste affordance is now an
        * outline button instead of an inline text-link, so it reads as
        * a real CTA. Export keeps its ghost-link tone (it lives inside
        * its own dropdown trigger anyway); Leave keeps its calm clay
        * register because it is intentionally a destructive-feeling
        * navigation, not a primary action. */}
      <div className="flex items-center gap-2.5 text-[13px] text-ink/75 leading-none flex-wrap">
        <Link
          to={`/projects/${project.id}/overview`}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--pm-radius-button,0.5rem)] border border-ink/20 bg-paper hover:bg-drafting-blue/[0.06] hover:border-drafting-blue/45 motion-safe:hover:-translate-y-px transition-[background-color,border-color,color,transform] duration-soft text-[12px] font-medium text-ink/85 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.55)' }}
        >
          {t('chat.footer.cockpitSecondary', {
            defaultValue: 'Checkliste öffnen',
          })}
        </Link>
        <span aria-hidden="true" className="text-clay/45">·</span>
        <ExportMenu
          project={project}
          messages={messages}
          events={events}
          variant="ghost"
        />
        <span aria-hidden="true" className="text-clay/45">·</span>
        <Link
          to="/dashboard"
          className="text-clay/75 hover:text-clay-deep transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          {t('chat.footer.leaveSecondary', {
            defaultValue: '← Projekt verlassen',
          })}
        </Link>
      </div>
    </div>
  )
}
