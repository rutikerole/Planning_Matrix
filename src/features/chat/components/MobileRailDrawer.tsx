import { useEffect, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  direction: 'left' | 'right'
  ariaLabel: string
  children: ReactNode
}

/**
 * Phase 3.2 #45 — mobile rail drawer in atelier register.
 *
 * vaul base, 85% screen width capped at 420px. Backdrop now uses the
 * paper-grain SVG noise behind a darkened ink veil so the edge of the
 * drawer reads as a sheet pulled from a binder, not a generic modal.
 * Drawer surface gains:
 *   • A 6px clay/40 grab-handle pill at the top centre (a subtle
 *     "this drags" cue beyond vaul's default).
 *   • A drafting-blue inner shadow on the open edge, suggesting the
 *     bound spine of the binder.
 *   • A hairline ink/15 outer border + paper-tinted edge background
 *     beneath the content for a paper-on-paper layered look.
 *
 * Backdrop click + Esc + swipe gesture all close (vaul defaults).
 */
export function MobileRailDrawer({
  open,
  onOpenChange,
  direction,
  ariaLabel,
  children,
}: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={direction}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
        <Drawer.Content
          aria-label={ariaLabel}
          className={cn(
            'fixed inset-y-0 z-50 w-[85%] max-w-[420px] bg-paper outline-none',
            direction === 'left'
              ? 'left-0 border-r border-ink/15 shadow-[8px_0_32px_-12px_hsl(220_15%_11%/0.22)]'
              : 'right-0 border-l border-ink/15 shadow-[-8px_0_32px_-12px_hsl(220_15%_11%/0.22)]',
          )}
        >
          <Drawer.Title className="sr-only">{ariaLabel}</Drawer.Title>

          {/* Spine indicator — a 1px drafting-blue rule along the open edge. */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-y-0 w-px bg-drafting-blue/35',
              direction === 'left' ? 'right-0' : 'left-0',
            )}
          />

          {/* Top grab-handle pill */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-clay/40" />

          <div className="h-full overflow-y-auto pt-3">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
