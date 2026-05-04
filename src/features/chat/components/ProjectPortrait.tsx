// ───────────────────────────────────────────────────────────────────────
// Phase 7 Pass 5 — Project Portrait (rewrite to match prototype 1:1)
//
// Replaces the Pass 2/3 IntentAxonometric-based merged card with a
// section-view drawing copied verbatim from prototypes/chat-redesign.html
// (right rail "Project portrait" block, lines 1756-1808):
//
//   • viewBox 280 × 100, full-width inside the card.
//   • Ground line + 14-tick ground hatch.
//   • House outline as polygon (front-on, gable-roof section).
//   • Floor line + 6 windows + door.
//   • Reactive: wall-height bracket on the right (fact `wandhoehe` /
//     `wall_height_m`); GK badge upper-left when `gebaeudeklasse`
//     is in state.facts.
//   • Permanent N-arrow upper-right.
//
// One drawing. The A/B/C area visualization lives in its own
// BereichePlanSection block below — Pass 5 brief reinstated the
// hatched-bands illustration as a separate visual.
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import type { Fact, ProjectState } from '@/types/projectState'
import { INTENT_TO_I18N } from '@/features/wizard/lib/selectTemplate'

interface Props {
  intent: string
  state?: Partial<ProjectState>
}

function pickFact<T = unknown>(
  facts: Fact[] | undefined,
  keys: string[],
): T | null {
  if (!facts) return null
  for (const k of keys) {
    const f = facts.find((x) => x.key === k)
    if (f && f.value !== null && f.value !== undefined) return f.value as T
  }
  return null
}

export function ProjectPortrait({ intent, state }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const facts = state?.facts
  const wallHeight = pickFact<number | string>(facts, [
    'wandhoehe',
    'wall_height_m',
    'wandhoehe_m',
  ])
  const gkRaw = pickFact<number | string>(facts, ['gebaeudeklasse'])
  const gk = (() => {
    if (gkRaw === null || gkRaw === undefined) return null
    if (typeof gkRaw === 'string') {
      const stripped = gkRaw.replace(/^GK\s*/i, '').trim()
      return stripped || null
    }
    return String(gkRaw)
  })()
  const intentSlug =
    (INTENT_TO_I18N as Record<string, string>)[intent] ?? 'sonstige'
  const intentLabel = t(`wizard.q1.options.${intentSlug}.label`, {
    defaultValue: t('wizard.q1.options.sonstige.label'),
  })
  const fadeIn = reduced
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
      }

  return (
    <div className="flex flex-col gap-2.5 px-2 pt-3 pb-2 rounded-[4px] bg-gradient-to-b from-transparent to-[rgba(139,107,72,0.03)]">
      <svg
        viewBox="0 0 280 100"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto block text-ink-soft"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      >
        {/* Ground line */}
        <line x1="10" y1="86" x2="270" y2="86" />
        {/* Ground hatch — 14 short diagonals at 0.5 stroke. */}
        {Array.from({ length: 14 }, (_, i) => {
          const x = 14 + i * 18
          return (
            <line
              key={i}
              x1={x}
              y1="89"
              x2={x + 6}
              y2="95"
              stroke="hsl(var(--clay) / 0.45)"
              strokeWidth="0.5"
            />
          )
        })}
        {/* House outline (gable-roof section). */}
        <polygon points="80,86 80,42 140,18 200,42 200,86" />
        {/* Floor line. */}
        <line x1="80" y1="64" x2="200" y2="64" />
        {/* Windows — two rows of three. */}
        <rect x="92" y="48" width="14" height="10" />
        <rect x="116" y="48" width="14" height="10" />
        <rect x="150" y="48" width="14" height="10" />
        <rect x="174" y="48" width="14" height="10" />
        <rect x="92" y="70" width="14" height="10" />
        <rect x="174" y="70" width="14" height="10" />
        {/* Door + interior fold line. */}
        <rect x="130" y="68" width="20" height="18" />
        <line
          x1="140"
          y1="68"
          x2="140"
          y2="86"
          stroke="hsl(var(--clay) / 0.4)"
          strokeWidth="0.5"
        />

        {/* Reactive: wall-height bracket on the right. Fades in over
          * 240 ms when the wandhoehe fact establishes. */}
        {wallHeight !== null && (
          <m.g {...fadeIn} stroke="hsl(var(--clay))" strokeWidth="0.8">
            <line x1="208" y1="42" x2="216" y2="42" />
            <line x1="208" y1="86" x2="216" y2="86" />
            <line
              x1="212"
              y1="42"
              x2="212"
              y2="86"
              strokeDasharray="2 2"
            />
            <text
              x="220"
              y="68"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fontSize="6"
              fill="hsl(var(--clay))"
              stroke="none"
              letterSpacing="0.5"
            >
              {wallHeight}m
            </text>
          </m.g>
        )}

        {/* Reactive: GK badge upper-left. */}
        {gk !== null && (
          <m.g {...fadeIn}>
            <rect
              x="6"
              y="6"
              width="28"
              height="13"
              fill="hsl(var(--clay) / 0.10)"
              stroke="hsl(var(--clay))"
              strokeWidth="0.5"
            />
            <text
              x="20"
              y="15.5"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fontSize="6.5"
              fill="hsl(var(--clay))"
              stroke="none"
              textAnchor="middle"
              letterSpacing="0.4"
            >
              GK {gk}
            </text>
          </m.g>
        )}

        {/* N-arrow upper-right (always). */}
        <g
          transform="translate(252,12)"
          stroke="hsl(var(--clay))"
          strokeWidth="0.8"
        >
          <line x1="0" y1="0" x2="0" y2="14" />
          <polygon points="-3,3 0,0 3,3" fill="hsl(var(--clay))" stroke="none" />
          <text
            x="-3"
            y="22"
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fontSize="6"
            fill="hsl(var(--clay))"
            stroke="none"
          >
            N
          </text>
        </g>
      </svg>

      {/* Title row — intent label left, "Schnitt AA" hint right. */}
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="font-serif italic text-[10px] text-clay/85 leading-none truncate">
          {intentLabel}
        </span>
        <span className="font-mono text-[8.5px] tracking-[0.14em] uppercase text-ink-faint leading-none">
          M 1:100
        </span>
      </div>
    </div>
  )
}
