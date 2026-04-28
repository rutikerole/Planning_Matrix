import type React from 'react'
import { useTranslation } from 'react-i18next'
import { project, pathFromVertices } from '@/lib/axonometric'
import { ScaleBar } from '@/features/chat/components/illustrations/ScaleBar'

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
        {/* Phase 3.7 #78 follow-up — labels bumped from 12 px clay/85
          * to 15 px ink/80 italic so they read at viewing distance. */}
        <span className="font-serif italic text-[15px] text-ink/80 leading-none">
          {t(`wizard.q1.options.${intent}`, { defaultValue: t('wizard.q1.options.sonstige') })}
        </span>
        <div className="pm-cover-scale">
          <ScaleBar
            label="M 1:100"
            segmentWidth={26}
            barHeight={7}
            labelTextClass="text-[15px] text-ink/80"
          />
        </div>
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

/**
 * Phase 3.7 #78 — T-01 Einfamilienhaus.
 *
 * Mathematical 30° axonometric projection of a single-family house:
 *   • Footprint: 8 × 10 module units (depth × width)
 *   • Body: 5 module units tall (two stories)
 *   • Pitched gable roof, ridge along the y-axis at x=4, peak at z=9
 *   • Front face (x=0): door + 2 windows
 *   • Visible side face (y=0): 2 windows
 *   • Chimney on the back roof slope
 *
 * Vertices defined in 3D, projected via /src/lib/axonometric.ts so
 * visible/hidden edges meet at the right places. Animation
 * choreography (per-path stroke-dashoffset draw-in) preserved through
 * the existing nth-child selectors.
 */
function EinfamilienhausDrawing() {
  // Phase 3.7 #78 follow-up — building scaled up so it fills the
  // 480×320 viewport more confidently (was scale=12, ~39 % width;
  // now scale=18, ~58 % width with full vertical breathing). Origin
  // moves slightly right + down so the front-left corner sits closer
  // to the bottom-left third.
  const opts = { originX: 235, originY: 295, scale: 18 }
  const p = (x: number, y: number, z: number) => project(x, y, z, opts)

  // ── Vertex labels ───────────────────────────────────────────────
  // Visible corners only — the back-right foot is hidden by the box's
  // other faces and never strokes a visible edge.
  const flf = p(0, 0, 0)   // front-left foot
  const frf = p(0, 10, 0)  // front-right foot
  const blf = p(8, 0, 0)   // back-left foot
  const flt = p(0, 0, 5)   // front-left top
  const frt = p(0, 10, 5)  // front-right top
  const blt = p(8, 0, 5)   // back-left top
  const brt = p(8, 10, 5)  // back-right top
  // Roof ridge endpoints — gable along the y-axis at x=4, z=9
  const ridgeFront = p(4, 0, 9)
  const ridgeBack = p(4, 10, 9)
  // Chimney on back roof slope — small box at world (5..6, 7..8, 8..9.5)
  const chimneyVertices: Array<[number, number, number]> = [
    [5, 7, 8],
    [5, 8, 8],
    [5, 8, 9.5],
    [5, 7, 9.5],
  ]

  return (
    <g pathLength={100} data-pm-axonometric="t-01">
      {/* 1. Ground reference line — anchors the building to a plot. */}
      <line
        x1="40"
        y1="290"
        x2="440"
        y2="290"
        strokeOpacity="0.22"
        pathLength={100}
      />

      {/* 2. Box body — front face (x=0), the visible face with door + windows. */}
      <path
        d={`M ${flf.sx} ${flf.sy} L ${frf.sx} ${frf.sy} L ${frt.sx} ${frt.sy} L ${flt.sx} ${flt.sy} Z`}
        strokeOpacity="0.92"
        pathLength={100}
      />

      {/* 3. Box body — visible side face (y=0). */}
      <path
        d={`M ${flf.sx} ${flf.sy} L ${blf.sx} ${blf.sy} L ${blt.sx} ${blt.sy} L ${flt.sx} ${flt.sy} Z`}
        strokeOpacity="0.78"
        pathLength={100}
      />

      {/* 4. Top eaves line — front. */}
      <path
        d={`M ${flt.sx} ${flt.sy} L ${frt.sx} ${frt.sy}`}
        strokeOpacity="0.55"
        pathLength={100}
      />

      {/* 5. Roof ridge line. */}
      <path
        d={`M ${ridgeFront.sx} ${ridgeFront.sy} L ${ridgeBack.sx} ${ridgeBack.sy}`}
        strokeOpacity="0.92"
        pathLength={100}
      />

      {/* 6. Roof gable — front. Triangle (flt, blt, ridgeFront). */}
      <path
        d={`M ${flt.sx} ${flt.sy} L ${blt.sx} ${blt.sy} L ${ridgeFront.sx} ${ridgeFront.sy} Z`}
        strokeOpacity="0.85"
        pathLength={100}
      />

      {/* 7. Roof slope — front-facing parallelogram from front eave to ridge. */}
      <path
        d={`M ${flt.sx} ${flt.sy} L ${frt.sx} ${frt.sy} L ${ridgeBack.sx} ${ridgeBack.sy} L ${ridgeFront.sx} ${ridgeFront.sy} Z`}
        strokeOpacity="0.7"
        pathLength={100}
      />

      {/* 8. Roof slope — back-side parallelogram. */}
      <path
        d={`M ${ridgeFront.sx} ${ridgeFront.sy} L ${ridgeBack.sx} ${ridgeBack.sy} L ${brt.sx} ${brt.sy} L ${blt.sx} ${blt.sy} Z`}
        strokeOpacity="0.7"
        pathLength={100}
      />

      {/* 9. Door on front face — world rect (0, 4..5.6, 0..2.4) */}
      <path
        d={pathFromVertices(
          [
            [0, 4, 0],
            [0, 5.6, 0],
            [0, 5.6, 2.4],
            [0, 4, 2.4],
          ],
          opts,
        )}
        strokeOpacity="0.6"
        pathLength={100}
      />

      {/* 10. Front-face window — left, world rect (0, 1.5..3, 2.5..3.8) */}
      <path
        d={pathFromVertices(
          [
            [0, 1.5, 2.5],
            [0, 3, 2.5],
            [0, 3, 3.8],
            [0, 1.5, 3.8],
          ],
          opts,
        )}
        strokeOpacity="0.55"
        pathLength={100}
      />

      {/* 11. Front-face window — right, world rect (0, 6.7..8.4, 2.5..3.8) */}
      <path
        d={pathFromVertices(
          [
            [0, 6.7, 2.5],
            [0, 8.4, 2.5],
            [0, 8.4, 3.8],
            [0, 6.7, 3.8],
          ],
          opts,
        )}
        strokeOpacity="0.55"
        pathLength={100}
      />

      {/* 12. Side-face window — front, world rect (1.5..3, 0, 2.5..3.8) */}
      <path
        d={pathFromVertices(
          [
            [1.5, 0, 2.5],
            [3, 0, 2.5],
            [3, 0, 3.8],
            [1.5, 0, 3.8],
          ],
          opts,
        )}
        strokeOpacity="0.5"
        pathLength={100}
      />

      {/* 13. Side-face window — back, world rect (5..6.5, 0, 2.5..3.8) */}
      <path
        d={pathFromVertices(
          [
            [5, 0, 2.5],
            [6.5, 0, 2.5],
            [6.5, 0, 3.8],
            [5, 0, 3.8],
          ],
          opts,
        )}
        strokeOpacity="0.5"
        pathLength={100}
      />

      {/* 14. Chimney — small box on the back roof slope. Visible
        * front face (x=5 plane, looking from front) — only the
        * front-facing parallelogram is drawn for legibility. */}
      <path
        d={pathFromVertices(chimneyVertices, opts)}
        strokeOpacity="0.7"
        pathLength={100}
      />
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
