// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 5 — Citation chip
//
// Inline interactive law reference. Hover or focus opens a Radix
// Popover (auto-flips at viewport edges) with the article's title +
// summary + optional external link. Click/Enter on a focused chip
// also opens the popover; Esc closes and restores focus.
//
// Mouse: hover opens, mouseleave on either trigger or content closes
// (so cursor can travel from chip → popover without it disappearing).
// Keyboard: Tab focuses, Enter / Space opens, Esc closes (Radix
// handles the latter two natively).
// Touch: tap opens (mouseenter doesn't fire on touch — Radix click
// handler still triggers).
// ───────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { LawArticle } from '../lib/lawArticles'

interface Props {
  article: LawArticle
}

export function CitationChip({ article }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="inline-flex items-center px-1.5 py-px font-mono text-xs bg-clay-tint text-clay-deep rounded-[3px] cursor-pointer mx-px transition-colors duration-[160ms] ease-ease hover:bg-clay-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-1 focus-visible:ring-offset-paper"
        >
          <span className="italic text-clay text-[11px] mr-0.5">§</span>
          {article.display}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-80 p-3.5 bg-paper-card border border-hairline-strong rounded-[4px] font-sans text-ink-soft text-[12.5px] leading-snug shadow-[0_1px_0_rgba(26,22,18,0.04),0_12px_36px_-10px_rgba(26,22,18,0.18)]"
      >
        <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-clay mb-1.5">
          {t(`chat.law.${article.i18nKey}.head`)}
        </p>
        <p className="font-serif italic text-sm text-ink mb-2">
          {t(`chat.law.${article.i18nKey}.title`)}
        </p>
        <p>{t(`chat.law.${article.i18nKey}.summary`)}</p>
        {article.href && (
          <a
            href={article.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2.5 font-mono text-[9.5px] tracking-[0.12em] uppercase text-clay hover:text-clay-deep transition-colors duration-[160ms] ease-ease"
          >
            {t('chat.law.viewFull')} →
          </a>
        )}
      </PopoverContent>
    </Popover>
  )
}
