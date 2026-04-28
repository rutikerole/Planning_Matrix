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
 * Mobile rail drawer wrapped over vaul. Fixed-direction (left or right),
 * 85% screen width. Backdrop click + Esc + swipe gesture all close.
 * Focus trap + body scroll lock are vaul defaults.
 */
export function MobileRailDrawer({
  open,
  onOpenChange,
  direction,
  ariaLabel,
  children,
}: Props) {
  // Vaul mounts a `[vaul-drawer]` data-attr on body; we don't need any
  // additional global CSS, but make sure Esc closes the drawer in any
  // stacked-modal scenario.
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
        <Drawer.Overlay className="fixed inset-0 bg-ink/35 backdrop-blur-[1px] z-40" />
        <Drawer.Content
          aria-label={ariaLabel}
          className={cn(
            'fixed inset-y-0 z-50 w-[85%] max-w-[420px] bg-paper border-border-strong/40 outline-none',
            direction === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          )}
        >
          <Drawer.Title className="sr-only">{ariaLabel}</Drawer.Title>
          <div className="h-full overflow-y-auto">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
