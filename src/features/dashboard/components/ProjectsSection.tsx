import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ProjectListEntry } from '../hooks/useProjects'
import { ProjectCard } from './ProjectCard'

const PAGE_SIZE = 12

export type SectionKind = 'active' | 'awaitingDesigner' | 'paused' | 'archived'

interface Props {
  kind: SectionKind
  projects: ProjectListEntry[]
  defaultExpanded: boolean
  onRename: (project: ProjectListEntry) => void
  onPauseToggle: (project: ProjectListEntry) => void
  onArchive: (project: ProjectListEntry) => void
  onExport: (project: ProjectListEntry) => void
  onDelete: (project: ProjectListEntry) => void
}

/**
 * v3 section band. Renders a 2-column grid of ProjectCards (1
 * column on mobile). Section head shows a label + clay count and a
 * collapse toggle; sections with > 12 rows show 12 plus an inline
 * "show all" expander.
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
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-4">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-baseline justify-between gap-3 rounded-sm py-2 text-left transition-colors hover:bg-pm-paper-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
        >
          <span className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-ink-mute2">
              {heading}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-pm-clay">
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
      <CollapsibleContent
        className={cn(
          'overflow-hidden',
          'data-[state=open]:animate-accordion-down',
          'data-[state=closed]:animate-accordion-up',
        )}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visible.map((p, idx) => (
            <ProjectCard
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
        </div>
        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpandAll((v) => !v)}
            className="mt-3 self-start py-3 font-sans text-[13px] italic text-pm-clay underline underline-offset-4 decoration-pm-clay/40 transition-colors hover:text-pm-clay-deep"
          >
            {expandAll
              ? t('dashboard.showLess')
              : t('dashboard.showAll', { count: projects.length })}
          </button>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
