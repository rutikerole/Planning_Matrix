// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 3 — Drafting-compass thinking indicator
//
// Replaces the Phase-3.2 ink-blot pause + travel-dots with a single
// drafting-compass SVG: outer faint circle, an arc that draws and
// erases continuously over 2.6 s, a pivoting arm rotating at the same
// 2.6 s clock, and a fixed nib at top. Beside it: a two-line caption
// where the bottom line rotates every 2.8 s with a 280 ms cross-fade.
//
// Action-line source:
//   • Slot 0 = the model's `thinking_label_de` (chatStore.currentThinkingLabel)
//     when present — this is the model's own hint about what's happening.
//   • Slots 1..n = chat.thinking.actions.<specialist>[1..n] — generic
//     fallbacks per specialist that surface only when the call runs
//     longer than 2.8 s.
//
// Reduced-motion: SVG goes static (no spin, no draw), action lines
// still rotate but without the opacity fade.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'
import type { Specialist } from '@/types/projectState'

const ROTATION_MS = 2800
const SWAP_MS = 280

// One-line per-specialist fallback used when i18n lookup yields no
// array (e.g. an unknown specialist key). Same content as the v1
// hardcoded ROTATING_LABELS so the visible behaviour never breaks.
const FALLBACK_LINES_DE: Record<Specialist, string[]> = {
  moderator: ['Das Team berät sich.'],
  planungsrecht: ['Planungsrecht prüft die Festsetzungen.'],
  bauordnungsrecht: ['Bauordnung prüft die Verfahrenspflicht.'],
  sonstige_vorgaben: ['Wir prüfen weitere Vorgaben.'],
  verfahren: ['Wir synthetisieren die Verfahren.'],
  beteiligte: ['Wir leiten Fachplaner ab.'],
  synthesizer: ['Wir verdichten die Erkenntnisse.'],
}

const SPECIALIST_LABEL_KEYS: Record<Specialist, string> = {
  moderator: 'chat.specialists.moderator',
  planungsrecht: 'chat.specialists.planungsrecht',
  bauordnungsrecht: 'chat.specialists.bauordnungsrecht',
  sonstige_vorgaben: 'chat.specialists.sonstige_vorgaben',
  verfahren: 'chat.specialists.verfahren',
  beteiligte: 'chat.specialists.beteiligte',
  synthesizer: 'chat.specialists.synthesizer',
}

export function ThinkingIndicator() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const specialistRaw = useChatStore((s) => s.currentSpecialist)
  const seedLabel = useChatStore((s) => s.currentThinkingLabel)

  const specialist: Specialist = specialistRaw ?? 'moderator'

  // Pull rotation lines from i18n; replace slot 0 with the model's hint
  // when one is set. Falls back to the per-specialist single-line
  // constant if the i18n lookup somehow yields a non-array (defensive).
  const lines = useMemo<string[]>(() => {
    const fallback =
      FALLBACK_LINES_DE[specialist] ?? FALLBACK_LINES_DE.moderator
    const raw = t(`chat.thinking.actions.${specialist}`, {
      returnObjects: true,
      defaultValue: fallback,
    })
    const arr = Array.isArray(raw) && raw.every((x) => typeof x === 'string')
      ? (raw as string[])
      : fallback
    if (arr.length === 0) return fallback
    if (seedLabel && seedLabel.length > 0) {
      return [seedLabel, ...arr.slice(1)]
    }
    return arr
  }, [t, specialist, seedLabel])

  const [idx, setIdx] = useState(0)
  const [swap, setSwap] = useState(false)

  // Reset rotation state when thinking stops so the next session starts
  // at slot 0. Same eslint-disable pattern used by ThinkingIndicator
  // pre-Phase-7 and BereichePlanSection — these effects synchronise UI
  // with external Zustand state, not with rendered props.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isThinking) {
      setIdx(0)
      setSwap(false)
    }
  }, [isThinking])

  // Rotate every 2.8 s with 280 ms cross-fade. Reduced-motion: rotate
  // without fade.
  useEffect(() => {
    if (!isThinking || lines.length <= 1) return
    const interval = window.setInterval(() => {
      if (reduced) {
        setIdx((i) => (i + 1) % lines.length)
        return
      }
      setSwap(true)
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % lines.length)
        setSwap(false)
      }, SWAP_MS)
    }, ROTATION_MS)
    return () => window.clearInterval(interval)
  }, [isThinking, lines.length, reduced])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isThinking) return null

  const specialistLabel = t(
    SPECIALIST_LABEL_KEYS[specialist] ?? `chat.specialists.${specialist}`,
  )
  const currentLine =
    lines[idx] ??
    lines[0] ??
    t('chat.thinking.staticLabel', { defaultValue: 'denkt nach…' })

  return (
    <article
      className="flex items-center gap-3.5 py-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`${specialistLabel} — ${t('chat.thinking.staticLabel', {
        defaultValue: 'denkt nach…',
      })}`}
    >
      <DraftingCompass reduced={!!reduced} />
      <div className="flex flex-col gap-[3px] min-w-0">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-clay leading-none">
          {specialistLabel}
        </span>
        <span
          className={cn(
            'font-serif italic text-[13.5px] text-ink-soft leading-snug',
            !reduced && 'transition-opacity duration-[280ms] ease-ease',
            !reduced && swap ? 'opacity-0' : 'opacity-100',
          )}
        >
          {currentLine}
        </span>
      </div>
    </article>
  )
}

/**
 * 28 × 28 SVG drafting compass:
 *   • outer faint circle r = 12 (clay 0.2 opacity)
 *   • arc that draws + erases continuously (stroke-dashoffset 60 → 0 → -60)
 *   • arm rotating 360° / 2.6 s linear, with a small clay pivot dot
 *   • fixed nib at the top
 *
 * `transform-box: view-box` makes `transform-origin: 14px 14px` resolve
 * inside the SVG's viewBox (centre of the compass). Without it,
 * Chromium and Firefox compute the origin from the SVG fragment's
 * client box and the rotation visibly precesses.
 */
function DraftingCompass({ reduced }: { reduced: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      stroke="hsl(var(--clay))"
      strokeWidth="1"
      strokeLinecap="round"
      className="flex-none"
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="12" strokeOpacity="0.2" />
      <path
        d="M 14 4 A 10 10 0 0 1 24 14"
        strokeDasharray="60"
        className={reduced ? '' : 'pm-thinking-arc'}
      />
      <g className={reduced ? '' : 'pm-thinking-arm'}>
        <line x1="14" y1="14" x2="14" y2="4" />
        <line x1="14" y1="14" x2="22" y2="20" />
        <circle cx="14" cy="14" r="1.4" fill="hsl(var(--clay))" stroke="none" />
      </g>
      <line x1="14" y1="2" x2="14" y2="4" strokeWidth="1.5" />
      <style>{`
        @keyframes pmThinkingArc {
          0%   { stroke-dashoffset: 60; }
          60%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -60; }
        }
        @keyframes pmThinkingArm {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .pm-thinking-arc {
          animation: pmThinkingArc 2.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .pm-thinking-arm {
          transform-origin: 14px 14px;
          transform-box: view-box;
          animation: pmThinkingArm 2.6s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pm-thinking-arc, .pm-thinking-arm { animation: none; }
        }
      `}</style>
    </svg>
  )
}
