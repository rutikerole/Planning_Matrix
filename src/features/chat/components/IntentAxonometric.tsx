import type React from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { INTENT_TO_I18N } from '@/features/wizard/lib/selectTemplate'
import type { Fact, ProjectState } from '@/types/projectState'

interface Props {
  intent: string
  /**
   * Phase 7 Move 9 — when supplied, the EFH variant layers reactive
   * annotations on top of the existing axonometric: wall-height
   * dimensional bracket, vollgeschosse mid-storey line, and a GK
   * badge in the upper-left corner. Each annotation fades in over
   * 240 ms when the corresponding fact establishes; absent facts
   * render no annotation. Other intent variants are unchanged.
   */
  state?: Partial<ProjectState>
  className?: string
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

/**
 * Phase 3.2 #40 — axonometric drawing of the project's active intent
 * at the head of the right rail. One of six glyphs (Einfamilienhaus,
 * Mehrfamilienhaus, Sanierung, Umnutzung, Abbruch, Sonstiges) drawn
 * loosely in a 30° axonometric projection at 1px stroke, drafting-
 * blue 55% opacity. Below: scale bar reading "M 1:100" in pencilled
 * Instrument Serif italic — fixes the drawing as architectural, not
 * decorative.
 *
 * Intent unknown → falls through to the Sonstiges placeholder.
 */
export function IntentAxonometric({ intent, state, className }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const Drawing = INTENT_REGISTRY[intent] ?? SonstigesDrawing

  // Phase 7 Move 9 — reactive annotations for the EFH variant. Fact
  // keys are tried in a small alias list because the model has used
  // both German and English forms across phases.
  const facts = state?.facts
  const wallHeight = pickFact<number>(facts, [
    'wandhoehe',
    'wall_height_m',
    'wandhoehe_m',
  ])
  const stories = pickFact<number>(facts, ['vollgeschosse'])
  const gk = pickFact<number>(facts, ['gebaeudeklasse'])
  const isEfh = intent === 'neubau_einfamilienhaus'
  const fadeIn = reduced
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
      }

  return (
    <figure className={`flex flex-col gap-2 ${className ?? ''}`}>
      <svg
        viewBox="0 0 240 160"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-drafting-blue/55 w-full h-auto"
      >
        <Drawing />
        {isEfh && (
          <g className="text-clay">
            {/* Wall-height bracket on the right side of the side
              * gable. Dashed mid-line + tick marks + JetBrains Mono
              * value. */}
            {wallHeight !== null && (
              <m.g {...fadeIn}>
                <line x1="186" y1="60" x2="194" y2="60" stroke="currentColor" strokeWidth="0.8" />
                <line x1="186" y1="130" x2="194" y2="130" stroke="currentColor" strokeWidth="0.8" />
                <line
                  x1="190"
                  y1="60"
                  x2="190"
                  y2="130"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                <text
                  x="198"
                  y="98"
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                  fontSize="6"
                  fill="currentColor"
                  stroke="none"
                  letterSpacing="0.5"
                >
                  {wallHeight}m
                </text>
              </m.g>
            )}
            {/* Mid-storey line across the front face when ≥ 2 stories. */}
            {stories !== null && stories >= 2 && (
              <m.line
                x1="70"
                y1="105"
                x2="150"
                y2="105"
                stroke="currentColor"
                strokeWidth="0.6"
                {...fadeIn}
              />
            )}
            {/* GK badge in the upper-left corner. */}
            {gk !== null && (
              <m.g {...fadeIn}>
                <rect
                  x="10"
                  y="8"
                  width="34"
                  height="14"
                  fill="hsl(var(--clay) / 0.10)"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
                <text
                  x="27"
                  y="18"
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                  fontSize="7"
                  fill="currentColor"
                  stroke="none"
                  textAnchor="middle"
                  letterSpacing="0.4"
                >
                  GK {gk}
                </text>
              </m.g>
            )}
            {/* North arrow — always visible for the EFH variant. */}
            <g transform="translate(220,18)">
              <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeWidth="0.8" />
              <polygon points="-3,3 0,0 3,3" fill="currentColor" stroke="none" />
              <text
                x="-3"
                y="22"
                fontFamily="JetBrains Mono, ui-monospace, monospace"
                fontSize="6"
                fill="currentColor"
                stroke="none"
              >
                N
              </text>
            </g>
          </g>
        )}
      </svg>
      <figcaption className="flex items-center justify-between gap-3 px-1">
        <span className="font-serif italic text-[10px] text-clay/85 leading-none">
          {(() => {
            const slug =
              (INTENT_TO_I18N as Record<string, string>)[intent] ?? 'sonstige'
            return t(`wizard.q1.options.${slug}.label`, {
              defaultValue: t('wizard.q1.options.sonstige.label'),
            })
          })()}
        </span>
        <ScaleBar />
      </figcaption>
    </figure>
  )
}

/** Scale bar — three 12px segments + tick marks + "M 1:100" label. */
function ScaleBar() {
  return (
    <span
      aria-label="Maßstab 1 zu 100"
      className="inline-flex items-center gap-2 text-clay/70"
    >
      <svg
        width="58"
        height="10"
        viewBox="0 0 58 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        aria-hidden="true"
        className="opacity-85"
      >
        {/* Baseline */}
        <line x1="2" y1="6" x2="50" y2="6" />
        {/* Tick marks at 0 / 12 / 24 / 36 / 48 */}
        <line x1="2" y1="3" x2="2" y2="8" />
        <line x1="14" y1="4.5" x2="14" y2="7.5" />
        <line x1="26" y1="3" x2="26" y2="8" />
        <line x1="38" y1="4.5" x2="38" y2="7.5" />
        <line x1="50" y1="3" x2="50" y2="8" />
        {/* Filled "0–1m" first segment marker */}
        <rect x="2" y="5" width="12" height="2" fill="currentColor" stroke="none" fillOpacity="0.65" />
      </svg>
      <span className="font-serif italic text-[10px] tabular-figures">M&nbsp;1:100</span>
    </span>
  )
}

/* ── Six axonometric drawings ───────────────────────────────────── */

/** Single-family house — rectangular box with gable roof. */
function EinfamilienhausDrawing() {
  return (
    <g>
      {/* Ground rule */}
      <line x1="20" y1="138" x2="220" y2="138" strokeOpacity="0.25" />
      {/* Walls — front face */}
      <path d="M 70 130 L 150 130 L 150 80 L 70 80 Z" />
      {/* Walls — right side (axonometric) */}
      <path d="M 150 130 L 180 110 L 180 60 L 150 80 Z" />
      {/* Roof — gable: front triangle + sloped right plane */}
      <path d="M 70 80 L 110 55 L 150 80" strokeOpacity="0.85" />
      <path d="M 150 80 L 110 55 L 140 35 L 180 60 Z" strokeOpacity="0.85" />
      <path d="M 110 55 L 140 35" strokeOpacity="0.85" />
      {/* Door */}
      <path d="M 100 130 L 100 110 L 116 110 L 116 130" strokeOpacity="0.55" />
      {/* Two windows on the front face */}
      <rect x="80" y="100" width="12" height="14" strokeOpacity="0.55" />
      <rect x="124" y="100" width="14" height="14" strokeOpacity="0.55" />
      {/* Side window */}
      <path d="M 158 95 L 168 89 L 168 105 L 158 111 Z" strokeOpacity="0.5" />
      {/* Chimney on right slope */}
      <path d="M 158 50 L 158 38 L 165 38 L 165 53" strokeOpacity="0.6" />
    </g>
  )
}

/** Multifamily house — three floors, taller, flat-ish roof, more windows. */
function MehrfamilienhausDrawing() {
  return (
    <g>
      <line x1="20" y1="138" x2="220" y2="138" strokeOpacity="0.25" />
      {/* Front face */}
      <path d="M 50 130 L 170 130 L 170 40 L 50 40 Z" />
      {/* Right side */}
      <path d="M 170 130 L 200 112 L 200 22 L 170 40 Z" />
      {/* Top — flat roof */}
      <path d="M 50 40 L 170 40 L 200 22 L 80 22 Z" strokeOpacity="0.85" />
      {/* Floor rules — three floors */}
      <line x1="50" y1="70" x2="170" y2="70" strokeOpacity="0.35" />
      <line x1="170" y1="70" x2="200" y2="52" strokeOpacity="0.35" />
      <line x1="50" y1="100" x2="170" y2="100" strokeOpacity="0.35" />
      <line x1="170" y1="100" x2="200" y2="82" strokeOpacity="0.35" />
      {/* Windows — 4 per floor on front, simplified */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={62 + col * 28}
            y={48 + row * 30}
            width="14"
            height="14"
            strokeOpacity="0.55"
          />
        )),
      )}
      {/* Entrance */}
      <path d="M 100 130 L 100 112 L 120 112 L 120 130" strokeOpacity="0.6" />
      {/* Side windows hint */}
      <path d="M 178 60 L 192 51 L 192 68 L 178 77 Z" strokeOpacity="0.4" />
      <path d="M 178 90 L 192 81 L 192 98 L 178 107 Z" strokeOpacity="0.4" />
    </g>
  )
}

/** Renovation — existing house wrapped in scaffold bars + a few dashed walls. */
function SanierungDrawing() {
  return (
    <g>
      <line x1="20" y1="138" x2="220" y2="138" strokeOpacity="0.25" />
      {/* House mass — same as Einfamilienhaus but reduced */}
      <path d="M 70 130 L 150 130 L 150 80 L 70 80 Z" />
      <path d="M 150 130 L 180 110 L 180 60 L 150 80 Z" />
      <path d="M 70 80 L 110 55 L 150 80" strokeOpacity="0.85" />
      <path d="M 150 80 L 110 55 L 140 35 L 180 60 Z" strokeOpacity="0.85" />
      <path d="M 110 55 L 140 35" strokeOpacity="0.85" />
      {/* Scaffolding — vertical posts and horizontal walks */}
      <g strokeOpacity="0.7">
        <line x1="62" y1="130" x2="62" y2="40" />
        <line x1="158" y1="130" x2="158" y2="40" />
        <line x1="186" y1="110" x2="186" y2="20" />
        {/* Walks */}
        <line x1="60" y1="85" x2="160" y2="85" />
        <line x1="158" y1="85" x2="186" y2="65" />
        <line x1="60" y1="110" x2="160" y2="110" />
        <line x1="158" y1="110" x2="186" y2="90" />
        {/* Diagonal braces */}
        <line x1="62" y1="85" x2="80" y2="110" strokeOpacity="0.4" />
        <line x1="140" y1="85" x2="158" y2="110" strokeOpacity="0.4" />
      </g>
      {/* Dashed renovation overlay on a window */}
      <rect
        x="80"
        y="100"
        width="12"
        height="14"
        strokeOpacity="0.6"
        strokeDasharray="2 2"
      />
      <rect x="124" y="100" width="14" height="14" strokeOpacity="0.55" />
    </g>
  )
}

/** Change-of-use — building with a swap arrow between two contrasting uses. */
function UmnutzungDrawing() {
  return (
    <g>
      <line x1="20" y1="138" x2="220" y2="138" strokeOpacity="0.25" />
      {/* Building mass — wider building */}
      <path d="M 50 130 L 170 130 L 170 50 L 50 50 Z" />
      <path d="M 170 130 L 200 112 L 200 32 L 170 50 Z" />
      <path d="M 50 50 L 170 50 L 200 32 L 80 32 Z" strokeOpacity="0.85" />
      {/* Vertical split — left half "old use", right half "new use" */}
      <line x1="110" y1="50" x2="110" y2="130" strokeOpacity="0.55" strokeDasharray="3 3" />
      {/* Left side: small windows (old residential) */}
      <rect x="62" y="62" width="12" height="14" strokeOpacity="0.55" />
      <rect x="82" y="62" width="12" height="14" strokeOpacity="0.55" />
      <rect x="62" y="92" width="12" height="14" strokeOpacity="0.55" />
      <rect x="82" y="92" width="12" height="14" strokeOpacity="0.55" />
      {/* Right side: large shop windows (new commercial) */}
      <rect x="120" y="62" width="40" height="22" strokeOpacity="0.55" />
      <rect x="120" y="94" width="40" height="22" strokeOpacity="0.55" />
      {/* Swap arrow above */}
      <path
        d="M 90 22 Q 110 10 130 22"
        strokeOpacity="0.7"
      />
      <path d="M 88 19 L 90 22 L 93 19" strokeOpacity="0.7" />
      <path d="M 132 19 L 130 22 L 127 19" strokeOpacity="0.7" />
    </g>
  )
}

/** Demolition — house with parts dashed (gone) and a pile-of-bricks hint. */
function AbbruchDrawing() {
  return (
    <g>
      <line x1="20" y1="138" x2="220" y2="138" strokeOpacity="0.25" />
      {/* Surviving partial walls — solid */}
      <path d="M 70 130 L 110 130 L 110 100 L 70 100 Z" />
      <path d="M 130 130 L 150 130 L 150 95 L 130 95 Z" />
      {/* Ghost outline of the rest of the house — dashed */}
      <path
        d="M 70 100 L 70 80 L 150 80 L 150 95"
        strokeOpacity="0.55"
        strokeDasharray="3 3"
      />
      <path
        d="M 150 80 L 180 60 L 180 110 L 150 95"
        strokeOpacity="0.45"
        strokeDasharray="3 3"
      />
      <path
        d="M 70 80 L 110 55 L 150 80"
        strokeOpacity="0.45"
        strokeDasharray="3 3"
      />
      <path
        d="M 150 80 L 110 55 L 140 35 L 180 60"
        strokeOpacity="0.4"
        strokeDasharray="3 3"
      />
      {/* Pile of bricks at the front */}
      <g strokeOpacity="0.7">
        <rect x="118" y="124" width="8" height="6" />
        <rect x="115" y="118" width="8" height="6" />
        <rect x="124" y="118" width="8" height="6" />
        <rect x="120" y="112" width="8" height="6" />
      </g>
    </g>
  )
}

/** Other — neutral block with question marks; placeholder. */
function SonstigesDrawing() {
  return (
    <g>
      <line x1="20" y1="138" x2="220" y2="138" strokeOpacity="0.25" />
      <path d="M 70 130 L 150 130 L 150 70 L 70 70 Z" strokeDasharray="3 3" />
      <path d="M 150 130 L 180 112 L 180 52 L 150 70 Z" strokeDasharray="3 3" />
      <path d="M 70 70 L 150 70 L 180 52 L 100 52 Z" strokeDasharray="3 3" />
      {/* "?" mark inside */}
      <text
        x="120"
        y="112"
        fontFamily="Georgia, 'Instrument Serif', serif"
        fontStyle="italic"
        fontSize="32"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fillOpacity="0.55"
      >
        ?
      </text>
    </g>
  )
}

const INTENT_REGISTRY: Record<string, () => React.ReactElement> = {
  neubau_einfamilienhaus: EinfamilienhausDrawing,
  neubau_mehrfamilienhaus: MehrfamilienhausDrawing,
  sanierung: SanierungDrawing,
  umnutzung: UmnutzungDrawing,
  abbruch: AbbruchDrawing,
  sonstige: SonstigesDrawing,
}
