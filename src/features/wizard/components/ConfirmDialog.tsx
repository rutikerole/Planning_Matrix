import { useEffect, useRef } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'

interface Props {
  open: boolean
  title: string
  body?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Calm modal confirm. Focus trapped inside while open; Esc and backdrop
 * click both fire onCancel. The cancel button receives focus on open
 * (the safer default — a destructive primary needs an explicit click,
 * never a stray Enter). Reduced-motion suppresses the y-shift animation.
 *
 * Brand-aligned chrome: paper card, hairline border, calm shadow,
 * Instrument Serif title, Inter body. No emoji, no icons.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion()

  // Stash + restore focus around the lifecycle of the dialog.
  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()
    return () => {
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  // Esc closes.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  // Tab/Shift+Tab cycle inside dialog only.
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            className="fixed inset-0 bg-ink/35 backdrop-blur-[1px] z-50"
            onClick={onCancel}
            aria-hidden="true"
          />
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-paper border border-border-strong/45 rounded-md shadow-[0_24px_60px_-20px_hsl(220_15%_11%/0.32)] p-6"
          >
            <h2
              id="confirm-dialog-title"
              className="font-display text-2xl text-ink leading-snug mb-3"
            >
              {title}
            </h2>
            {body && (
              <p className="text-sm text-ink/70 leading-relaxed mb-6">{body}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onCancel}
                className="h-10 px-4 rounded-sm border border-border-strong/55 text-[13.5px] font-medium text-ink/85 hover:bg-muted/40 hover:text-ink transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="h-10 px-4 rounded-sm bg-ink text-paper text-[13.5px] font-medium hover:bg-ink/92 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {confirmLabel}
              </button>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
