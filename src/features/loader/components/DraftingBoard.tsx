import { cn } from '@/lib/utils'
import type { TemplateId } from '@/types/projectState'
import { SILHOUETTE_PATHS } from './SilhouettePaths'
import './../styles/drafting-board.css'

interface Props {
  /** Drives which archetype silhouette is drawn inside `pencil-grp`. */
  templateId?: TemplateId
  /** Whether the stroke-draw animation should play. */
  animate?: boolean
  className?: string
}

/**
 * v3 drafting-board illustration. SVG content verbatim from the
 * prototype except `pencil-grp` swaps in the per-template
 * silhouette via `SILHOUETTE_PATHS`. Animation timings live in
 * `drafting-board.css`.
 */
export function DraftingBoard({ templateId = 'T-01', animate = false, className }: Props) {
  const silhouette = SILHOUETTE_PATHS[templateId] ?? SILHOUETTE_PATHS['T-01']

  return (
    <div className={cn('drafting-board', animate && 'run', className)}>
      <svg viewBox="0 0 340 200" width="340" height="200">
        {/* drafting board base (parallelogram) */}
        <path className="draw delay-1" d="M30 170 L90 30 L300 30 L240 170 Z" />
        {/* paper sheet */}
        <path className="draw delay-2" d="M82 145 L132 50 L260 50 L210 145 Z" />
        {/* ruler (clay stroke + dashed measurement marks) */}
        <path
          className="draw r delay-3 clay-stroke"
          d="M88 110 L222 60"
          strokeWidth="1.4"
        />
        <path
          className="draw r delay-3"
          d="M88 117 L222 67"
          strokeDasharray="2 2.5"
          strokeWidth=".8"
        />
        {/* archetype silhouette — varies per template */}
        <g className="pencil-grp">
          {silhouette.map((d, i) => (
            <path key={i} className="draw delay-4" d={d} />
          ))}
        </g>
        {/* scale ticks */}
        <g className="ticks">
          <line x1="125" y1="155" x2="125" y2="161" />
          <line x1="148" y1="155" x2="148" y2="161" />
          <line x1="171" y1="155" x2="171" y2="161" />
          <line x1="194" y1="155" x2="194" y2="161" />
          <line x1="217" y1="155" x2="217" y2="161" />
        </g>
        {/* M 1:100 label */}
        <text
          x="170"
          y="172"
          fontFamily="JetBrains Mono"
          fontSize="7"
          fill="hsl(26 56% 44%)"
          textAnchor="middle"
          letterSpacing="1"
        >
          M 1:100
        </text>
      </svg>
    </div>
  )
}
