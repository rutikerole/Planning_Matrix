// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #83 — TouchTarget
//
// Wraps any interactive element to enforce the WCAG 2.5.5 + Apple HIG
// 44 × 44 px minimum hit area without changing the visual. The visual
// child renders at its natural size; padding fills the rest of the
// 44 × 44 box.
//
// Usage:
//   <TouchTarget aria-label="Senden">
//     <ArrowUp className="size-[18px]" />
//   </TouchTarget>
//
// The `asChild` variant uses Radix Slot (already a transitive dep via
// shadcn/ui — no new install) so callers can render as <a>, <Link>
// from react-router, or any custom component that forwards refs.
// ───────────────────────────────────────────────────────────────────────

import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** When true, render via Slot to merge props onto a passed child. */
  asChild?: boolean
  children: ReactNode
}

export const TouchTarget = forwardRef<HTMLButtonElement, Props>(
  function TouchTarget({ asChild, children, className, ...props }, ref) {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        data-pm-touch="true"
        // -webkit-tap-highlight-color is overridden globally in
        // globals.css; touch-action: manipulation suppresses iOS
        // double-tap-to-zoom which is a no-op on form controls but
        // saves 300 ms on plain buttons.
        className={cn(
          'min-w-[44px] min-h-[44px] inline-flex items-center justify-center select-none',
          '[touch-action:manipulation]',
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    )
  },
)
