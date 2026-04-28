import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProjectStatus } from '@/types/db'
import type { ProjectListEntry } from '../hooks/useProjectsList'
import { formatRelativeOrAbsolute, romanFor, type Lang } from '../lib/dashboardFormat'

interface Props {
  projects: ProjectListEntry[]
}

const STATE_LABEL_KEYS: Record<ProjectStatus, string> = {
  in_progress: 'dashboard.atelier.state.in_progress',
  paused: 'dashboard.atelier.state.paused',
  archived: 'dashboard.atelier.state.archived',
  completed: 'dashboard.atelier.state.completed',
}

/**
 * Phase 3.3 #47 — project list as architectural-schedule index.
 *
 * Each row: Roman numeral · project name · address · activity meta —
 * state pill + arrow chevron on the right. Hairline rules between
 * rows. Hover ink-darkens the row and shifts the chevron + numeral
 * 1–2px right (gated by reduced-motion at the CSS level — `motion-safe`).
 */
export function ProjectList({ projects }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as Lang

  return (
    <ul className="flex flex-col">
      {projects.map((project, idx) => (
        <li key={project.id}>
          <Link
            to={`/projects/${project.id}`}
            className="group block"
          >
            <article
              className={
                'grid grid-cols-[40px_1fr_auto] sm:grid-cols-[48px_1fr_auto] items-baseline gap-x-4 sm:gap-x-6 py-6 px-2 sm:px-4 transition-colors duration-soft motion-safe:hover:bg-ink/[0.025] focus-within:bg-ink/[0.025] ' +
                (idx > 0 ? 'border-t border-ink/12' : '')
              }
            >
              {/* I  Roman numeral */}
              <span
                className="font-serif italic text-[18px] sm:text-[20px] text-clay-deep tabular-figures leading-none motion-safe:group-hover:translate-x-px transition-transform duration-soft"
                aria-hidden="true"
              >
                {romanFor(idx + 1)}
              </span>

              {/* Center column — name + address + activity meta */}
              <div className="min-w-0 flex flex-col gap-1.5">
                <h3 className="font-serif text-[20px] sm:text-[22px] text-ink leading-tight truncate">
                  {project.name.split('·')[0]?.trim() ?? project.name}
                </h3>
                {project.plot_address && (
                  <p className="font-serif italic text-[13px] text-ink/65 leading-snug truncate">
                    {project.plot_address}
                  </p>
                )}
                <p className="text-[11px] text-ink/55 leading-relaxed flex flex-wrap items-baseline gap-x-2">
                  <span>
                    {t('dashboard.atelier.lastActivityLabel')}:{' '}
                    <span className="font-serif italic text-clay/85 tabular-figures">
                      {formatRelativeOrAbsolute(project.updated_at, lang)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-ink/30">·</span>
                  <span>
                    <span className="font-serif italic text-clay-deep tabular-figures">
                      {project.turnCount}
                    </span>{' '}
                    {t('dashboard.atelier.turnCountLabel', { count: project.turnCount })}
                  </span>
                </p>
              </div>

              {/* Right column — state pill + arrow */}
              <div className="flex items-center gap-3 sm:gap-5 self-center shrink-0">
                <StatePill status={project.status} label={t(STATE_LABEL_KEYS[project.status])} />
                <span
                  aria-hidden="true"
                  className="font-serif italic text-[18px] text-clay tabular-figures motion-safe:group-hover:translate-x-0.5 transition-transform duration-soft"
                >
                  →
                </span>
              </div>
            </article>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function StatePill({ status, label }: { status: ProjectStatus; label: string }) {
  return (
    <span
      className={
        'inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.20em] tabular-nums leading-none ' +
        toneFor(status)
      }
    >
      <Marker status={status} />
      {label}
    </span>
  )
}

function toneFor(status: ProjectStatus): string {
  switch (status) {
    case 'in_progress':
      return 'text-clay'
    case 'completed':
      return 'text-clay-deep'
    case 'paused':
      return 'text-ink/55'
    case 'archived':
      return 'text-ink/35'
  }
}

function Marker({ status }: { status: ProjectStatus }) {
  // Match the left-rail GateStateMarker vocabulary: filled clay dot
  // for active, hairline ring for paused, 2px ink hairline for archived
  // (drafted), small clay-deep checkmark for completed.
  if (status === 'in_progress') {
    return <span aria-hidden="true" className="block size-1.5 rounded-full bg-clay shrink-0" />
  }
  if (status === 'completed') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 10 10"
        width="10"
        height="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M 1.6 5.4 L 4 7.6 L 8.4 2.6" />
      </svg>
    )
  }
  if (status === 'paused') {
    return (
      <span
        aria-hidden="true"
        className="block size-1.5 rounded-full border border-clay/55 shrink-0"
      />
    )
  }
  // archived → "ENTWURF" hairline slash
  return <span aria-hidden="true" className="block h-px w-2 bg-ink/35 shrink-0" />
}
