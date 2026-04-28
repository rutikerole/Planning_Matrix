import type React from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  intent: string
  /** When true, paths draw themselves via stroke-dashoffset over 2.4s
   *  with per-path stagger. Used in the result-page cover hero on
   *  first visit per session. */
  animateDraw?: boolean
  className?: string
}

/**
 * Phase 3.5 #60 — XL variant of the intent axonometric for the result-
 * page cover hero. Same six house drawings as `IntentAxonometric`
 * (right-rail), redrawn at 480×320 with 1.4 px stroke for the larger
 * viewing distance. Per Q5: separate component, not a parametric
 * refactor of the original.
 *
 * Per-path animateDraw uses `pathLength="100"` + stroke-dashoffset
 * keyframe so each path strokes itself in over 800 ms, with a
 * per-path delay producing a 2.4 s total draw-in.
 */
export function IntentAxonometricXL({ intent, animateDraw, className }: Props) {
  const { t } = useTranslation()
  const Drawing = INTENT_REGISTRY[intent] ?? SonstigesDrawing

  return (
    <figure className={`flex flex-col gap-4 ${className ?? ''}`}>
      <svg
        viewBox="0 0 480 320"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`text-drafting-blue/65 w-full h-auto ${animateDraw ? 'pm-cover-axo' : ''}`}
      >
        <Drawing />
      </svg>
      <figcaption className="flex items-center justify-between gap-3 px-1">
        <span className="font-serif italic text-[12px] text-clay/85 leading-none">
          {t(`wizard.q1.options.${intent}`, { defaultValue: t('wizard.q1.options.sonstige') })}
        </span>
        <span
          aria-label="Maßstab 1 zu 100"
          className="inline-flex items-center gap-2 text-clay/70 pm-cover-scale"
        >
          <svg
            width="78"
            height="12"
            viewBox="0 0 78 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="3" y1="7" x2="68" y2="7" />
            <line x1="3" y1="3" x2="3" y2="10" />
            <line x1="19.25" y1="4.5" x2="19.25" y2="9.5" />
            <line x1="35.5" y1="3" x2="35.5" y2="10" />
            <line x1="51.75" y1="4.5" x2="51.75" y2="9.5" />
            <line x1="68" y1="3" x2="68" y2="10" />
            <rect x="3" y="6" width="16.25" height="2" fill="currentColor" stroke="none" fillOpacity="0.6" />
          </svg>
          <span className="font-serif italic text-[12px] tabular-figures">M&nbsp;1:100</span>
        </span>
      </figcaption>

      {/* Cover-hero per-path stroke-dashoffset choreography. Total span
       * 2.4 s (1.6 s last path delay + 0.8 s draw). Reduced-motion: no
       * keyframe assignment — paths render fully drawn from t=0. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .pm-cover-axo path,
          .pm-cover-axo line,
          .pm-cover-axo rect,
          .pm-cover-axo ellipse,
          .pm-cover-axo circle {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: pmCoverAxoDraw 0.8s ease-out forwards;
          }
          .pm-cover-axo > g > *:nth-child(1)  { animation-delay: 0.00s; }
          .pm-cover-axo > g > *:nth-child(2)  { animation-delay: 0.12s; }
          .pm-cover-axo > g > *:nth-child(3)  { animation-delay: 0.24s; }
          .pm-cover-axo > g > *:nth-child(4)  { animation-delay: 0.36s; }
          .pm-cover-axo > g > *:nth-child(5)  { animation-delay: 0.48s; }
          .pm-cover-axo > g > *:nth-child(6)  { animation-delay: 0.60s; }
          .pm-cover-axo > g > *:nth-child(7)  { animation-delay: 0.72s; }
          .pm-cover-axo > g > *:nth-child(8)  { animation-delay: 0.84s; }
          .pm-cover-axo > g > *:nth-child(9)  { animation-delay: 0.96s; }
          .pm-cover-axo > g > *:nth-child(10) { animation-delay: 1.08s; }
          .pm-cover-axo > g > *:nth-child(11) { animation-delay: 1.20s; }
          .pm-cover-axo > g > *:nth-child(12) { animation-delay: 1.32s; }
          .pm-cover-axo > g > *:nth-child(13) { animation-delay: 1.44s; }
          .pm-cover-axo > g > *:nth-child(14) { animation-delay: 1.56s; }
          .pm-cover-axo > g > *:nth-child(n+15) { animation-delay: 1.60s; }
          @keyframes pmCoverAxoDraw {
            to { stroke-dashoffset: 0; }
          }
        }
      `}</style>
    </figure>
  )
}

/* ── Six house drawings, scaled to 480×320 viewBox ───────────────── */
/* Path data is geometrically equivalent to IntentAxonometric (which
 * uses 240×160) but doubled. Each <path>/<line>/<rect> ends up as a
 * <g> child so the per-path :nth-child selector can stagger them. */

function EinfamilienhausDrawing() {
  return (
    <g pathLength={100}>
      <line x1="40" y1="276" x2="440" y2="276" strokeOpacity="0.25" pathLength={100} />
      <path d="M 140 260 L 300 260 L 300 160 L 140 160 Z" pathLength={100} />
      <path d="M 300 260 L 360 220 L 360 120 L 300 160 Z" pathLength={100} />
      <path d="M 140 160 L 220 110 L 300 160" strokeOpacity="0.85" pathLength={100} />
      <path d="M 300 160 L 220 110 L 280 70 L 360 120 Z" strokeOpacity="0.85" pathLength={100} />
      <path d="M 220 110 L 280 70" strokeOpacity="0.85" pathLength={100} />
      <path d="M 200 260 L 200 220 L 232 220 L 232 260" strokeOpacity="0.55" pathLength={100} />
      <rect x="160" y="200" width="24" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="248" y="200" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <path d="M 316 190 L 336 178 L 336 210 L 316 222 Z" strokeOpacity="0.5" pathLength={100} />
      <path d="M 316 100 L 316 76 L 330 76 L 330 106" strokeOpacity="0.6" pathLength={100} />
    </g>
  )
}

function MehrfamilienhausDrawing() {
  return (
    <g pathLength={100}>
      <line x1="40" y1="276" x2="440" y2="276" strokeOpacity="0.25" pathLength={100} />
      <path d="M 100 260 L 340 260 L 340 80 L 100 80 Z" pathLength={100} />
      <path d="M 340 260 L 400 224 L 400 44 L 340 80 Z" pathLength={100} />
      <path d="M 100 80 L 340 80 L 400 44 L 160 44 Z" strokeOpacity="0.85" pathLength={100} />
      <line x1="100" y1="140" x2="340" y2="140" strokeOpacity="0.35" pathLength={100} />
      <line x1="340" y1="140" x2="400" y2="104" strokeOpacity="0.35" pathLength={100} />
      <line x1="100" y1="200" x2="340" y2="200" strokeOpacity="0.35" pathLength={100} />
      <line x1="340" y1="200" x2="400" y2="164" strokeOpacity="0.35" pathLength={100} />
      <rect x="124" y="96" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="180" y="96" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="236" y="96" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="292" y="96" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="124" y="156" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="180" y="156" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="236" y="156" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="292" y="156" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="124" y="216" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="180" y="216" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="236" y="216" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="292" y="216" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
      <path d="M 200 260 L 200 224 L 240 224 L 240 260" strokeOpacity="0.6" pathLength={100} />
    </g>
  )
}

function SanierungDrawing() {
  return (
    <g pathLength={100}>
      <line x1="40" y1="276" x2="440" y2="276" strokeOpacity="0.25" pathLength={100} />
      <path d="M 140 260 L 300 260 L 300 160 L 140 160 Z" pathLength={100} />
      <path d="M 300 260 L 360 220 L 360 120 L 300 160 Z" pathLength={100} />
      <path d="M 140 160 L 220 110 L 300 160" strokeOpacity="0.85" pathLength={100} />
      <path d="M 300 160 L 220 110 L 280 70 L 360 120 Z" strokeOpacity="0.85" pathLength={100} />
      <line x1="124" y1="260" x2="124" y2="80" strokeOpacity="0.7" pathLength={100} />
      <line x1="316" y1="260" x2="316" y2="80" strokeOpacity="0.7" pathLength={100} />
      <line x1="372" y1="220" x2="372" y2="40" strokeOpacity="0.7" pathLength={100} />
      <line x1="120" y1="170" x2="320" y2="170" strokeOpacity="0.7" pathLength={100} />
      <line x1="316" y1="170" x2="372" y2="130" strokeOpacity="0.7" pathLength={100} />
      <line x1="120" y1="220" x2="320" y2="220" strokeOpacity="0.7" pathLength={100} />
      <line x1="316" y1="220" x2="372" y2="180" strokeOpacity="0.7" pathLength={100} />
      <rect x="160" y="200" width="24" height="28" strokeOpacity="0.6" strokeDasharray="4 4" pathLength={100} />
      <rect x="248" y="200" width="28" height="28" strokeOpacity="0.55" pathLength={100} />
    </g>
  )
}

function UmnutzungDrawing() {
  return (
    <g pathLength={100}>
      <line x1="40" y1="276" x2="440" y2="276" strokeOpacity="0.25" pathLength={100} />
      <path d="M 100 260 L 340 260 L 340 100 L 100 100 Z" pathLength={100} />
      <path d="M 340 260 L 400 224 L 400 64 L 340 100 Z" pathLength={100} />
      <path d="M 100 100 L 340 100 L 400 64 L 160 64 Z" strokeOpacity="0.85" pathLength={100} />
      <line x1="220" y1="100" x2="220" y2="260" strokeOpacity="0.55" strokeDasharray="6 6" pathLength={100} />
      <rect x="124" y="124" width="24" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="164" y="124" width="24" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="124" y="184" width="24" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="164" y="184" width="24" height="28" strokeOpacity="0.55" pathLength={100} />
      <rect x="240" y="124" width="80" height="44" strokeOpacity="0.55" pathLength={100} />
      <rect x="240" y="188" width="80" height="44" strokeOpacity="0.55" pathLength={100} />
      <path d="M 180 44 Q 220 20 260 44" strokeOpacity="0.7" pathLength={100} />
      <path d="M 176 38 L 180 44 L 186 38" strokeOpacity="0.7" pathLength={100} />
      <path d="M 264 38 L 260 44 L 254 38" strokeOpacity="0.7" pathLength={100} />
    </g>
  )
}

function AbbruchDrawing() {
  return (
    <g pathLength={100}>
      <line x1="40" y1="276" x2="440" y2="276" strokeOpacity="0.25" pathLength={100} />
      <path d="M 140 260 L 220 260 L 220 200 L 140 200 Z" pathLength={100} />
      <path d="M 260 260 L 300 260 L 300 190 L 260 190 Z" pathLength={100} />
      <path d="M 140 200 L 140 160 L 300 160 L 300 190" strokeOpacity="0.55" strokeDasharray="6 6" pathLength={100} />
      <path d="M 300 160 L 360 120 L 360 220 L 300 190" strokeOpacity="0.45" strokeDasharray="6 6" pathLength={100} />
      <path d="M 140 160 L 220 110 L 300 160" strokeOpacity="0.45" strokeDasharray="6 6" pathLength={100} />
      <path d="M 300 160 L 220 110 L 280 70 L 360 120" strokeOpacity="0.4" strokeDasharray="6 6" pathLength={100} />
      <rect x="236" y="248" width="16" height="12" strokeOpacity="0.7" pathLength={100} />
      <rect x="230" y="236" width="16" height="12" strokeOpacity="0.7" pathLength={100} />
      <rect x="248" y="236" width="16" height="12" strokeOpacity="0.7" pathLength={100} />
      <rect x="240" y="224" width="16" height="12" strokeOpacity="0.7" pathLength={100} />
    </g>
  )
}

function SonstigesDrawing() {
  return (
    <g pathLength={100}>
      <line x1="40" y1="276" x2="440" y2="276" strokeOpacity="0.25" pathLength={100} />
      <path d="M 140 260 L 300 260 L 300 140 L 140 140 Z" strokeDasharray="6 6" pathLength={100} />
      <path d="M 300 260 L 360 224 L 360 104 L 300 140 Z" strokeDasharray="6 6" pathLength={100} />
      <path d="M 140 140 L 300 140 L 360 104 L 200 104 Z" strokeDasharray="6 6" pathLength={100} />
      <text
        x="240"
        y="224"
        fontFamily="Georgia, 'Instrument Serif', serif"
        fontStyle="italic"
        fontSize="64"
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
