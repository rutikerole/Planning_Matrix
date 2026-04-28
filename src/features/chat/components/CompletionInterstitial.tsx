import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useChatStore } from '@/stores/chatStore'
import type { CompletionSignal } from '@/types/chatTurn'
import type { ProjectRow } from '@/types/db'

interface Props {
  projectId: string
}

const STAMP_NUMERAL: Record<Exclude<CompletionSignal, 'continue'>, string> = {
  needs_designer: 'I',
  ready_for_review: 'II',
  blocked: 'III',
}

/**
 * Phase 3.2 #43 — completion interstitials as official correspondence.
 *
 * Three flavours rendered in a paper-card register that reads like a
 * stamped notice from the Bauamt rather than an inline chat card:
 *
 *   • Octagonal stamp top-right with the flavour's Roman numeral
 *     inside, rotated -8° (hand-stamped imperfection). Drafting-blue
 *     stroke at 70% opacity, paper-tinted fill, italic Serif numeral.
 *   • Inter 14 ink/85 body with leading 1.55 and a 3.4em italic Serif
 *     drop-cap on the first letter (uses the global `.drop-cap` rule
 *     established in #36).
 *   • Action buttons sit beneath the body, each preceded by a small
 *     drafting-blue chevron glyph — "« weiter " register, not a chip.
 */
export function CompletionInterstitial({ projectId }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signal = useChatStore((s) => s.lastCompletionSignal)
  const setCompletionSignal = useChatStore((s) => s.setCompletionSignal)

  if (!signal || signal === 'continue') return null

  const dismiss = () => setCompletionSignal(null)

  const pauseProject = async () => {
    await supabase.from('projects').update({ status: 'paused' }).eq('id', projectId)
    queryClient.setQueryData<ProjectRow | null | undefined>(
      ['project', projectId],
      (old) => (old ? { ...old, status: 'paused' } : old),
    )
    setCompletionSignal(null)
    navigate('/dashboard', { replace: true })
  }

  const openOverview = () => {
    setCompletionSignal(null)
    navigate(`/projects/${projectId}/overview`)
  }

  const inviteArchitectStub = () => {
    setCompletionSignal(null)
    // eslint-disable-next-line no-alert
    alert(t('chat.completion.inviteStub'))
  }

  const body = t(`chat.completion.${signal}.body`)
  const tag = t(`chat.completion.${signal}.tag`)
  const numeral = STAMP_NUMERAL[signal]
  const primary =
    signal === 'needs_designer'
      ? { label: t('chat.completion.invite'), onClick: inviteArchitectStub }
      : signal === 'ready_for_review'
        ? { label: t('chat.completion.openOverview'), onClick: openOverview }
        : { label: t('chat.completion.viewAreas'), onClick: dismiss }

  const secondary =
    signal === 'ready_for_review'
      ? { label: t('chat.completion.continue'), onClick: dismiss }
      : { label: t('chat.completion.pause'), onClick: pauseProject }

  return (
    <aside
      aria-label={t('chat.completion.label')}
      className="relative bg-paper border-y border-ink/15 py-7 px-6 sm:px-8 my-2 flex flex-col gap-5"
    >
      {/* Octagonal stamp top-right, rotated -8° */}
      <OctagonalStamp numeral={numeral} tag={tag} />

      {/* Body — drop-cap, Inter 14 ink/85 leading 1.55. Constrained
       * width so the drop-cap reads as a magazine pull-in, not as a
       * stretched typographic gimmick. */}
      <p className="drop-cap text-[14px] text-ink/85 leading-[1.55] max-w-[44ch] pr-20 sm:pr-28">
        {body}
      </p>

      {/* Actions — drafting-blue chevron prefix before each label */}
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pt-1">
        <ChevronAction
          tone="primary"
          label={primary.label}
          onClick={primary.onClick}
        />
        <ChevronAction
          tone="secondary"
          label={secondary.label}
          onClick={secondary.onClick}
        />
      </div>
    </aside>
  )
}

/** 56×56 octagonal stamp, drafting-blue stroke, italic Serif Roman. */
function OctagonalStamp({ numeral, tag }: { numeral: string; tag: string }) {
  // Octagon vertices for a 56×56 viewBox, ~5px corner cuts.
  const path =
    'M 18 4 L 38 4 L 52 18 L 52 38 L 38 52 L 18 52 L 4 38 L 4 18 Z'

  return (
    <span
      aria-hidden="true"
      className="absolute top-3 right-4 sm:right-6 w-16 h-16 text-drafting-blue"
      style={{ transform: 'rotate(-8deg)' }}
    >
      <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.1">
        {/* Outer octagon */}
        <path d={path} strokeOpacity="0.7" fill="hsl(36 28% 95%)" />
        {/* Inner octagon — printer's double-rule */}
        <path
          d="M 19 8 L 37 8 L 48 19 L 48 37 L 37 48 L 19 48 L 8 37 L 8 19 Z"
          strokeOpacity="0.45"
        />
        {/* Roman numeral, italic Serif clay-deep */}
        <text
          x="28"
          y="34"
          fontFamily="Georgia, 'Instrument Serif', serif"
          fontStyle="italic"
          fontWeight="500"
          fontSize="20"
          textAnchor="middle"
          fill="hsl(25 32% 28%)"
          stroke="none"
        >
          {numeral}
        </text>
        {/* Curved tag word above the numeral — readable but tiny */}
        <text
          x="28"
          y="16"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="500"
          fontSize="4.2"
          textAnchor="middle"
          fill="hsl(212 38% 32%)"
          stroke="none"
          letterSpacing="0.6"
        >
          {tag.slice(0, 18).toUpperCase()}
        </text>
      </svg>
    </span>
  )
}

/** Action button — drafting-blue chevron prefix + uppercase label. */
function ChevronAction({
  label,
  onClick,
  tone,
}: {
  label: string
  onClick: () => void
  tone: 'primary' | 'secondary'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'group inline-flex items-center gap-2.5 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm px-1 py-1 ' +
        (tone === 'primary'
          ? 'text-ink hover:text-clay-deep'
          : 'text-ink/65 hover:text-ink')
      }
    >
      <Chevron />
      <span className="leading-none">{label}</span>
      <span
        aria-hidden="true"
        className={
          'inline-block h-px w-0 bg-clay/55 group-hover:w-6 transition-[width] duration-soft ' +
          (tone === 'primary' ? 'bg-clay' : 'bg-clay/45')
        }
      />
    </button>
  )
}

/** 12×12 drafting-blue double-chevron glyph. */
function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-drafting-blue/75 shrink-0"
    >
      <path d="M 3 2.5 L 7 6 L 3 9.5" />
      <path d="M 6.5 2.5 L 10.5 6 L 6.5 9.5" strokeOpacity="0.65" />
    </svg>
  )
}
