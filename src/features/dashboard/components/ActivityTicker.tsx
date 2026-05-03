import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useRecentActivity } from '../hooks/useRecentActivity'
import { useRelativeTime } from '../hooks/useRelativeTime'
import { summarizeEvent } from '../lib/recentActivity'

const ROTATION_MS = 4000

function shortAddress(addr: string | null): string {
  if (!addr) return '—'
  return addr.split(',')[0]?.trim() || addr
}

/**
 * v3 live ticker. Pulls the last 8 project_events via
 * `useRecentActivity`, rotates one line at a time every 4s with a
 * vertical slide-up cross-fade. Hides entirely if zero events.
 *
 * Reduced motion: stacks 5 lines vertically with a fade-out
 * gradient at the bottom; no rotation.
 */
export function ActivityTicker() {
  const { t, i18n } = useTranslation()
  const { data: events } = useRecentActivity()
  const reduced = useReducedMotion()
  const { format } = useRelativeTime()
  const [idx, setIdx] = useState(0)

  const lang = i18n.language?.startsWith('en') ? 'en' : 'de'
  const items = events ?? []

  useEffect(() => {
    if (reduced || items.length <= 1) return
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % items.length)
    }, ROTATION_MS)
    return () => window.clearInterval(id)
  }, [reduced, items.length])

  if (items.length === 0) return null

  // Cap idx in case items shrank between renders — render-time only.
  const safeIdx = idx < items.length ? idx : 0

  const renderLine = (e: (typeof items)[number]) => (
    <span className="flex items-center gap-2.5">
      <span className="text-pm-ink-mute2">{format(e.created_at)}</span>
      <span aria-hidden="true">·</span>
      <span className="text-pm-ink-mid">{shortAddress(e.project_address)}</span>
      <span aria-hidden="true">·</span>
      <span className="text-pm-clay">{summarizeEvent(e.event_type, lang)}</span>
    </span>
  )

  if (reduced) {
    return (
      <div className="relative mt-9 flex max-w-[780px] flex-col gap-1 overflow-hidden border border-pm-hair bg-pm-paper-tint p-4 max-h-20">
        <div className="mb-1 flex items-center gap-3">
          <span aria-hidden className="block size-1.5 rounded-full bg-pm-sage" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-pm-ink-mute2">
            {t('dashboard.ticker.label')}
          </span>
        </div>
        <ul className="flex flex-col gap-1 font-mono text-[12px] text-pm-ink-mid">
          {items.slice(0, 5).map((e) => (
            <li key={e.id}>{renderLine(e)}</li>
          ))}
        </ul>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-pm-paper-tint to-transparent"
        />
      </div>
    )
  }

  const current = items[safeIdx] ?? items[0]

  return (
    <div className="relative mt-9 flex max-w-[780px] items-center gap-3.5 overflow-hidden border border-pm-hair bg-pm-paper-tint px-4.5 py-3.5">
      <span
        aria-hidden
        className="block size-1.5 rounded-full bg-pm-sage shadow-[0_0_0_4px_hsl(140_18%_60%_/_0.25)] motion-safe:animate-[pulse_1.8s_ease-in-out_infinite]"
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-pm-ink-mute2">
        {t('dashboard.ticker.label')}
      </span>
      <div className="relative flex-1 h-[18px] overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={current.id}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-0 whitespace-nowrap font-mono text-[12px] text-pm-ink-mid"
          >
            {renderLine(current)}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
