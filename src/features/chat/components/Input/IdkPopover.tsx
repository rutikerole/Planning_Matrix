import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  onChoose: (mode: 'research' | 'assume' | 'skip') => void
}

const MODES = ['research', 'assume', 'skip'] as const

/**
 * "Weiß ich nicht" branch picker. Three rows, each a bold Inter title
 * with a clay one-line explanation below. Click any → fires onChoose
 * (which submits the corresponding idk UserAnswer in the parent) and
 * closes. Backdrop click + Esc close. Focus trapped while open; focus
 * restored to the trigger after close (parent's responsibility — we
 * stash + restore from document.activeElement here as a safety net).
 */
export function IdkPopover({ open, onClose, onChoose }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    firstButtonRef.current?.focus()
    return () => {
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled])',
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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            className="fixed inset-0 bg-ink/30 backdrop-blur-[1px] z-50"
            onClick={onClose}
            aria-hidden="true"
          />
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="idk-dialog-title"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 bottom-24 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-paper border border-border-strong/45 rounded-md shadow-[0_24px_60px_-20px_hsl(220_15%_11%/0.32)] p-2"
          >
            <h2
              id="idk-dialog-title"
              className="px-3 pt-2 pb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-clay"
            >
              {t('chat.input.idk.label')}
            </h2>
            <div className="flex flex-col">
              {MODES.map((mode, idx) => (
                <button
                  key={mode}
                  ref={idx === 0 ? firstButtonRef : undefined}
                  type="button"
                  onClick={() => {
                    onChoose(mode)
                    onClose()
                  }}
                  className="text-left px-3 py-3 rounded-sm hover:bg-muted/50 transition-colors duration-soft focus-visible:outline-none focus-visible:bg-muted/60"
                >
                  <p className="text-[13.5px] font-medium text-ink leading-snug">
                    {t(`chat.input.idk.${mode}`)}
                  </p>
                  <p className="text-[11px] text-clay/85 leading-relaxed mt-1">
                    {t(`chat.input.idk.${mode}Explain`)}
                  </p>
                </button>
              ))}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
