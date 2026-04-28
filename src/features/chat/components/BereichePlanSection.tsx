import { useTranslation } from 'react-i18next'
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

          return (
            <g key={band.key}>
              {/* Band rectangle */}
              <rect
                x="0"
                y={top}
                width="240"
                height="32"
                fill={fill}
                stroke="none"
              />
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
                  ? 'text-[10px] uppercase tracking-[0.16em] text-ink/30 line-through'
                  : band.state === 'ACTIVE'
                    ? 'text-[10px] uppercase tracking-[0.16em] text-clay'
                    : 'text-[10px] uppercase tracking-[0.16em] text-clay/60'
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
