// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #67 — AttachmentPicker (stub for #68)
//
// In #67 the paperclip is wired to this component but the picker
// itself is intentionally inert: a small "Coming-Soon" panel that
// confirms the affordance + opens-and-closes correctly on desktop +
// mobile (vaul drawer). #68 replaces the inner body with the real
// file-dialog + drag-and-drop zone + Supabase Storage upload, while
// the trigger / open-state / a11y wiring stay identical.
//
// We deliberately ship the panel rather than just a tooltip so the
// keyboard-focus + Escape-to-close + Vaul drawer paths get exercised
// on the live deploy. Less risk of #68 finding broken open-state
// behaviour after the real picker lands.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { Paperclip, X } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
}

export function AttachmentPicker({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    // Defer click listener so the trigger click that opened the panel
    // doesn't immediately close it.
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onClick)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const heading = t('chat.input.attachment.title', {
    defaultValue: 'Datei anhängen',
  })
  const body = t('chat.input.attachment.comingSoon', {
    defaultValue:
      'Datei-Upload für Pläne, Fotos und PDFs ist im nächsten Update verfügbar. Sie werden den Bauantrag bald direkt mit Bestandsplänen, B-Plan-PDFs und Grundbuchauszügen anreichern können.',
  })
  const dismiss = t('chat.input.attachment.understood', {
    defaultValue: 'Verstanden',
  })

  return (
    <>
      {/* Desktop popover (anchored relative to the parent .relative). */}
      <div className="hidden md:block">
        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={heading}
            className="absolute left-0 bottom-full mb-3 w-[320px] z-30 bg-paper border border-ink/15 shadow-[0_8px_32px_-12px_hsl(220_15%_11%/0.22)] rounded-[var(--pm-radius-card)] p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-clay/85">
                <Paperclip aria-hidden="true" className="size-3.5" />
                {heading}
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label={t('chat.input.attachment.close', {
                  defaultValue: 'Schließen',
                })}
                className="size-7 inline-flex items-center justify-center rounded-full text-ink/55 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
            <p className="text-[13px] text-ink/85 leading-relaxed">{body}</p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="self-end h-9 px-4 rounded-[var(--pm-radius-input)] bg-ink text-paper text-[13px] font-medium hover:bg-ink/92 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {dismiss}
            </button>
          </div>
        )}
      </div>

      {/* Mobile drawer. */}
      <div className="md:hidden">
        <Drawer.Root open={open} onOpenChange={onOpenChange} direction="bottom">
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
            <Drawer.Content
              aria-label={heading}
              className="fixed inset-x-0 bottom-0 z-50 bg-paper border-t border-ink/15 outline-none px-6 pt-6 pb-10 rounded-t-[var(--pm-radius-card)]"
            >
              <Drawer.Title className="sr-only">{heading}</Drawer.Title>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-clay/85">
                  <Paperclip aria-hidden="true" className="size-3.5" />
                  {heading}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label={t('chat.input.attachment.close', {
                    defaultValue: 'Schließen',
                  })}
                  className="size-8 inline-flex items-center justify-center rounded-full text-ink/55 hover:text-ink"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
              <p className="text-[14px] text-ink/85 leading-relaxed">{body}</p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-5 w-full h-11 px-4 rounded-[var(--pm-radius-input)] bg-ink text-paper text-[14px] font-medium hover:bg-ink/92 transition-colors duration-soft"
              >
                {dismiss}
              </button>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </>
  )
}
