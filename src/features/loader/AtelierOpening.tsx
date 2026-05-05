import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion, type Transition } from 'framer-motion'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { extractStreetName, extractCity } from '@/lib/addressParse'
import { INTENT_LABELS, type Intent } from '@/features/wizard/lib/selectTemplate'
import type { TemplateId } from '@/types/projectState'
import {
  SEAT_ORDER,
  useAtelierSequence,
  type CaptionKey,
  type SeatId,
} from './hooks/useAtelierSequence'

// Phase 8.7.2 — Atelier Opening transition.
//
// Replaces the prior LoaderScreen drafting-board cinema with a
// roundtable assembling animation: 7 specialist seats around an
// oval table; 5-second cascade as each takes their seat; the
// MODERATOR is pre-seated at t=0; cross-fade hand-off into the
// chat workspace once the priming API call resolves.
//
// All timing math lives in useAtelierSequence (pure hook). This
// component is presentational: SVG geometry + caption + progress
// hairline + cross-fade nav. Reduced-motion path collapses to a
// 1.5s static hold.

interface Props {
  /** Provided once the project row has been INSERTed. Null while inserting. */
  projectId: string | null
  /** True once the chat-turn priming call returns successfully. */
  primed: boolean
  /** True if INSERT or priming failed fatally. */
  failed: boolean
  /** Cancel handler — called only by FailState (no in-page chrome on
   *  the happy path; the brief calls for an "unbreakable 5-second
   *  moment"). */
  onCancel: () => void | Promise<void>
  /** Drives the FailState's project-type sub-line if INSERT fails. */
  templateId?: TemplateId
  /** Drives the {{projectType}} sub-line. */
  intent?: Intent | null
  /** Drives the {{address}} sub-line. */
  plotAddress?: string | null
}

// Geometry — see docs/PHASE_8_7_2_FINDINGS.md §2 for the math.
// SVG viewBox is 660×340; the parent constrains width and the
// preserveAspectRatio="xMidYMid meet" keeps proportion on mobile.
const VB_W = 660
const VB_H = 340
const CX = 330
const CY = 170
const RX = 220
const RY = 90
const SEAT_R = 22

// Pre-computed seat positions (angle in degrees, 0° = top, clockwise).
// Symmetric across the vertical axis so the bottom row balances under
// the top apex.
const SEAT_GEOM: Record<
  SeatId,
  { angle: number; x: number; y: number; letter: string; labelPlacement: LabelPlacement }
> = (() => {
  // Phase 8.7.2 hotfix — angles locked per the visual repair brief.
  // Previous values 165° / 195° gave only 30° of arc between
  // SONSTIGE and VERFAHREN at the bottom of the ellipse, where y is
  // identical for both — seats overlapped and labels collided into
  // "PROCEDURE OTHER REGULATIONS." 155° / 205° = 50° arc puts edges
  // ~141 px apart at this geometry, breathing room for labels.
  const angles: Record<SeatId, number> = {
    moderator: 0,
    planungsrecht: 51,
    bauordnungsrecht: 129,
    sonstige: 155,
    verfahren: 205,
    beteiligte: 231,
    synthese: 309,
  }
  const letters: Record<SeatId, string> = {
    moderator: 'M',
    planungsrecht: 'P',
    bauordnungsrecht: 'B',
    sonstige: 'S',
    verfahren: 'V',
    beteiligte: 'B',
    synthese: 'S',
  }
  const placements: Record<SeatId, LabelPlacement> = {
    moderator: 'top',
    planungsrecht: 'right',
    bauordnungsrecht: 'right',
    sonstige: 'bottom',
    verfahren: 'bottom',
    beteiligte: 'left',
    synthese: 'left',
  }
  const out = {} as Record<
    SeatId,
    { angle: number; x: number; y: number; letter: string; labelPlacement: LabelPlacement }
  >
  for (const id of SEAT_ORDER) {
    const angle = angles[id]
    const rad = (angle * Math.PI) / 180
    out[id] = {
      angle,
      x: CX + RX * Math.sin(rad),
      y: CY - RY * Math.cos(rad),
      letter: letters[id],
      labelPlacement: placements[id],
    }
  }
  return out
})()

type LabelPlacement = 'top' | 'right' | 'bottom' | 'left'

function cityFromAddress(addr: string | null | undefined): string {
  return extractCity(addr ?? '') ?? 'München'
}

function shortAddressLine(plotAddress: string | null | undefined): string | null {
  if (!plotAddress) return null
  const street = extractStreetName(plotAddress)
  const city = cityFromAddress(plotAddress)
  if (street && city) return `${street}, ${city}`
  return plotAddress
}

export function AtelierOpening({
  projectId,
  primed,
  failed,
  onCancel,
  templateId = 'T-01',
  intent,
  plotAddress,
}: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const reduced = useReducedMotion() ?? false
  const [phase, setPhase] = useState<'animating' | 'fading' | 'done'>('animating')

  // True INSERT failure (no projectId) — render FailState. When the
  // INSERT succeeded but priming errored, we still hand off; the chat
  // workspace renders its own first-turn loading state.
  const isInsertFail = failed && !projectId

  const { litSeats, caption, progress, allSeated } = useAtelierSequence({
    primed,
    failed: isInsertFail,
    reduced,
    onReady: () => {
      if (!projectId) return
      setPhase('fading')
    },
  })

  // Priming-failed-but-have-projectId: hand off so the chat workspace
  // can show its own error. The hook only fires onReady when primed is
  // true, so we add a parallel effect for the "primed-failed but route
  // anyway" case once the visual floor is reached.
  useEffect(() => {
    if (!projectId) return
    if (!failed) return
    if (phase !== 'animating') return
    // Wait for the visual floor (allSeated) before hand-off so the
    // user always sees a complete table before any error chrome.
    if (!allSeated) return
    const t = window.setTimeout(() => setPhase('fading'), 200)
    return () => window.clearTimeout(t)
  }, [failed, projectId, allSeated, phase])

  // Cross-fade nav. 300ms opacity + 4px y-shift, then navigate.
  useEffect(() => {
    if (phase !== 'fading') return
    if (!projectId) return
    const fadeMs = reduced ? 0 : 300
    const t = window.setTimeout(() => {
      setPhase('done')
      navigate(`/projects/${projectId}`, { replace: true })
    }, fadeMs)
    return () => window.clearTimeout(t)
  }, [phase, projectId, reduced, navigate])

  // Document title + body overflow lock — the brief insists no scroll.
  useEffect(() => {
    const prevTitle = document.title
    document.title = `${t('wizard.atelier.headline')} · Planning Matrix`
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.title = prevTitle
      document.body.style.overflow = prevOverflow
    }
  }, [t])

  // Sub-line composition — address · § 34 BauGB · project type.
  // Skipped silently if the address is missing (no-plot path).
  const lang = i18n.language?.startsWith('en') ? 'en' : 'de'
  const projectType = intent
    ? INTENT_LABELS[intent][lang]
    : INTENT_LABELS.sonstige[lang]
  const addressLine = shortAddressLine(plotAddress)
  const planningLaw = '§ 34 BauGB'
  const subLine = addressLine
    ? `${addressLine} · ${planningLaw} · ${projectType}`
    : `${planningLaw} · ${projectType}`

  if (isInsertFail) {
    return <FailState templateId={templateId} onBack={onCancel} />
  }

  const captionLine = t(`wizard.atelier.caption.${caption}`)

  return (
    <m.div
      initial={reduced ? false : { opacity: 0 }}
      animate={
        phase === 'fading'
          ? { opacity: 0, y: -4 }
          : { opacity: 1, y: 0 }
      }
      transition={{
        duration: reduced ? 0 : phase === 'fading' ? 0.3 : 0.32,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative isolate flex h-dvh w-full flex-col items-center overflow-hidden bg-pm-paper px-6 pb-[8vh] pt-[14vh]"
      role="status"
      aria-live="polite"
      aria-busy={phase === 'animating'}
    >
      <BlueprintSubstrate lensRadius={220} breathing={false} driftPx={0} />

      {/* Top zone — eyebrow + headline + sub-line.
          Phase 8.7.2 hotfix — pulled the page top padding down to
          14vh and the gap to the SVG to clamp(80, 12vh, 120)px so
          the table center sits at ~58 % of viewport (was ~75 %). */}
      <div className="relative z-10 flex w-full max-w-[680px] flex-col items-center gap-3 text-center">
        <m.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.05 }}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay"
        >
          {t('wizard.atelier.eyebrow')}
        </m.p>
        <m.h1
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-[clamp(1.6rem,4vw,2.75rem)] italic leading-[1.1] -tracking-[0.01em] text-pm-ink"
        >
          {t('wizard.atelier.headline')}
        </m.h1>
        <m.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.18 }}
          className="max-w-[36rem] font-sans text-[13px] leading-relaxed text-pm-ink-mid"
        >
          {subLine}
        </m.p>
      </div>

      {/* Middle zone — SVG roundtable */}
      <div
        className="relative z-10 flex w-full max-w-[640px] items-center justify-center"
        style={{ marginTop: 'clamp(60px, 11vh, 120px)' }}
      >
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full"
          role="img"
          aria-label={t('wizard.atelier.headline')}
        >
          {/* Outer dashed ellipse — table edge.
              Phase 8.7.2 hotfix: Tailwind alpha modifiers don't
              attach to hex CSS variables (pm-ink resolves to a
              hex literal, not three HSL channels), so the
              `/<alpha>` form silently dropped. Hardcoded the HSL
              with explicit alpha here to bypass the Tailwind
              color pipeline entirely. */}
          <ellipse
            cx={CX}
            cy={CY}
            rx={RX}
            ry={RY}
            fill="none"
            stroke="hsl(220 16% 11% / 0.15)"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
          {/* Inner faded ellipse — table fill. A whisper of warm
              clay tint (4 % alpha) over the paper substrate; the
              grid pattern stays visible through it. */}
          <ellipse
            cx={CX}
            cy={CY}
            rx={RX - 18}
            ry={RY - 12}
            fill="hsl(25 30% 38% / 0.04)"
            stroke="hsl(220 16% 11% / 0.08)"
            strokeWidth={0.5}
          />

          {/* Center pulsing ring (paused on reduced-motion).
              Phase 8.7.2 hotfix scales the ring to match the
              larger 6 px center dot — was r 14 → 28, now r 18 → 36. */}
          {!reduced ? (
            <m.circle
              cx={CX}
              cy={CY}
              r={18}
              fill="none"
              stroke="hsl(25 30% 38%)"
              strokeWidth={0.5}
              initial={{ r: 18, opacity: 0.6 }}
              animate={{ r: 36, opacity: 0 }}
              transition={{ duration: 2.4, ease: 'easeOut', repeat: Infinity }}
            />
          ) : null}
          {/* Center dot — always visible. Phase 8.7.2 hotfix
              bumped r 3 → 6 (was buried under the broken black
              fill; now visible against the warm whisper). */}
          <circle cx={CX} cy={CY} r={6} fill="hsl(25 30% 38%)" />

          {/* Seven seats */}
          {SEAT_ORDER.map((id) => {
            const geom = SEAT_GEOM[id]
            const lit = litSeats.has(id)
            return (
              <Seat
                key={id}
                id={id}
                x={geom.x}
                y={geom.y}
                letter={geom.letter}
                placement={geom.labelPlacement}
                lit={lit}
                label={t(`wizard.atelier.specialist.${id}`)}
                reduced={reduced}
              />
            )
          })}
        </svg>
      </div>

      {/* Bottom zone — caption + progress hairline.
          mt-auto pushes this to the bottom of the lane now that
          the outer flex no longer uses justify-between (Phase 8.7.2
          hotfix vertical-rhythm rewrite). */}
      <div className="relative z-10 mt-auto flex w-full max-w-[680px] flex-col items-center gap-3">
        <div className="relative h-5 w-full text-center">
          <AnimatePresence mode="wait" initial={false}>
            <m.p
              key={caption}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              className="absolute inset-x-0 top-0 font-serif text-[12px] italic leading-snug text-pm-ink/55"
            >
              {captionLine}
            </m.p>
          </AnimatePresence>
        </div>
        <div
          aria-hidden="true"
          className="relative h-px w-[200px] overflow-hidden bg-pm-ink/12 lg:w-[240px]"
        >
          <m.span
            className="absolute inset-y-0 left-0 block bg-pm-clay"
            initial={false}
            animate={{ width: `${Math.min(100, progress * 100)}%` }}
            transition={{ duration: 0.18, ease: 'linear' }}
          />
        </div>
      </div>
    </m.div>
  )
}

interface SeatProps {
  id: SeatId
  x: number
  y: number
  letter: string
  placement: LabelPlacement
  lit: boolean
  label: string
  reduced: boolean
}

function Seat({ x, y, letter, placement, lit, label, reduced }: SeatProps) {
  // Phase 8.7.2 hotfix — side label dx bumped from SEAT_R+8 (30 px,
  // labels hugging the seat edge) to SEAT_R+18 (40 px, 18 px outside
  // the seat edge). SYNTHESIS used to crash the ellipse at the old
  // value; comfortable now.
  const labelOffset = useMemo(() => {
    switch (placement) {
      case 'top':
        return { dx: 0, dy: -SEAT_R - 14, anchor: 'middle' as const }
      case 'right':
        return { dx: SEAT_R + 18, dy: 4, anchor: 'start' as const }
      case 'bottom':
        return { dx: 0, dy: SEAT_R + 18, anchor: 'middle' as const }
      case 'left':
        return { dx: -(SEAT_R + 18), dy: 4, anchor: 'end' as const }
    }
  }, [placement])

  const transition: Transition = reduced
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }

  return (
    <g>
      {/* Seat circle. Stroke fades out as fill fades in. */}
      <m.circle
        cx={x}
        cy={y}
        r={SEAT_R}
        initial={false}
        animate={{
          fill: lit ? 'hsl(25 30% 38%)' : 'rgba(0,0,0,0)',
          stroke: lit ? 'hsl(25 30% 38%)' : 'rgba(26,22,18,0.4)',
          strokeWidth: 0.6,
        }}
        transition={transition}
      />
      {/* Letter — paper white when lit, ink at 0.5 alpha when empty. */}
      <m.text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        initial={false}
        animate={{
          fill: lit ? 'hsl(40 30% 92%)' : 'rgba(26,22,18,0.5)',
        }}
        transition={transition}
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 0.3,
        }}
      >
        {letter}
      </m.text>
      {/* Label — outside the seat, oriented per placement quadrant. */}
      <m.text
        x={x + labelOffset.dx}
        y={y + labelOffset.dy}
        textAnchor={labelOffset.anchor}
        dominantBaseline="central"
        initial={false}
        animate={{
          fill: lit ? 'hsl(220 16% 11%)' : 'rgba(26,22,18,0.5)',
          fontWeight: lit ? 500 : 400,
        }}
        transition={transition}
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10.5,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </m.text>
    </g>
  )
}

function FailState({
  templateId: _templateId,
  onBack,
}: {
  templateId: TemplateId
  onBack: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion() ?? false

  return (
    <m.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      className="relative isolate flex min-h-dvh flex-col items-center justify-center bg-pm-paper px-6"
      role="alert"
    >
      <BlueprintSubstrate lensRadius={220} breathing={false} driftPx={0} />

      <div className="relative z-10 flex w-full max-w-[34rem] flex-col items-center gap-6 text-center">
        <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight text-pm-ink">
          {t('wizard.atelier.fail.h')}
        </h1>
        <p className="font-sans text-[15px] italic leading-relaxed text-pm-ink-mid">
          {t('wizard.atelier.fail.sub')}
        </p>
        <button
          type="button"
          onClick={() => void onBack()}
          className="inline-flex items-center justify-center border border-pm-hair px-5 py-2.5 font-sans text-[14px] text-pm-ink transition-colors hover:bg-pm-paper-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
        >
          {t('wizard.atelier.fail.back')}
        </button>
      </div>
    </m.div>
  )
}

// Keep an unused-import-style export so down-stream tools that may
// have referenced these don't accidentally drop the SeatId type.
export type { CaptionKey, SeatId }
