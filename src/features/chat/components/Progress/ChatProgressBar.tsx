// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #69 — Loud progress indicator at top of thread
//
// Replaces the "dotted hairline" feel of the left-rail ProgressMeter as
// the dominant signal of "where am I in the conversation." Sticky to
// the top of the thread, full-width within the message column,
// 7 segments matching the seven conversation gates.
//
//   ●━━━━●━━━━●━━━━●━━━━○━━━━○━━━━○                         42 %
//   Init   Plot   Code   Sonst.  Verf.  Team    Synth.       turn 9
//
// The left-rail ProgressMeter stays mounted as a secondary indicator
// (Q8 locked: keep, demote visually).
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import { cn } from '@/lib/utils'
import {
  SEGMENT_ORDER,
  computeSegmentProgress,
  type ProgressSegment,
} from '../../lib/progressEstimate'
import type { Specialist } from '@/types/projectState'
import type { MessageRow } from '@/types/db'

interface Props {
  /** When true (mobile drawer), drops the labels and shrinks the bar. */
  compact?: boolean
  /**
   * Phase 2.5 fix — durable progress derivation.
   *
   * The chatStore's `turnCount` and `currentSpecialist` are session-
   * scoped: a `useEffect(() => () => reset(), [projectId])` in
   * ChatWorkspacePage clears them on every project (re)mount. Refresh
   * a project that already has 8 messages and the bar reads 5%
   * (specialist anchor for `null` specialist + 0/18 turn ratio).
   *
   * When `messages` is provided, the bar derives both signals from
   * the message list directly (count of assistant messages,
   * specialist of the most recent assistant message). This makes
   * the bar honest across reloads + tab switches + cold mounts.
   *
   * Falls back to chatStore values when the prop is absent so
   * legacy callers (and the in-stream "live" path) still work.
   */
  messages?: MessageRow[]
}

const SEGMENT_LABEL_DE: Record<Specialist, string> = {
  moderator: 'Init',
  planungsrecht: 'Plan.',
  bauordnungsrecht: 'BauO',
  sonstige_vorgaben: 'Sonst.',
  verfahren: 'Verf.',
  beteiligte: 'Team',
  synthesizer: 'Synth.',
}

const SEGMENT_LABEL_EN: Record<Specialist, string> = {
  moderator: 'Init',
  planungsrecht: 'Plan.',
  bauordnungsrecht: 'Code',
  sonstige_vorgaben: 'Other',
  verfahren: 'Proc.',
  beteiligte: 'Team',
  synthesizer: 'Synth.',
}

export function ChatProgressBar({ compact = false, messages }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const reduced = useReducedMotion()

  const turnCountFromStore = useChatStore((s) => s.turnCount)
  const currentSpecialistFromStore = useChatStore((s) => s.currentSpecialist)
  const completionSignal = useChatStore((s) => s.lastCompletionSignal)

  // Phase 2.5 — durable derivation from the persisted messages list.
  // chatStore values reset on project remount (see Props doc); without
  // this fallback the bar shows 5% on every reload of a long
  // conversation. Use Math.max() so an in-flight specialist promotion
  // (chatStore wins because it's the freshest signal) still reflects
  // even when messages haven't yet caught up to the streaming turn.
  let turnCount = turnCountFromStore
  let currentSpecialist = currentSpecialistFromStore
  if (messages && messages.length > 0) {
    const assistants = messages.filter((m) => m.role === 'assistant')
    turnCount = Math.max(turnCountFromStore, assistants.length)
    if (currentSpecialist === null && assistants.length > 0) {
      const latest = assistants[assistants.length - 1]
      currentSpecialist = (latest.specialist ?? null) as Specialist | null
    }
  }

  const isReadyForReview = completionSignal === 'ready_for_review'
  const { segments, percent, currentIdx } = computeSegmentProgress(
    turnCount,
    currentSpecialist,
    isReadyForReview,
  )

  const labels = lang === 'en' ? SEGMENT_LABEL_EN : SEGMENT_LABEL_DE

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('chat.progress.eyebrow', { defaultValue: 'Fortschritt' })}
      data-pm-progress-bar="true"
      className={cn(
        'w-full bg-paper/95 backdrop-blur-[2px]',
        compact ? 'py-2' : 'sticky top-0 z-30 border-b border-ink/12 px-4 sm:px-6 lg:px-8 py-3',
      )}
    >
      <div className="flex items-center gap-4">
        <ol
          role="list"
          aria-label={t('chat.progress.segments', {
            defaultValue: 'Konversationsabschnitte',
          })}
          className="flex flex-1 items-center gap-1 sm:gap-2"
        >
          {segments.map((seg, idx) => (
            <Segment
              key={seg.specialist}
              segment={seg}
              isLast={idx === SEGMENT_ORDER.length - 1}
              label={labels[seg.specialist]}
              showLabel={!compact}
              isCurrent={idx === currentIdx && !isReadyForReview}
              reduced={reduced ?? false}
            />
          ))}
        </ol>

        <div className="flex items-baseline gap-2 shrink-0 tabular-nums">
          <span className="font-serif italic text-[15px] text-ink leading-none">
            {percent}
            <span className="text-clay/70 ml-0.5">%</span>
          </span>
          {!compact && (
            <span className="text-[11px] uppercase tracking-[0.18em] text-clay/72 leading-none">
              {t('chat.progress.turnLabel', {
                defaultValue: 'Turn',
              })}{' '}
              <span className="text-ink/85">{turnCount}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface SegmentProps {
  segment: ProgressSegment
  isLast: boolean
  label: string
  showLabel: boolean
  isCurrent: boolean
  reduced: boolean
}

function Segment({ segment, isLast, label, showLabel, isCurrent, reduced }: SegmentProps) {
  const { state, fill } = segment

  // Segment color rules:
  //   done      → solid clay
  //   current   → clay anchor + drafting-blue fill proportional to `fill`
  //   upcoming  → paper background, ink/15 hairline
  const isDone = state === 'done'
  const isUpcoming = state === 'upcoming'

  return (
    <li className="flex flex-col items-stretch flex-1 min-w-0">
      <div className="flex items-center min-w-0">
        {/* The segment bar — 4px tall stripe. */}
        <div
          className={cn(
            'relative h-1 rounded-full flex-1 min-w-0 overflow-hidden',
            isDone && 'bg-clay',
            isCurrent && 'bg-clay/15',
            isUpcoming && 'bg-ink/10',
          )}
        >
          {/* Current segment progress fill — drafting-blue at 65%. */}
          {isCurrent && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-y-0 left-0 bg-drafting-blue/65 rounded-full',
                !reduced && 'transition-[width] duration-soft ease-soft',
              )}
              style={{ width: `${Math.max(8, Math.round(fill * 100))}%` }}
            />
          )}
        </div>

        {/* Connector hairline between segments. */}
        {!isLast && (
          <span
            aria-hidden="true"
            className={cn(
              'h-px w-1.5 sm:w-2 shrink-0',
              isDone ? 'bg-clay' : 'bg-ink/10',
            )}
          />
        )}
      </div>

      {showLabel && (
        <p
          className={cn(
            'mt-1.5 text-[11px] tracking-[0.10em] truncate text-center',
            isCurrent
              ? 'text-ink font-medium'
              : isDone
                ? 'text-clay/85'
                : 'text-ink/40',
          )}
          // The label sits beneath each segment, tightly bound to it.
          // Truncate so a long Inter label doesn't push neighbouring
          // segments off-grid on narrow viewports.
        >
          {label}
        </p>
      )}
    </li>
  )
}
