// Bucket A.2 + A.3 — shared honesty banner for stub-state projects.
//
// Renders when the project's bundesland has a thin state-block (11 of 16
// states; see hasSubstantiveStateBlock in src/legal/demoCoverage.ts).
// Mounted on the chat workspace above the message stream (Bucket A.2) and
// on the result workspace inside <main>, above the tab panels (Bucket A.3
// + UI-sweep D-02: it must live IN DOCUMENT FLOW — never inside a sticky
// or fixed slot — so it can never overlap content cards).
//
// UI-sweep D-02 (decided behavior): the full banner auto-collapses after
// a few seconds into a compact chip that PERSISTS for the whole session —
// the disclaimer never disappears entirely (correctness requirement: the
// full text stays reachable via the chip's title/aria-label and by
// re-expanding). The collapsed state is remembered per bundesland in
// sessionStorage so tab switches and route changes don't replay the full
// banner every time. prefers-reduced-motion gets an instant swap.
// data-no-print so PDF rendering does not capture it.

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { hasSubstantiveStateBlock } from '@/legal/demoCoverage'
import { getStateCitations } from '@/legal/stateCitations'

interface Props {
  bundesland: string | null | undefined
}

const AUTO_COLLAPSE_MS = 4500

function readCollapsed(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === 'collapsed'
  } catch {
    return false
  }
}

function writeCollapsed(key: string) {
  try {
    window.sessionStorage.setItem(key, 'collapsed')
  } catch {
    /* storage unavailable — banner simply stays expanded */
  }
}

export function PreliminaryStateBanner({ bundesland }: Props) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()

  const eligible = !!bundesland && !hasSubstantiveStateBlock(bundesland)
  const storageKey = `pm-prelim-state-banner:${bundesland ?? ''}`
  const [expanded, setExpanded] = useState(
    () => eligible && !readCollapsed(storageKey),
  )

  // One-shot auto-collapse per session. Manual re-expansion (chip click)
  // does NOT re-arm the timer — at that point the user asked for it.
  useEffect(() => {
    if (!eligible || readCollapsed(storageKey)) return
    const id = window.setTimeout(() => {
      writeCollapsed(storageKey)
      setExpanded(false)
    }, AUTO_COLLAPSE_MS)
    return () => window.clearTimeout(id)
  }, [eligible, storageKey])

  if (!eligible) return null

  // Resolve the human label so the banner names the bundesland.
  // getStateCitations normalises internally and falls back to an honest
  // stub on unknown codes, so no try/catch needed.
  const pack = getStateCitations(bundesland)
  const label = i18n.language === 'en' ? pack.labelEn : pack.labelDe
  const fullText = t('chat.banner.preliminaryState', { bundesland: label })
  const shortText = t('chat.banner.preliminaryStateShort', { bundesland: label })

  const collapse = () => {
    writeCollapsed(storageKey)
    setExpanded(false)
  }

  return (
    <div data-no-print="true" data-prelim-banner={expanded ? 'expanded' : 'collapsed'}>
      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <m.div
            key="full"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }
            }
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
            role="note"
          >
            <div
              className={cn(
                'mx-auto my-3 max-w-2xl flex items-start gap-3 px-4 py-3',
                'bg-paper-card border border-clay/40 rounded-[8px]',
                'text-[12.5px] leading-snug text-clay/85 italic font-serif',
              )}
            >
              <Info aria-hidden="true" className="size-3.5 text-clay mt-0.5 shrink-0" />
              <p className="flex-1">{fullText}</p>
              <button
                type="button"
                onClick={collapse}
                aria-label={t('chat.banner.preliminaryStateCollapse')}
                className="shrink-0 -m-1 p-1 leading-none text-clay/70 hover:text-ink not-italic font-sans text-[13px] transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 rounded-sm"
              >
                ×
              </button>
            </div>
          </m.div>
        ) : (
          <m.div
            key="chip"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0 : 0.3 }}
            className="flex justify-center my-2"
          >
            <button
              type="button"
              onClick={() => setExpanded(true)}
              title={fullText}
              aria-label={`${fullText} — ${t('chat.banner.preliminaryStateExpand')}`}
              aria-expanded={false}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
                'bg-paper-card border border-clay/35',
                'text-[11px] italic font-serif text-clay/85',
                'hover:text-ink hover:border-clay/60 transition-colors duration-soft',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              )}
            >
              <Info aria-hidden="true" className="size-3 text-clay shrink-0" />
              <span>{shortText}</span>
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
