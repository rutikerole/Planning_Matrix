import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import type { AreaState, ProjectState } from '@/types/projectState'

interface Props {
  state: Partial<ProjectState>
}

/**
 * Phase 3.2 #40 — BEREICHE rendered as a small architectural plan-
 * section diagram. Three parallel horizontal bands (A / B / C) stacked
 * top to bottom. Each band's surface treatment encodes its state:
 *
 *   ACTIVE  → dense drafting-blue hatching at 45°, every 4px (the
 *             specialist is currently working this band)
 *   PENDING → sparse clay hatching every 8px (waiting for input)
 *   VOID    → empty band with dashed outline + clay/40 strikethrough
 *             (cannot be determined — e.g. no plot, no Bebauungsplan)
 *
 * Band labels A / B / C in font-serif italic clay-deep on the left;
 * state word on the right in Inter 10 uppercase clay/clay-strikethrough.
 *
 * The diagram reads as a section-cut through three jurisdictional layers
 * — each band is a strip of the project being inspected.
 */
export function BereichePlanSection({ state }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const areas = state.areas ?? {
    A: { state: 'PENDING' as AreaState },
    B: { state: 'PENDING' as AreaState },
    C: { state: 'PENDING' as AreaState },
  }

  const bands: Array<{ key: 'A' | 'B' | 'C'; state: AreaState; reason?: string }> = (
    ['A', 'B', 'C'] as const
  ).map((key) => ({
    key,
    state: areas[key]?.state ?? 'PENDING',
    reason: areas[key]?.reason,
  }))

  // Phase 3.4 #57 — celebrate when a band flips to ACTIVE. Track the
  // previous state for each band; if the new state is ACTIVE and the
  // previous wasn't, fire a 1.6s celebration (hatch redraw + checkmark
  // + brightness pulse).
  const prevStatesRef = useRef<Partial<Record<'A' | 'B' | 'C', AreaState>>>({})
  const [celebrating, setCelebrating] = useState<Record<'A' | 'B' | 'C', boolean>>({
    A: false,
    B: false,
    C: false,
  })

  useEffect(() => {
    const next: Partial<Record<'A' | 'B' | 'C', AreaState>> = {}
    let triggered: 'A' | 'B' | 'C' | null = null
    bands.forEach(({ key, state: bandState }) => {
      next[key] = bandState
      const prev = prevStatesRef.current[key]
      if (prev !== undefined && prev !== 'ACTIVE' && bandState === 'ACTIVE') {
        triggered = key
      }
    })
    prevStatesRef.current = next
    if (triggered && !reduced) {
      setCelebrating((c) => ({ ...c, [triggered as 'A' | 'B' | 'C']: true }))
      const t1 = setTimeout(() => {
        setCelebrating((c) => ({ ...c, [triggered as 'A' | 'B' | 'C']: false }))
      }, 1800)
      return () => clearTimeout(t1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas.A?.state, areas.B?.state, areas.C?.state, reduced])

  return (
    <div className="flex flex-col gap-3 border-t border-border/40 pt-6">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-foreground/60 text-[10px] tracking-[0.18em]">
          {t('chat.rail.areas')}
        </p>
        <span className="font-serif italic text-[9px] text-clay/65 tabular-figures">
          Schnitt&nbsp;A·A
        </span>
      </div>

      {/* The plan-section drawing */}
      <svg
        viewBox="0 0 240 96"
        className="w-full h-auto text-drafting-blue"
        aria-hidden="true"
      >
        <defs>
          {/* Dense hatching for ACTIVE bands */}
          <pattern
            id="pm-hatch-active"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="4"
              stroke="currentColor"
              strokeWidth="0.6"
              strokeOpacity="0.55"
            />
          </pattern>
          {/* Sparse hatching for PENDING bands — clay tone via inline */}
          <pattern
            id="pm-hatch-pending"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="hsl(25 30% 38% / 0.35)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* Outer frame — 1px ink/15 */}
        <rect
          x="0.5"
          y="0.5"
          width="239"
          height="95"
          fill="none"
          stroke="hsl(220 16% 11% / 0.18)"
          strokeWidth="1"
        />

        {bands.map((band, idx) => {
          const top = idx * 32
          const fill =
            band.state === 'ACTIVE'
              ? 'url(#pm-hatch-active)'
              : band.state === 'PENDING'
                ? 'url(#pm-hatch-pending)'
                : 'transparent'
          const isCelebrating = celebrating[band.key]

          return (
            <g key={band.key} className={isCelebrating ? 'pm-band-celebrate' : ''}>
              {/* Band rectangle */}
              <rect
                x="0"
                y={top}
                width="240"
                height="32"
                fill={fill}
                stroke="none"
              />
              {/* Phase 3.4 #57 — celebration: hand-drawn checkmark draws
               * itself in on the band's right edge (over 600 ms via
               * stroke-dashoffset). Ripple expands outward. Brightness
               * pulse handled at the parent <g class="pm-band-celebrate">. */}
              {isCelebrating && (
                <g>
                  <path
                    className="pm-band-checkmark"
                    d={`M 220 ${top + 16} L 226 ${top + 22} L 234 ${top + 10}`}
                    fill="none"
                    stroke="hsl(212 38% 32%)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.9"
                  />
                  <rect
                    className="pm-band-ripple"
                    x="2"
                    y={top + 2}
                    width="236"
                    height="28"
                    fill="none"
                    stroke="hsl(220 16% 11%)"
                    strokeWidth="0.6"
                    strokeOpacity="0"
                  />
                </g>
              )}
              {/* VOID: dashed outline overlay + diagonal strikethrough */}
              {band.state === 'VOID' && (
                <>
                  <rect
                    x="2"
                    y={top + 2}
                    width="236"
                    height="28"
                    fill="none"
                    stroke="hsl(220 16% 11% / 0.28)"
                    strokeWidth="0.7"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="6"
                    y1={top + 28}
                    x2="234"
                    y2={top + 4}
                    stroke="hsl(220 16% 11% / 0.22)"
                    strokeWidth="0.7"
                  />
                </>
              )}
              {/* Band divider rule (between bands) */}
              {idx < 2 && (
                <line
                  x1="0"
                  y1={top + 32}
                  x2="240"
                  y2={top + 32}
                  stroke="hsl(220 16% 11% / 0.18)"
                  strokeWidth="0.7"
                />
              )}
              {/* Letter on the left, in serif italic on a paper notch */}
              <rect
                x="6"
                y={top + 8}
                width="22"
                height="16"
                fill="hsl(38 30% 97%)"
                stroke="hsl(220 16% 11% / 0.18)"
                strokeWidth="0.7"
              />
              <text
                x="17"
                y={top + 20}
                fontFamily="Georgia, 'Instrument Serif', serif"
                fontStyle="italic"
                fontSize="13"
                textAnchor="middle"
                fill="hsl(25 32% 28%)"
                stroke="none"
              >
                {band.key}
              </text>
            </g>
          )
        })}
        <style>{`
          @keyframes pmBandPulse {
            0%   { opacity: 1; }
            30%  { opacity: 0.55; }
            100% { opacity: 1; }
          }
          @keyframes pmCheckDraw {
            0%   { stroke-dashoffset: 30; opacity: 0; }
            20%  { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes pmRipple {
            0%   { stroke-opacity: 0; transform: scale(1); }
            20%  { stroke-opacity: 0.4; }
            100% { stroke-opacity: 0; transform: scale(1.04); }
          }
          .pm-band-celebrate { animation: pmBandPulse 1.2s ease-in-out; }
          .pm-band-checkmark {
            stroke-dasharray: 30;
            stroke-dashoffset: 30;
            animation: pmCheckDraw 600ms ease-out forwards;
          }
          .pm-band-ripple {
            transform-origin: 120px center;
            animation: pmRipple 800ms ease-out;
          }
          @media (prefers-reduced-motion: reduce) {
            .pm-band-celebrate,
            .pm-band-checkmark,
            .pm-band-ripple { animation: none; }
            .pm-band-checkmark { stroke-dashoffset: 0; }
          }
        `}</style>
      </svg>

      {/* Band legend — the same three rows, but as text references below */}
      <ul className="flex flex-col gap-1.5">
        {bands.map((band) => (
          <li
            key={band.key}
            className="flex items-baseline gap-3 text-[12px]"
            title={band.reason ?? ''}
          >
            <span className="font-serif italic text-[11px] text-clay-deep tabular-figures w-3 shrink-0">
              {band.key}
            </span>
            <span className="text-ink/85 flex-1 truncate">
              {t(`chat.areas.${band.key}`)}
            </span>
            <span
              className={
                band.state === 'VOID'
                  ? 'text-[10px] uppercase tracking-[0.20em] text-ink/30 line-through'
                  : band.state === 'ACTIVE'
                    ? 'text-[10px] uppercase tracking-[0.20em] text-clay'
                    : 'text-[10px] uppercase tracking-[0.20em] text-clay/60'
              }
            >
              {t(`chat.areas.state.${band.state.toLowerCase()}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
