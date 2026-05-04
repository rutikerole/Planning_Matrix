// Phase 7.5 — SpineMobileTrigger.
//
// 36 px strip rendered just below AstrolabeStickyHeader on viewports
// < 1024 px. Carries a tiny progress bar + "{done} of 8 · {current}"
// + chevron. Tap opens a vaul left drawer with the full Spine.

import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ResolvedSpineStage } from '../../../hooks/useSpineStages'

interface Props {
  /** Resolved stages — used to compute done count + current title. */
  stages: ResolvedSpineStage[]
  percent: number
  /** Slot for the full Spine inner — header, list, footer — rendered
   *  inside the drawer when open. */
  drawerContent: ReactNode
}

export function SpineMobileTrigger({ stages, percent, drawerContent }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const doneCount = stages.filter((s) => s.status === 'done').length
  const liveStage = stages.find((s) => s.status === 'live')
  const currentTitle = liveStage?.title ?? '—'

  // Hook into the chamber:escape CustomEvent dispatched by
  // useKeyboardShortcuts so Esc closes the drawer in priority order.
  useEffect(() => {
    if (!open) return
    const onEsc = () => setOpen(false)
    document.addEventListener('chamber:escape', onEsc as EventListener)
    return () =>
      document.removeEventListener('chamber:escape', onEsc as EventListener)
  }, [open])

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="left">
      <Drawer.Trigger
        aria-label={t('chat.spine.mobile.drawerTitle')}
        className={cn(
          'lg:hidden',
          'sticky top-[56px] z-[24] w-full',
          'flex items-center gap-3 h-9 px-4',
          'bg-paper-card border-b border-[var(--hairline,rgba(26,22,18,0.10))]',
          'text-[12px] text-ink/85',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55',
        )}
      >
        {/* Tiny progress bar */}
        <span
          aria-hidden="true"
          className="block w-10 h-[2px] bg-[var(--hairline,rgba(26,22,18,0.10))] rounded-full overflow-hidden"
        >
          <span
            className="block h-full bg-clay rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          />
        </span>
        <span className="flex-1 truncate text-left">
          {t('chat.spine.mobile.trigger', {
            done: doneCount,
            current: currentTitle,
          })}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 text-clay shrink-0"
        />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
        <Drawer.Content
          aria-label={t('chat.spine.mobile.drawerTitle')}
          className={cn(
            'fixed top-0 bottom-0 left-0 z-50 outline-none',
            'w-[88%] max-w-[320px]',
            'bg-paper-card border-r border-[var(--hairline-strong,rgba(26,22,18,0.18))]',
            'flex flex-col pt-safe pb-safe',
          )}
        >
          <Drawer.Title className="sr-only">
            {t('chat.spine.mobile.drawerTitle')}
          </Drawer.Title>
          <div
            className="flex-1 min-h-0 flex flex-col"
            onClickCapture={(e) => {
              // Auto-close the drawer when the user taps a done-stage
              // row OR the briefing CTA. Done-stage clicks scroll the
              // thread; users expect the drawer to step out of the way.
              const target = e.target as HTMLElement
              if (
                target.closest('[data-spine-stage]') ||
                target.closest('a[href*="/result"]')
              ) {
                setOpen(false)
              }
            }}
          >
            {drawerContent}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
