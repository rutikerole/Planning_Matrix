import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  loading?: boolean
  disabled?: boolean
  loadingLabel?: string
  className?: string
}

/**
 * Primary form-submit button. Three-clay-dot loading state replaces
 * the label while loading; aria-busy + aria-live communicate that to
 * screen readers without forcing focus to move. Click is blocked
 * (disabled) to prevent double-submit.
 */
export function SubmitButton({
  children,
  loading = false,
  disabled = false,
  loadingLabel,
  className,
}: Props) {
  return (
    <button
      type="submit"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex h-11 items-center justify-center gap-2 px-5 rounded-[5px] bg-ink text-paper text-[14px] font-medium tracking-tight',
        'shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_2px_4px_-1px_hsl(220_15%_11%/0.18)]',
        'hover:bg-ink/92 hover:shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_8px_18px_-6px_hsl(220_15%_11%/0.32)]',
        'motion-safe:hover:-translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'transition-[background-color,box-shadow,transform] duration-soft ease-soft',
        'disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
    >
      {loading ? (
        <>
          <span className="sr-only" aria-live="polite">
            {loadingLabel ?? children}
          </span>
          <span aria-hidden="true" className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-paper/85"
                style={{
                  animation: 'blink-cursor 1.05s ease-in-out infinite',
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </span>
        </>
      ) : (
        <span>{children}</span>
      )}
    </button>
  )
}
