import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ProjectListEntry } from '../hooks/useProjects'
import {
  deriveStatus,
  getAreasGlyphStates,
  getTopRecommendation,
} from '../lib/projectIntel'
import { useRelativeTime } from '../hooks/useRelativeTime'
import { SitePlanThumb } from './SitePlanThumb'
import { TemplateBadge } from './TemplateBadge'
import { StatusPill } from './StatusPill'
import { AreasGlyph } from './AreasGlyph'
import { CardMenu } from './CardMenu'

interface Props {
  project: ProjectListEntry
  /** 0-based position within the section — drives deterministic rotation. */
  index: number
  onRename: () => void
  onPauseToggle: () => void
  onArchive: () => void
  onExport: () => void
  onDelete: () => void
}

/** Six rotation slots cycling per index — verbatim from prototype. */
const ROTATIONS = [
  '[transform:rotate(-0.4deg)]',
  '[transform:rotate(0.3deg)]',
  '[transform:rotate(-0.2deg)]',
  '[transform:rotate(0.5deg)]',
  '[transform:rotate(-0.6deg)]',
  '[transform:rotate(0.2deg)]',
]

/**
 * v3 paper-stack project card. 80×80 site-plan thumb, title +
 * template badge, italic address, top-recommendation preview
 * (clay-bordered), mini meta row, status pill above arrow. Hover
 * lifts and rotates to 0° while the underlying paper-tint dims to
 * solid paper via a `::before` overlay.
 */
export function ProjectCard({
  project,
  index,
  onRename,
  onPauseToggle,
  onArchive,
  onExport,
  onDelete,
}: Props) {
  const { t, i18n } = useTranslation()
  const { format } = useRelativeTime()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const status = deriveStatus(project)
  const areaStates = getAreasGlyphStates(project)
  const topRec = getTopRecommendation(project, lang)
  const rotation = ROTATIONS[index % ROTATIONS.length]

  return (
    <Link
      to={`/projects/${project.id}`}
      className={cn(
        'group relative grid grid-cols-[80px_1fr_auto] items-start gap-5 border border-pm-hair bg-pm-paper-tint p-6 transition-all duration-soft ease-soft',
        'hover:border-pm-hair-strong hover:bg-pm-paper hover:!translate-y-[-3px] hover:!rotate-0 hover:shadow-[0_14px_40px_-16px_rgba(22,19,16,0.18),0_4px_8px_-4px_rgba(22,19,16,0.08)] hover:z-[2]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
        'motion-safe:' + rotation,
      )}
    >
      <SitePlanThumb address={project.plot_address ?? project.name ?? project.id} />

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="font-serif text-[22px] leading-[1.15] text-pm-ink truncate">
            {project.name ?? '—'}
          </span>
          <TemplateBadge templateId={project.template_id} />
        </div>

        {project.plot_address ? (
          <p className="font-sans text-[13px] italic text-pm-ink-mid truncate">
            {project.plot_address}
          </p>
        ) : null}

        {topRec ? (
          <p className="mt-3 flex items-start gap-2 border-l border-pm-clay-tint pl-2.5 font-sans text-[13px] italic leading-[1.4] text-pm-ink-mid">
            <span aria-hidden className="shrink-0 font-mono text-pm-clay">→</span>
            <span className="line-clamp-2">{topRec}</span>
          </p>
        ) : null}

        <div className="mt-3.5 flex items-center gap-3.5 font-mono text-[11px] tracking-[0.04em] text-pm-ink-mute2">
          <span>{format(project.updated_at)}</span>
          <span aria-hidden className="opacity-50">·</span>
          <span>{t('dashboard.row.turns', { count: project.turnCount })}</span>
          <span aria-hidden className="opacity-50">·</span>
          <AreasGlyph states={areaStates} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2.5 self-stretch">
        <StatusPill status={status} />
        <div className="flex items-center gap-1">
          <CardMenu
            project={project}
            onRename={onRename}
            onPauseToggle={onPauseToggle}
            onArchive={onArchive}
            onExport={onExport}
            onDelete={onDelete}
          />
          <span
            aria-hidden
            className="font-mono text-[18px] text-pm-ink-mute2 transition-all duration-soft group-hover:translate-x-1 group-hover:text-pm-ink"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  )
}
