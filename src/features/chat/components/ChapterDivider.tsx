// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 4 — Chapter divider
//
//   ──────────  II  Building code · in progress  ──────────
//
// Inserted between assistant turns when the speaking specialist
// materially changes (see detectChapters). Italic-serif Roman
// numeral + mono small-caps label, flanked by hairlines.
//
// Each divider carries `id="chapter-<index>"` so future surfaces
// (Move 11 Stand Up timeline) can scroll to it. Animates in with a
// 480 ms slide-up + fade on first mount; reduced-motion = instant.
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import type { Chapter } from '../lib/detectChapters'

interface Props {
  chapter: Chapter
  /** 1-based index for Roman numeral display. */
  index: number
}

const ROMAN = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
]

export function ChapterDivider({ chapter, index }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const numeral = ROMAN[index - 1] ?? String(index)
  const label = t(`chat.chapters.${chapter.specialist}.${chapter.stage}`, {
    defaultValue: `${chapter.specialist} · ${chapter.stage}`,
  })

  return (
    <m.div
      id={`chapter-${index}`}
      role="separator"
      aria-label={label}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="mt-14 mb-10 flex items-center gap-4"
    >
      <span aria-hidden="true" className="flex-1 h-px bg-hairline" />
      <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute leading-none whitespace-nowrap">
        <span className="font-serif italic text-[12px] text-clay tracking-normal normal-case mr-1.5">
          {numeral}
        </span>
        {label}
      </span>
      <span aria-hidden="true" className="flex-1 h-px bg-hairline" />
    </m.div>
  )
}
