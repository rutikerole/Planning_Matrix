// Phase 7 Chamber — LedgerTab.
//
// Right-edge fixed pull tab. Hover (desktop) or tap (mobile) reveals
// LedgerPeek. The tab itself shows "LEDGER" rotated vertically + the
// fact count badge. Pulses for 2.4s when a fresh fact arrives
// (driven by `pulseKey` prop — incremented in the parent on capture).

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'
import { useViewport } from '@/lib/useViewport'
import { LedgerPeek } from './LedgerPeek'
import type { LedgerSummary } from '@/lib/projectStateHelpers'

interface Props {
  projectId: string
  projectName: string
  summary: LedgerSummary
  /** Increments when a fresh fact lands; drives the 2.4s pulse. */
  pulseKey?: number
}

export function LedgerTab({ projectId, projectName, summary, pulseKey = 0 }: Props) {
  const { t } = useTranslation()
  const { isMobile } = useViewport()
  const [hovered, setHovered] = useState(false)
  const [pulsed, setPulsed] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!pulseKey) return
    setPulsed(true)
    const id = window.setTimeout(() => setPulsed(false), 2400)
    return () => window.clearTimeout(id)
  }, [pulseKey])

  const count = summary.factCount

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
        <Drawer.Trigger
          aria-label={t('chat.chamber.ledgerTabLabel') + ` · ${count}`}
          className={cn(
            'fixed right-0 top-1/2 -translate-y-1/2 z-[15]',
            'flex flex-col items-center gap-2 px-1.5 py-3',
            'bg-paper-card border border-r-0 border-[var(--hairline-strong)] rounded-l-md',
            'text-clay text-[11px] tracking-[0.20em] uppercase font-medium',
            'transition-shadow duration-300',
            pulsed && 'shadow-[0_0_0_4px_hsl(var(--clay)/0.18)]',
          )}
        >
          <span className="[writing-mode:vertical-rl] rotate-180 leading-none">
            {t('chat.chamber.ledgerTabLabel')}
          </span>
          <span className="font-serif italic not-uppercase tracking-normal text-[13px] text-clay-deep tabular-figures">
            {count}
          </span>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
          <Drawer.Content
            aria-label={t('chat.chamber.ledgerTabLabel')}
            className="fixed top-0 right-0 bottom-0 w-[88%] max-w-[360px] z-50 bg-paper border-l border-[var(--hairline-strong)] outline-none overflow-y-auto p-4 pt-safe pb-safe"
          >
            <Drawer.Title className="sr-only">
              {t('chat.chamber.ledgerTabLabel')}
            </Drawer.Title>
            <LedgerPeek
              projectId={projectId}
              projectName={projectName}
              summary={summary}
              variant="sheet"
            />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  // Desktop hover-reveal.
  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[15] flex items-stretch"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* Peek panel — slides out to the left of the tab */}
      <div
        aria-hidden={!hovered}
        className={cn(
          'transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          'origin-right',
          hovered ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
      >
        <LedgerPeek
          projectId={projectId}
          projectName={projectName}
          summary={summary}
        />
      </div>
      {/* Tab handle */}
      <button
        type="button"
        aria-label={t('chat.chamber.ledgerTabLabel') + ` · ${count}`}
        className={cn(
          'flex flex-col items-center gap-2 px-1.5 py-3',
          'bg-paper-card border border-r-0 border-[var(--hairline-strong)] rounded-l-md',
          'text-clay text-[11px] tracking-[0.20em] uppercase font-medium',
          'transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55',
          pulsed && 'shadow-[0_0_0_4px_hsl(var(--clay)/0.18)]',
        )}
        style={{ alignSelf: 'center' }}
      >
        <span className="[writing-mode:vertical-rl] rotate-180 leading-none">
          {t('chat.chamber.ledgerTabLabel')}
        </span>
        <span className="font-serif italic not-uppercase tracking-normal text-[13px] text-clay-deep tabular-figures">
          {count}
        </span>
      </button>
    </div>
  )
}
