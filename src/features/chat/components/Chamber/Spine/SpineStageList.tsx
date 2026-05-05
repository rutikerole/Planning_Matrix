// Phase 7.5 — SpineStageList.
// Phase 7.8 — SpineRail removed. The Reading Room layout drops the
// vertical clay rail behind the stage rows; the sigils + spacing
// carry the rhythm. The ruled-paper substrate still attaches via
// the [data-spine-stage-list="true"] selector in globals.css.

import { cn } from '@/lib/utils'
import type { ResolvedSpineStage } from '../../../hooks/useSpineStages'
import { SpineStage } from './SpineStage'

interface Props {
  stages: ResolvedSpineStage[]
  onStageClick?: (id: string) => void
  className?: string
}

export function SpineStageList({ stages, onStageClick, className }: Props) {
  return (
    <div
      data-spine-stage-list="true"
      className={cn(
        'relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-4 pb-4 px-5',
        '[&::-webkit-scrollbar]:hidden',
        className,
      )}
      style={{ scrollbarWidth: 'none' }}
    >
      <ol className="relative flex flex-col gap-1">
        {stages.map((s) => (
          <SpineStage key={s.id} stage={s} onClick={onStageClick} />
        ))}
      </ol>
    </div>
  )
}
