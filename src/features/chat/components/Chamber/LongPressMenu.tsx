// Phase 7 Chamber — LongPressMenu.
//
// Three-option bottom-sheet (mobile via vaul) / anchored popover
// (desktop) triggered by:
//   - the IDK pill in SmartChips
//   - long-press (600ms) on the input textarea
//
// Each option submits {kind:'idk', mode:'research'|'assume'|'skip'}
// via the parent's onChoose callback.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { useViewport } from '@/lib/useViewport'
import { cn } from '@/lib/utils'

export type IdkMode = 'research' | 'assume' | 'skip'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  onChoose: (mode: IdkMode) => void
  /** When mounted as a popover (desktop), positions relative to the
   *  trigger via this anchor element. */
  anchorRef?: React.RefObject<HTMLElement>
}

interface OptionDef {
  mode: IdkMode
  titleKey: string
  bodyKey: string
}

const OPTIONS: OptionDef[] = [
  { mode: 'research', titleKey: 'chat.chamber.longPressResearchTitle', bodyKey: 'chat.chamber.longPressResearchBody' },
  { mode: 'assume',   titleKey: 'chat.chamber.longPressAssumeTitle',   bodyKey: 'chat.chamber.longPressAssumeBody' },
  { mode: 'skip',     titleKey: 'chat.chamber.longPressSkipTitle',     bodyKey: 'chat.chamber.longPressSkipBody' },
]

export function LongPressMenu({ open, onOpenChange, onChoose }: Props) {
  const { t } = useTranslation()
  const { isMobile } = useViewport()

  // ESC to close + Tab cycle handled by Radix/vaul defaults; nothing
  // to wire manually beyond the framework.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange} direction="bottom">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
          <Drawer.Content
            aria-label={t('chat.chamber.longPressTitle')}
            className="fixed inset-x-0 bottom-0 z-50 bg-paper border-t border-[var(--hairline-strong)] outline-none px-4 pt-5 pb-8 rounded-t-[1rem]"
          >
            <Drawer.Title className="font-serif italic text-[18px] text-ink mb-3">
              {t('chat.chamber.longPressTitle')}
            </Drawer.Title>
            <MenuBody onChoose={(m) => { onChoose(m); onOpenChange(false) }} />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full mt-2 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/55 hover:text-ink transition-colors duration-150 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55"
            >
              {t('chat.chamber.longPressCancel')}
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  // Desktop popover — simple modal-ish overlay.
  if (!open) return null
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-label={t('chat.chamber.longPressTitle')}
        className="absolute right-0 bottom-full mb-3 z-50 w-[320px] bg-paper border border-[var(--hairline-strong)] rounded-md shadow-[0_10px_36px_-8px_rgba(26,22,18,0.18)] p-3"
      >
        <p className="font-serif italic text-[15px] text-ink mb-2 px-1">
          {t('chat.chamber.longPressTitle')}
        </p>
        <MenuBody onChoose={(m) => { onChoose(m); onOpenChange(false) }} />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full mt-1 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink/55 hover:text-ink transition-colors duration-150 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55"
        >
          {t('chat.chamber.longPressCancel')}
        </button>
      </div>
    </>
  )
}

function MenuBody({ onChoose }: { onChoose: (m: IdkMode) => void }) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-1">
      {OPTIONS.map((opt) => (
        <li key={opt.mode}>
          <button
            type="button"
            onClick={() => onChoose(opt.mode)}
            className={cn(
              'w-full text-left px-4 py-3 rounded-md',
              'transition-colors duration-150 hover:bg-[hsl(var(--clay)/0.08)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55',
            )}
          >
            <p className="font-serif italic text-[16px] text-ink leading-tight m-0">
              {t(opt.titleKey)}
            </p>
            <p className="text-[12px] text-clay/82 leading-snug mt-0.5">
              {t(opt.bodyKey)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Slot helper. Used by InputBar for the popover-anchored desktop path. */
export function useLongPressMenuState(): [
  boolean,
  (next: boolean) => void,
  () => void,
] {
  const [open, setOpen] = useState(false)
  return [open, setOpen, () => setOpen(true)]
}
