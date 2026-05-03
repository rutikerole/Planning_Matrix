import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ProjectListEntry } from '../hooks/useProjects'
import { deriveStatus, getAreasGlyphStates, getTopRecommendation } from '../lib/projectIntel'
import { useRelativeTime } from '../hooks/useRelativeTime'
import { TemplateBadge } from './TemplateBadge'
import { StatusPill } from './StatusPill'
import { AreasGlyph } from './AreasGlyph'
import { RowMenu } from './RowMenu'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

interface Props {
  project: ProjectListEntry
  /** 0-based position within its section. */
  index: number
  onRename: () => void
  onPauseToggle: () => void
  onArchive: () => void
  onExport: () => void
  onDelete: () => void
}

/**
 * The dashboard's project row. Three-column grid:
 *   [40px index] [name + meta] [status + arrow]
 *
 * Hover state shifts the row to bg-pm-paper-tint and reveals the
 * three-dot menu. Click on the row navigates to /projects/:id;
 * the menu trigger stops propagation so it does not also navigate.
 */
export function ProjectRow({
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

  const indexLabel =
    index < 10
      ? ROMAN[index]
      : new Date(project.created_at)
          .toLocaleString(lang === 'en' ? 'en' : 'de', { month: 'short' })
          .replace('.', '')
          .toUpperCase()
  const indexIsRoman = index < 10

  return (
    <Link
      to={`/projects/${project.id}`}
      className={cn(
        'group grid grid-cols-[1fr_auto] items-start gap-4 border-b border-pm-hair py-6 transition-colors duration-soft last:border-b-0 md:grid-cols-[40px_1fr_auto] md:gap-6',
        'hover:bg-pm-paper-tint focus-visible:bg-pm-paper-tint focus-visible:outline-none',
      )}
    >
      {/* Col 1: index */}
      <span
        aria-hidden="true"
        className={cn(
          'hidden md:block leading-tight',
          indexIsRoman
            ? 'font-serif text-[22px] italic text-pm-ink-muted'
            : 'font-mono text-[11px] uppercase tracking-[0.16em] text-pm-clay',
        )}
      >
        {indexLabel}
      </span>

      {/* Col 2: body */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[22px] leading-tight text-pm-ink truncate">
            {project.name ?? '—'}
          </span>
          <TemplateBadge templateId={project.template_id} />
        </div>

        {project.plot_address ? (
          <p className="font-sans text-[14px] italic text-pm-ink-mid leading-snug truncate">
            {project.plot_address}
          </p>
        ) : null}

        {topRec ? (
          <p className="mt-1 flex items-baseline gap-1.5 font-sans text-[13px] italic text-pm-ink-mid">
            <span aria-hidden className="text-pm-clay">→</span>
            <span className="truncate">{topRec}</span>
          </p>
        ) : null}

        <div className="mt-2 flex items-center gap-3 font-mono text-[12px] text-pm-ink-mute2">
          <span>{format(project.updated_at)}</span>
          <span aria-hidden>·</span>
          <span>{t('dashboard.row.turns', { count: project.turnCount })}</span>
          <span aria-hidden>·</span>
          <AreasGlyph states={areaStates} />
        </div>
      </div>

      {/* Col 3: status + arrow + menu */}
      <div className="flex flex-col items-end gap-2 self-start">
        <StatusPill status={status} />
        <div className="flex items-center gap-1">
          <RowMenu
            project={project}
            alwaysVisible={false}
            onRename={onRename}
            onPauseToggle={onPauseToggle}
            onArchive={onArchive}
            onExport={onExport}
            onDelete={onDelete}
          />
          <span
            aria-hidden
            className="font-mono text-[16px] text-pm-ink-muted transition-all group-hover:translate-x-0.5 group-hover:text-pm-ink"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  )
}
