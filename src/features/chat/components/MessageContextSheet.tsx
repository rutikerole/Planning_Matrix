import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import { useTranslation } from 'react-i18next'
import { Copy, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Bauherr" / specialist label / "Sie" — shown in the sheet header. */
  fromLabel: string
  /** The message body to copy + preview. */
  text: string
}

/**
 * Phase 3.9 #97 — message context sheet (mobile only).
 *
 * Triggered by long-press on a message bubble. Renders a vaul bottom
 * sheet with: sender label · short preview · Kopieren action · Schließen.
 *
 * Copy uses the Clipboard API with a 1.6s "Kopiert" confirmation. No
 * fallback for non-secure contexts — if the API isn't available we
 * just leave the button in its idle state (the sheet still serves as
 * a quick-look surface).
 */
export function MessageContextSheet({ open, onOpenChange, fromLabel, text }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  // Reset the "Kopiert" confirmation when the sheet closes. The lint
  // is overly strict here — this is the canonical "react to a prop
  // change" pattern; the alternative (key on the parent) would require
  // re-architecture for marginal gain.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard not available — leave button idle */
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Drawer.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-paper rounded-t-[12px] border-t border-ink/15 pb-safe',
            'shadow-[0_-12px_32px_-12px_hsl(220_15%_11%/0.18)]',
          )}
        >
          <Drawer.Title className="sr-only">
            {t('chat.contextSheet.title', { defaultValue: 'Nachrichtenoptionen' })}
          </Drawer.Title>
          {/* Grab handle */}
          <span
            aria-hidden="true"
            className="block self-center mt-2 mb-3 h-1 w-10 rounded-full bg-clay/35"
          />

          <div className="px-5 pb-2 flex flex-col gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85">
              {fromLabel}
            </p>
            <p className="font-serif italic text-[13px] text-ink/65 leading-relaxed line-clamp-3">
              {text}
            </p>
          </div>

          <div className="px-3 pt-2 pb-4 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={cn(
                'min-h-[48px] flex items-center gap-3 px-3 rounded-[6px] text-[14px] font-medium text-ink',
                'hover:bg-ink/[0.04] active:bg-ink/[0.06] transition-colors duration-soft',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35',
              )}
            >
              {copied ? (
                <>
                  <Check aria-hidden="true" className="size-[18px] text-clay" />
                  <span>{t('chat.contextSheet.copied', { defaultValue: 'Kopiert' })}</span>
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" className="size-[18px] text-ink/65" />
                  <span>{t('chat.contextSheet.copy', { defaultValue: 'Text kopieren' })}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                'min-h-[48px] flex items-center gap-3 px-3 rounded-[6px] text-[14px] text-ink/65',
                'hover:bg-ink/[0.04] active:bg-ink/[0.06] transition-colors duration-soft',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35',
              )}
            >
              <X aria-hidden="true" className="size-[18px] text-ink/55" />
              <span>{t('chat.contextSheet.close', { defaultValue: 'Schließen' })}</span>
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
