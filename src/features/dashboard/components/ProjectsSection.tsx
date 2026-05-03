import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ProjectListEntry } from '../hooks/useProjects'
import { ProjectRow } from './ProjectRow'

const PAGE_SIZE = 12

interface Props {
  /** i18n key ending — `dashboard.sections.{kind}`. */
  kind: 'active' | 'paused' | 'archived'
  projects: ProjectListEntry[]
  /** When false, section starts collapsed. */
  defaultExpanded: boolean
  onRename: (project: ProjectListEntry) => void
  onPauseToggle: (project: ProjectListEntry) => void
  onArchive: (project: ProjectListEntry) => void
  onExport: (project: ProjectListEntry) => void
  onDelete: (project: ProjectListEntry) => void
}

/**
 * One of the three project bands (Active / Paused / Archived).
 * Active is always expanded; Paused and Archived collapse by default.
 * Sections with more than 12 rows show 12 plus a hairline expander.
 */
export function ProjectsSection({
  kind,
  projects,
  defaultExpanded,
  onRename,
  onPauseToggle,
  onArchive,
  onExport,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(defaultExpanded)
  const [expandAll, setExpandAll] = useState(false)

  if (projects.length === 0) return null

  const heading = t(`dashboard.sections.${kind}`)
  const visible = expandAll ? projects : projects.slice(0, PAGE_SIZE)
  const hidden = projects.length - visible.length

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-2">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-baseline justify-between gap-3 rounded-sm py-2 text-left transition-colors hover:bg-pm-paper-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
        >
          <span className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
              {heading}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-pm-ink-mute2">
              {projects.length}
            </span>
          </span>
          <span
            aria-hidden
            className={cn(
              'font-mono text-[14px] text-pm-ink-mute2 transition-transform duration-soft',
              open ? '-rotate-180' : 'rotate-0',
            )}
          >
            ▾
          </span>
        </button>
      </CollapsibleTrigger>
      <span aria-hidden="true" className="block h-px bg-pm-hair" />
      <CollapsibleContent
        className={cn(
          'overflow-hidden',
          'data-[state=open]:animate-accordion-down',
          'data-[state=closed]:animate-accordion-up',
        )}
      >
        <div className="flex flex-col">
          {visible.map((p, idx) => (
            <ProjectRow
              key={p.id}
              project={p}
              index={idx}
              onRename={() => onRename(p)}
              onPauseToggle={() => onPauseToggle(p)}
              onArchive={() => onArchive(p)}
              onExport={() => onExport(p)}
              onDelete={() => onDelete(p)}
            />
          ))}
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setExpandAll((v) => !v)}
              className="self-start py-3 font-sans text-[13px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/40 transition-colors hover:text-pm-clay-deep"
            >
              {expandAll
                ? t('dashboard.showLess')
                : t('dashboard.showAll', { count: projects.length })}
            </button>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
