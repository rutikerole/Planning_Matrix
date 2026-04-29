// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #75 — Unified sticky footer across the chat workspace
//
// Replaces the "four floating corners" feel: left rail bottom links,
// center column input bar, right rail bottom links/scale-bar/cost
// ticker were previously three independent surfaces stacking at
// the workspace bottom. This component is one band that spans the
// full grid width.
//
// Desktop (lg+): three sub-columns matching the workspace grid widths.
// Mobile: collapses to a single bar containing the input + an overflow
// trigger that opens a vaul drawer with the secondary actions
// (Q9 locked: single bar + drawer).
// ───────────────────────────────────────────────────────────────────────

import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { MoreHorizontal, X } from 'lucide-react'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectEventRow } from '../../hooks/useProjectEvents'
import { FooterLeftColumn } from './FooterLeftColumn'
import { FooterRightColumn } from './FooterRightColumn'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  /** The InputBar in embedded mode — UnifiedFooter owns the band chrome. */
  inputBar: ReactNode
}

export function UnifiedFooter({ project, messages, events, inputBar }: Props) {
  const { t } = useTranslation()
  const [overflowOpen, setOverflowOpen] = useState(false)

  return (
    <footer
      data-pm-unified-footer="true"
      // Phase 3.7 follow-up — chrome removed: no background tint, no
      // hairline-top border, no drop shadow. Items sit directly on
      // the paper grid; only the Briefing primary CTA carries its own
      // drafting-blue/15 fill (it's an action button, not chrome).
      // Sticky behaviour preserved via `fixed` so the band stays
      // anchored as the user scrolls the thread.
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)',
      }}
    >
      {/* Desktop band — three sub-columns mirroring the grid above. */}
      <div className="hidden lg:block">
        <div className="mx-auto w-full max-w-[1440px] grid lg:grid-cols-[280px_minmax(0,1fr)_360px] gap-x-4 px-4 sm:px-6 lg:px-8 pt-3 pb-2">
          <div className="min-w-0">
            <FooterLeftColumn
              project={project}
              messages={messages}
              events={events}
            />
          </div>
          {/* Phase 4.1.12 — 8 px each side so the InputBar's right edge
            * aligns with the message column above. The footer grid carries
            * `gap-x-4` + `lg:px-8` while the body grid has neither, which
            * makes the footer's center column 16 px wider than the body's
            * center column inner area (688 px after `lg:px-14`). Without
            * this padding the input bar overhangs the message text by 8 px
            * on each side. */}
          <div className="min-w-0 flex flex-col justify-end lg:px-2">
            {inputBar}
          </div>
          <div className="min-w-0">
            <FooterRightColumn project={project} messages={messages} />
          </div>
        </div>
      </div>

      {/* Mobile band — input + overflow trigger. */}
      <div className="lg:hidden px-3 pt-2.5 pb-1.5">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">{inputBar}</div>
          <button
            type="button"
            onClick={() => setOverflowOpen(true)}
            aria-label={t('chat.footer.overflowLabel', {
              defaultValue: 'Weitere Aktionen',
            })}
            aria-haspopup="dialog"
            className="shrink-0 inline-flex items-center justify-center size-10 mb-1 rounded-[var(--pm-radius-pill,9999px)] text-ink/65 hover:text-ink hover:bg-ink/[0.04] transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <MoreHorizontal aria-hidden="true" className="size-[18px]" />
          </button>
        </div>

        {/* Mobile overflow drawer — Q9 locked */}
        <Drawer.Root
          open={overflowOpen}
          onOpenChange={setOverflowOpen}
          direction="bottom"
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
            <Drawer.Content
              aria-label={t('chat.footer.overflowLabel', {
                defaultValue: 'Weitere Aktionen',
              })}
              className="fixed inset-x-0 bottom-0 z-50 bg-paper border-t border-ink/15 outline-none px-6 pt-6 pb-10 rounded-t-[var(--pm-radius-card-lg,0.75rem)] flex flex-col gap-5"
            >
              <Drawer.Title className="sr-only">
                {t('chat.footer.overflowLabel', {
                  defaultValue: 'Weitere Aktionen',
                })}
              </Drawer.Title>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.20em] text-clay/85">
                  {t('chat.footer.overflowEyebrow', {
                    defaultValue: 'Aktionen & Übersicht',
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => setOverflowOpen(false)}
                  aria-label={t('chat.input.attachment.close', {
                    defaultValue: 'Schließen',
                  })}
                  className="size-8 inline-flex items-center justify-center rounded-full text-ink/55 hover:text-ink"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <FooterLeftColumn
                project={project}
                messages={messages}
                events={events}
              />

              <span aria-hidden="true" className="block h-px bg-ink/10" />

              <FooterRightColumn project={project} messages={messages} />
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </footer>
  )
}
