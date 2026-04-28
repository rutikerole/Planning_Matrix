interface Props {
  className?: string
}

/**
 * Phase 3.3 #47 — empty-state illustration for the dashboard.
 *
 * Different scene from `atelier-empty.svg` (which shows the team
 * gathering): here a closed sketchbook + an unsharpened pencil + a
 * single rolled blueprint sit on a corner of a drafting table. Reads
 * as "atelier waiting to begin" — project not started.
 *
 * Static (no animation), unlike the chat empty state. The dashboard
 * is calmer than the priming state. 1px stroke, drafting-blue 45%.
 */
export function AtelierTableIllustration({ className }: Props) {
  return (
    <svg
      viewBox="0 0 280 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={
        'text-drafting-blue/45 ' + (className ?? 'w-[260px] sm:w-[280px] h-auto')
      }
    >
      {/* Drafting-table corner — axonometric parallelogram */}
      <path d="M 30 138 L 250 138 L 264 110 L 44 110 Z" strokeOpacity="0.95" />
      <path d="M 34 136 L 246 136" strokeOpacity="0.35" />

      {/* Table edges receding — front + side legs */}
      <path d="M 30 138 L 28 170" strokeOpacity="0.85" />
      <path d="M 250 138 L 252 170" strokeOpacity="0.85" />
      <path d="M 44 110 L 42 142" strokeOpacity="0.55" />
      <path d="M 264 110 L 266 142" strokeOpacity="0.55" />

      {/* Closed sketchbook, centre-left — slightly thick rectangle */}
      <g strokeOpacity="0.85">
        <path d="M 78 132 L 152 124 L 156 110 L 82 118 Z" />
        <path d="M 78 132 L 78 134.4 L 152 126.4 L 152 124" strokeOpacity="0.55" />
        <path d="M 152 124 L 156 110" strokeOpacity="0.55" />
        {/* Spine line */}
        <path d="M 86 130 L 90 116" strokeOpacity="0.55" />
        {/* Tiny binding ribbon along the right edge */}
        <path d="M 154 116 L 158 116 L 156 122" strokeOpacity="0.4" />
      </g>

      {/* Unsharpened pencil — long thin parallelogram, eraser end up-right */}
      <g strokeOpacity="0.85">
        {/* Body */}
        <path d="M 100 102 L 168 92 L 170 96 L 102 106 Z" />
        {/* Hex-faceting hairline */}
        <path d="M 102 104 L 169 94" strokeOpacity="0.4" />
        {/* Eraser end (right) — small block */}
        <path d="M 168 92 L 174 91 L 176 95 L 170 96 Z" strokeOpacity="0.7" />
        {/* Ferrule rule */}
        <path d="M 165 92.4 L 167 96.4" strokeOpacity="0.5" />
        {/* Tip end (left) — flat unsharpened */}
        <path d="M 100 102 L 99 106" strokeOpacity="0.7" />
      </g>

      {/* Rolled blueprint — single tube, back-right */}
      <g strokeOpacity="0.7">
        {/* Cylinder ends */}
        <ellipse cx="200" cy="118" rx="6" ry="3.4" />
        <line x1="200" y1="114.6" x2="246" y2="108" />
        <line x1="200" y1="121.4" x2="246" y2="114.6" />
        <ellipse cx="246" cy="111.3" rx="5.4" ry="3.4" strokeOpacity="0.55" />
        {/* Tied-string mark */}
        <path d="M 218 113 Q 220 117 222 117" strokeOpacity="0.5" />
        <path d="M 218 113 Q 220 109 222 109" strokeOpacity="0.5" />
      </g>

      {/* Scale-bar in the lower-right corner of the table — tiny ruler */}
      <g strokeOpacity="0.5">
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
      </g>

      {/* Subtle ground hairline under the table */}
      <path d="M 30 173 L 252 173" strokeOpacity="0.18" />
    </svg>
  )
}
