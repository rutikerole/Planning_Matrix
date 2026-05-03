import { m, useReducedMotion } from 'framer-motion'

interface Props {
  className?: string
  /** When true, plays the stroke-draw animation on mount. Default: false (static). */
  animate?: boolean
}

/**
 * Drafting-table corner with sketchbook + pencil + blueprint roll.
 * Extracted from the dashboard's AtelierTableIllustration so both
 * the loader (animated) and the dashboard empty state (static) can
 * share one source of truth.
 *
 * When animate=true and the user has not requested reduced motion,
 * three groups draw in sequence:
 *   1. Paper edges (240ms)
 *   2. Diagonal pencil (320ms)
 *   3. Ruler scale tick marks (400ms)
 */
export function DraftingBoard({ className, animate = false }: Props) {
  const reduced = useReducedMotion()
  const play = animate && !reduced

  const stroke = play
    ? { pathLength: 0, opacity: 0 }
    : { pathLength: 1, opacity: 1 }
  const drawn = { pathLength: 1, opacity: 1 }

  return (
    <m.svg
      viewBox="0 0 280 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={
        'text-pm-clay-deep/55 ' + (className ?? 'w-[260px] sm:w-[280px] h-auto')
      }
    >
      {/* Group 1: Drafting-table corner — paper edges (draws first). */}
      <m.g
        initial={stroke}
        animate={drawn}
        transition={{ duration: play ? 0.24 : 0, ease: [0.16, 1, 0.3, 1] }}
      >
        <path d="M 30 138 L 250 138 L 264 110 L 44 110 Z" strokeOpacity="0.95" />
        <path d="M 34 136 L 246 136" strokeOpacity="0.35" />
        <path d="M 30 138 L 28 170" strokeOpacity="0.85" />
        <path d="M 250 138 L 252 170" strokeOpacity="0.85" />
        <path d="M 44 110 L 42 142" strokeOpacity="0.55" />
        <path d="M 264 110 L 266 142" strokeOpacity="0.55" />
      </m.g>

      {/* Group 2: Sketchbook + pencil (the diagonal). */}
      <m.g
        initial={stroke}
        animate={drawn}
        transition={{
          duration: play ? 0.32 : 0,
          delay: play ? 0.18 : 0,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {/* Sketchbook */}
        <g strokeOpacity="0.85">
          <path d="M 78 132 L 152 124 L 156 110 L 82 118 Z" />
          <path d="M 78 132 L 78 134.4 L 152 126.4 L 152 124" strokeOpacity="0.55" />
          <path d="M 152 124 L 156 110" strokeOpacity="0.55" />
          <path d="M 86 130 L 90 116" strokeOpacity="0.55" />
          <path d="M 154 116 L 158 116 L 156 122" strokeOpacity="0.4" />
        </g>
        {/* Pencil */}
        <g strokeOpacity="0.85">
          <path d="M 100 102 L 168 92 L 170 96 L 102 106 Z" />
          <path d="M 102 104 L 169 94" strokeOpacity="0.4" />
          <path d="M 168 92 L 174 91 L 176 95 L 170 96 Z" strokeOpacity="0.7" />
          <path d="M 165 92.4 L 167 96.4" strokeOpacity="0.5" />
          <path d="M 100 102 L 99 106" strokeOpacity="0.7" />
        </g>
        {/* Rolled blueprint */}
        <g strokeOpacity="0.7">
          <ellipse cx="200" cy="118" rx="6" ry="3.4" />
          <line x1="200" y1="114.6" x2="246" y2="108" />
          <line x1="200" y1="121.4" x2="246" y2="114.6" />
          <ellipse cx="246" cy="111.3" rx="5.4" ry="3.4" strokeOpacity="0.55" />
          <path d="M 218 113 Q 220 117 222 117" strokeOpacity="0.5" />
          <path d="M 218 113 Q 220 109 222 109" strokeOpacity="0.5" />
        </g>
      </m.g>

      {/* Group 3: Ruler scale tick marks. */}
      <m.g
        initial={stroke}
        animate={drawn}
        transition={{
          duration: play ? 0.4 : 0,
          delay: play ? 0.42 : 0,
          ease: [0.16, 1, 0.3, 1],
        }}
        strokeOpacity="0.5"
      >
        <line x1="206" y1="148" x2="244" y2="148" strokeWidth="0.7" />
        <line x1="206" y1="146" x2="206" y2="150" strokeWidth="0.7" />
        <line x1="216" y1="146.5" x2="216" y2="149.5" strokeWidth="0.7" />
        <line x1="226" y1="146.5" x2="226" y2="149.5" strokeWidth="0.7" />
        <line x1="236" y1="146.5" x2="236" y2="149.5" strokeWidth="0.7" />
        <line x1="244" y1="146" x2="244" y2="150" strokeWidth="0.7" />
        <text
          x="225"
          y="160"
          fontFamily="Georgia, 'Instrument Serif', serif"
          fontStyle="italic"
          fontSize="7"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fillOpacity="0.55"
        >
          M 1:100
        </text>
      </m.g>

      <path d="M 30 173 L 252 173" strokeOpacity="0.18" />
    </m.svg>
  )
}
