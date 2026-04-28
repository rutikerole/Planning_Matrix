import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { useSwipeGesture } from '@/lib/useSwipeGesture'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types/db'
import type { ProjectListEntry } from '../hooks/useProjectsList'
import { formatRelativeOrAbsolute, romanFor, type Lang } from '../lib/dashboardFormat'
import { useSetProjectStatus } from '../hooks/useArchiveProject'

interface Props {
  project: ProjectListEntry
  index: number
  lang: Lang
  /** True when the row should render the divider above. */
  showDivider: boolean
}

const STATE_LABEL_KEYS: Record<ProjectStatus, string> = {
  in_progress: 'dashboard.atelier.state.in_progress',
  paused: 'dashboard.atelier.state.paused',
  archived: 'dashboard.atelier.state.archived',
  completed: 'dashboard.atelier.state.completed',
}

/**
 * Phase 3.9 #93 — mobile project row with swipe-reveal actions.
 *
 * Tap on the row body navigates to /projects/:id (same destination as
 * the desktop Link wrapping the article). Swipe-left reveals an action
 * column on the right edge containing Archivieren (or Wiederherstellen
 * for already-archived rows). The Ergebnis quick-link is preserved as
 * a dedicated tap target inside the row body.
 *
 * The reveal width is 120 px. The handlers ignore touches that begin
 * inside the iOS edge-buffer so back-swipe stays accessible. After
 * commit (offset < -threshold) the row stays open until either the
 * action button is tapped or a tap on the row body re-closes it.
 *
 * Honours `prefers-reduced-motion` via useSwipeGesture's tightened
 * threshold + this component's transition fallback to no animation.
 */
export function SwipeableProjectRow({ project, index, lang, showDivider }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const setStatus = useSetProjectStatus()

  const [revealed, setRevealed] = useState(false)
  const [pending, setPending] = useState(false)
  const wasSwiping = useRef(false)

  const { handlers, offset, active } = useSwipeGesture({
    threshold: 60,
    onSwipeLeft: () => setRevealed(true),
    onSwipeRight: () => setRevealed(false),
  })

  // While dragging, mirror finger; after release, snap to revealed/closed.
  const liveOffset = active
    ? Math.min(0, Math.max(offset, -140))
    : revealed
    ? -120
    : 0

  useEffect(() => {
    if (active) wasSwiping.current = true
  }, [active])

  // Allow a tap on the row body (not the action) to close the reveal
  // without navigating away.
  const onRowClick = () => {
    if (wasSwiping.current) {
      wasSwiping.current = false
      return
    }
    if (revealed) {
      setRevealed(false)
      return
    }
    navigate(`/projects/${project.id}`)
  }

  const isArchived = project.status === 'archived'
  const actionLabel = isArchived
    ? t('dashboard.atelier.restore', { defaultValue: 'Wiederherstellen' })
    : t('dashboard.atelier.archive', { defaultValue: 'Archivieren' })

  const onAction = async () => {
    if (pending) return
    setPending(true)
    try {
      await setStatus.mutateAsync({
        projectId: project.id,
        status: isArchived ? 'in_progress' : 'archived',
      })
    } finally {
      setPending(false)
      setRevealed(false)
    }
  }

  return (
    <li className={cn('relative overflow-hidden', showDivider && 'border-t border-ink/12')}>
      {/* Action layer (behind the row, revealed by negative translateX) */}
      <div
        aria-hidden={!revealed}
        className="absolute inset-y-0 right-0 w-[120px] flex items-stretch"
      >
        <button
          type="button"
          onClick={onAction}
          disabled={pending}
          tabIndex={revealed ? 0 : -1}
          className="w-full flex items-center justify-center text-[12px] font-medium uppercase tracking-[0.18em] text-paper bg-ink/85 hover:bg-ink active:bg-ink disabled:opacity-60 transition-colors duration-soft"
        >
          {actionLabel}
        </button>
      </div>

      <article
        {...handlers}
        onClick={onRowClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(`/projects/${project.id}`)
          }
        }}
        aria-label={project.name}
        className={cn(
          'relative bg-paper grid grid-cols-[40px_1fr_auto] items-baseline gap-x-4 py-6 px-3 cursor-pointer select-none touch-pan-y',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
        style={{
          transform: `translateX(${liveOffset}px)`,
          transition: active || reduced ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span
          className="font-serif italic text-[18px] text-clay-deep tabular-figures leading-none"
          aria-hidden="true"
        >
          {romanFor(index + 1)}
        </span>

        <div className="min-w-0 flex flex-col gap-1.5">
          <h3 className="font-serif text-[20px] text-ink leading-tight truncate">
            {project.name.split('·')[0]?.trim() ?? project.name}
          </h3>
          {project.plot_address && (
            <p className="font-serif italic text-[13px] text-ink/65 leading-snug truncate">
              {project.plot_address}
            </p>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/projects/${project.id}/result`)
            }}
            className="font-serif italic text-[12px] text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 self-start transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm leading-snug"
          >
            {t('dashboard.atelier.viewResult', { defaultValue: 'Ergebnis' })} →
          </button>
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

        <div className="flex items-center gap-3 self-center shrink-0 pr-1">
          <span
            className={cn(
              'inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.20em] tabular-nums leading-none',
              toneFor(project.status),
            )}
          >
            <Marker status={project.status} />
            {t(STATE_LABEL_KEYS[project.status])}
          </span>
        </div>
      </article>
    </li>
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
  return <span aria-hidden="true" className="block h-px w-2 bg-ink/35 shrink-0" />
}
