import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageRow, ProjectRow } from '@/types/db'
import { ExportMenu } from './ExportMenu'
import { SendToArchitectModal } from './SendToArchitectModal'
import type { ResultSource } from './ResultWorkspace'

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
  source: ResultSource
}

/**
 * Phase 8 — sticky bottom action bar of the Result Workspace.
 *
 * Owned mode: back-to-consultation pill + dotted "Send to architect"
 * stub on the left; "Take it home" overflow menu on the right (PDF /
 * Markdown / JSON / Share-link / Email-stub / Inspect-data-flow).
 *
 * Shared mode: hidden — recipients shouldn't generate further share
 * links or write actions. The workspace skips this footer entirely
 * when source.kind === 'shared'.
 *
 * Toast: when a share link is created the URL is already on the
 * clipboard (the menu writes it as soon as the token is minted). The
 * toast surfaces the success + 30-day expiry.
 */
export function ResultFooter({ project, messages, events, source }: Props) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [toast, setToast] = useState<string | null>(null)
  const [sendOpen, setSendOpen] = useState(false)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(id)
  }, [toast])

  if (source.kind === 'shared') return null

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

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-40 inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper text-[12.5px] rounded-full shadow-[0_18px_36px_-22px_rgba(22,19,16,0.32)]"
          data-no-print="true"
        >
          {toast}
        </div>
      )}
      <footer
        className={cn(
          'sticky bottom-0 z-20 bg-paper-card/95 backdrop-blur-[6px] border-t border-ink/15',
          'px-4 sm:px-6 lg:px-8 py-3',
        )}
        data-no-print="true"
      >
        <div className="flex items-center justify-between gap-3 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/projects/${project.id}`}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-paper border border-ink/15 rounded-full text-[12px] text-ink/75 hover:text-ink hover:border-ink/30 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card"
            >
              <ArrowLeft aria-hidden="true" className="size-3" />
              <span className="hidden sm:inline">
                {t('result.workspace.footer.back')}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setSendOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 bg-paper border border-dashed border-clay/55 rounded-full text-[12px] italic font-serif text-clay hover:text-ink hover:border-clay transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card"
            >
              {t('result.workspace.footer.sendToArchitect')}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <ExportMenu
              project={project}
              messages={messages}
              events={events}
              onShareCreated={onShareCreated}
              onInspectDataFlow={onInspectDataFlow}
            />
          </div>
        </div>
      </footer>
      <SendToArchitectModal
        project={project}
        open={sendOpen}
        onOpenChange={setSendOpen}
      />
    </>
  )
}
