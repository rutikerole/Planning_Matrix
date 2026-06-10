import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageRow, ProjectRow } from '@/types/db'
import { ExportMenu } from './ExportMenu'
import { SendToArchitectModal } from './SendToArchitectModal'
import { InviteArchitectModal } from './InviteArchitectModal'
import { InlineLogsButton } from '@/features/admin/components/InlineLogsButton'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  /**
   * `bar`  — horizontal mobile sticky-bottom layout (Back + Invite/Send/Logs
   *          on the left, Export on the right). Secondary buttons collapse
   *          (`hidden sm:…`) on narrow phones, matching the original footer.
   * `rail` — vertical desktop stack inside the identity rail (Export on top,
   *          then Invite/Send/Logs, then Back). Self-hides below the `spine:`
   *          breakpoint, where the bar carries these actions instead.
   */
  variant: 'bar' | 'rail'
}

/**
 * The owner-mode action cluster of the Result Workspace — extracted so the
 * mobile sticky bottom bar (`ResultFooter`, `variant="bar"`) and the desktop
 * identity rail (`ResultRail`, `variant="rail"`) share ONE implementation of
 * the export menu, architect modals, logs entry, and share toast. Exactly one
 * variant is interactive per breakpoint (the other's wrapper is display:none),
 * so the two mounted modal sets never collide.
 *
 * Owner-mode only: both call sites already gate on `source.kind !== 'shared'`.
 */
export function ResultActions({ project, messages, events, variant }: Props) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [toast, setToast] = useState<string | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(id)
  }, [toast])

  const onShareCreated = () => {
    setToast(t('result.workspace.share.linkCopied'))
  }

  const onInspectDataFlow = () => {
    const next = new URLSearchParams(params)
    next.set('expert', 'true')
    next.set('tab', 'expert')
    setParams(next, { replace: false })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const isRail = variant === 'rail'

  // Back-to-consultation pill — the rail's hover-nudge treatment is the nicer
  // of the two originals, so it's used in both variants now (unifies the
  // formerly-duplicated Back button).
  const back = (
    <Link
      to={`/projects/${project.id}`}
      data-no-print="true"
      className={cn(
        'group inline-flex items-center gap-1.5 h-9 px-3 bg-paper border border-ink/15 rounded-full',
        'text-[12px] text-ink/75 hover:text-ink hover:border-clay/55 hover:bg-[hsl(var(--clay)/0.05)]',
        'motion-safe:active:translate-y-px transition-[color,border-color,background-color,transform] duration-[var(--motion-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card',
        isRail ? 'justify-center w-full' : '',
      )}
    >
      <span className="inline-flex transition-transform duration-[var(--motion-fast)] ease-[var(--ease-exit)] motion-safe:group-hover:-translate-x-0.5">
        <ArrowLeft aria-hidden="true" className="size-3" />
      </span>
      <span className={cn(isRail ? '' : 'hidden sm:inline')}>
        {t('result.workspace.footer.back')}
      </span>
    </Link>
  )

  // Emerald primary write-access invite (Bug 29 / C7).
  const invite = (
    <button
      type="button"
      onClick={() => setInviteOpen(true)}
      className={cn(
        'items-center gap-1.5 h-9 px-3 bg-emerald-700 text-paper rounded-full text-[12px]',
        'shadow-[0_2px_6px_-3px_rgba(6,78,59,0.4)] hover:bg-emerald-800 motion-safe:hover:-translate-y-px hover:shadow-[0_8px_18px_-8px_rgba(6,78,59,0.55)]',
        'motion-safe:active:translate-y-0 active:shadow-[0_2px_4px_-3px_rgba(6,78,59,0.5)]',
        'transition-[background-color,transform,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-exit)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card',
        isRail ? 'inline-flex justify-center w-full' : 'hidden sm:inline-flex',
      )}
    >
      <Check aria-hidden="true" className="size-3" />
      {t('result.workspace.footer.inviteArchitect')}
    </button>
  )

  // Dotted read-only briefing send.
  const send = (
    <button
      type="button"
      onClick={() => setSendOpen(true)}
      className={cn(
        'items-center gap-1.5 h-9 px-3 bg-paper border border-dashed border-clay/55 rounded-full',
        'text-[12px] italic font-serif text-clay hover:text-ink hover:border-clay hover:bg-[hsl(var(--clay)/0.05)]',
        'motion-safe:active:translate-y-px transition-[color,border-color,background-color,transform] duration-[var(--motion-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card',
        isRail ? 'inline-flex justify-center w-full' : 'hidden sm:inline-flex',
      )}
    >
      {t('result.workspace.footer.sendToArchitect')}
    </button>
  )

  // Admin-only — renders null for normal users (action rhythm unchanged).
  const logs = (
    <InlineLogsButton
      projectId={project.id}
      projectName={project.name}
      variant="pill"
      className={cn(isRail ? 'inline-flex justify-center w-full' : 'hidden sm:inline-flex')}
    />
  )

  const exportMenu = (
    <ExportMenu
      project={project}
      messages={messages}
      events={events}
      onShareCreated={onShareCreated}
      onInspectDataFlow={onInspectDataFlow}
      triggerClassName={isRail ? 'w-full justify-center' : undefined}
    />
  )

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-[var(--z-floating)] inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper text-[12.5px] rounded-full shadow-[0_18px_36px_-22px_rgba(22,19,16,0.32)]"
          data-no-print="true"
        >
          {toast}
        </div>
      )}

      {isRail ? (
        // Desktop rail: vertical stack, Export first (primary output), Back
        // last. Self-hides below the spine breakpoint — the bar takes over.
        <div className="hidden spine:flex spine:flex-col spine:items-stretch spine:gap-2.5">
          {exportMenu}
          {invite}
          {send}
          {logs}
          {back}
        </div>
      ) : (
        // Mobile bar: Back + secondary cluster on the left, Export on the
        // right. (The parent <footer> is itself spine:hidden.)
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3 min-w-0">
            {back}
            {invite}
            {send}
            {logs}
          </div>
          <div className="flex items-center gap-3">{exportMenu}</div>
        </div>
      )}

      <SendToArchitectModal project={project} open={sendOpen} onOpenChange={setSendOpen} />
      <InviteArchitectModal project={project} open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  )
}
