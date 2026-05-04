// Phase 7.5 — SpineStageList.
//
// Scrollable middle of the Spine. Mounts the SpineRail behind the
// stage rows. Hidden scrollbar (revealed on host hover via
// `.spine-rail-mask` masking — see globals.css).

import { cn } from '@/lib/utils'
import type { ResolvedSpineStage } from '../../../hooks/useSpineStages'
import { SpineRail } from './SpineRail'
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
        'relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-3.5 pb-3.5',
        '[&::-webkit-scrollbar]:hidden',
        className,
      )}
      style={{ scrollbarWidth: 'none' }}
    >
      <SpineRail />
      <ol className="relative flex flex-col">
        {stages.map((s) => (
          <SpineStage key={s.id} stage={s} onClick={onStageClick} />
        ))}
      </ol>
    </div>
  )
}
