import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LastViewedDiff } from '../../lib/composeLastViewedDiff'

interface Props {
  diff: LastViewedDiff
  /** Locale for the modal's date formatting. */
  lang: 'de' | 'en'
}

const FIRST_VIEW_AUTODISMISS_MS = 5000

/**
 * Phase 8.3 (C.1) — Since-last-view pill that sits below the header
 * breadcrumb. First-time visitors see a short "First view" pill that
 * auto-dismisses after 5s. Returning visitors see a summary
 * ("4 facts decided, 1 procedure confirmed, 2 new recommendations").
 * Click → opens a modal listing the events since last view.
 */
export function SinceLastViewPill({ diff, lang }: Props) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!diff.isFirstView) return
    const id = window.setTimeout(() => setDismissed(true), FIRST_VIEW_AUTODISMISS_MS)
    return () => window.clearTimeout(id)
  }, [diff.isFirstView])

  if (dismissed) return null

  const { counts } = diff
  const summary: string[] = []
  if (counts.factsAdded > 0) {
    summary.push(
      t('result.workspace.sinceLastView.summaryFactsAdded', {
        count: counts.factsAdded,
      }),
    )
  }
  if (counts.factsUpgraded > 0) {
    summary.push(
      t('result.workspace.sinceLastView.summaryFactsUpgraded', {
        count: counts.factsUpgraded,
      }),
    )
  }
  if (counts.proceduresAdded > 0) {
    summary.push(
      t('result.workspace.sinceLastView.summaryProceduresAdded', {
        count: counts.proceduresAdded,
      }),
    )
  }
  if (counts.recommendationsAdded > 0) {
    summary.push(
      t('result.workspace.sinceLastView.summaryRecommendationsAdded', {
        count: counts.recommendationsAdded,
      }),
    )
  }

  // First view OR no diff → render the calm "First view" pill.
  if (diff.isFirstView) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 px-3 h-7 bg-paper-card border border-clay/40 rounded-full text-[11px] italic font-serif text-clay leading-none"
      >
        <span>{t('result.workspace.sinceLastView.firstView')}</span>
      </div>
    )
  }

  if (summary.length === 0) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[11px] italic font-serif transition-colors duration-soft',
          'bg-paper-card border border-clay/40 text-clay-deep hover:bg-clay/[0.06] hover:border-clay',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        )}
      >
        <span className="not-italic font-medium uppercase tracking-[0.16em] text-[9.5px] text-clay">
          {diff.relativeLabel}
        </span>
        <span>{summary.join(' · ')}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-paper border border-ink/15 rounded-[10px] p-6 max-w-[520px] flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-baseline justify-between gap-3">
            <DialogTitle className="font-serif italic text-[20px] text-ink leading-snug">
              {t('result.workspace.sinceLastView.modalTitle')}
            </DialogTitle>
            <DialogClose
              className="size-7 inline-flex items-center justify-center rounded-full text-ink/45 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft"
              aria-label={t('result.workspace.sinceLastView.close', {
                defaultValue: 'Schließen',
              })}
            >
              <X aria-hidden="true" className="size-3.5" />
            </DialogClose>
          </div>
          <p className="text-[12px] italic text-clay leading-snug">
            {t('result.workspace.sinceLastView.modalSubtitle', {
              relativeTime: diff.relativeLabel,
            })}
          </p>
          {diff.events.length === 0 ? (
            <p className="text-[12.5px] italic text-clay/85 leading-relaxed">
              {t('result.workspace.sinceLastView.noEvents')}
            </p>
          ) : (
            <ul className="flex flex-col">
              {diff.events.map((evt, idx) => (
                <li
                  key={evt.id}
                  className={
                    'grid grid-cols-[120px_1fr_80px] gap-3 py-2 text-[12px] ' +
                    (idx > 0 ? 'border-t border-ink/10' : '')
                  }
                >
                  <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap">
                    {formatTime(evt.created_at, lang)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-ink leading-snug">{evt.event_type}</span>
                    {evt.reason && (
                      <span className="text-[11px] italic text-ink/65 leading-snug">
                        {evt.reason}
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] uppercase tracking-[0.16em] text-clay leading-snug whitespace-nowrap">
                    {evt.triggered_by}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatTime(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
