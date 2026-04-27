import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useChatStore } from '@/stores/chatStore'
import type { ProjectRow } from '@/types/db'

interface Props {
  projectId: string
}

/**
 * Calm in-thread card that surfaces when chat-turn returns a
 * non-continue completion_signal. Three flavours:
 *
 *   • needs_designer    — a bauvorlageberechtigte/r Architekt:in is
 *                         needed beyond this point. Buttons: invite
 *                         (stub toast) + pause project.
 *   • ready_for_review  — interim summary point. Buttons: open
 *                         overview + continue.
 *   • blocked           — input gap blocking progress. Buttons: view
 *                         areas + pause project.
 *
 * Hairline-bordered top + bottom (no fill), Inter 13 ink body,
 * primary + ghost buttons. Reduced-motion handled by parent. Dismiss
 * any flavour by clicking a button — the chatStore signal clears on
 * the next user submit anyway (see useChatTurn.onMutate).
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
      className="flex flex-col gap-3 border-y border-border-strong/40 py-4"
      aria-label={t('chat.completion.label')}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-clay leading-none">
        {t(`chat.completion.${signal}.tag`)}
      </p>
      <p className="text-[13px] text-ink/80 leading-relaxed">{body}</p>
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={primary.onClick}
          className="h-9 px-4 rounded-sm bg-ink text-paper text-[12.5px] font-medium hover:bg-ink/92 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {primary.label}
        </button>
        <button
          type="button"
          onClick={secondary.onClick}
          className="h-9 px-4 rounded-sm border border-border-strong/55 text-ink/85 text-[12.5px] font-medium hover:bg-muted/40 hover:text-ink transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {secondary.label}
        </button>
      </div>
    </aside>
  )
}
