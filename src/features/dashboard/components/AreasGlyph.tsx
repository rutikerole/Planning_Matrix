import { cn } from '@/lib/utils'
import type { AreaState } from '@/types/projectState'

interface Props {
  /** 3 letters in order A, B, C. */
  states: [AreaState, AreaState, AreaState]
}

/**
 * Three mini 10×10 squares (A / B / C). Filled clay when ACTIVE,
 * hairline-hatched when PENDING, hairline-empty when VOID.
 */
export function AreasGlyph({ states }: Props) {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1">
      {states.map((state, idx) => (
        <span
          key={idx}
          className={cn(
            'block size-2.5 border',
            state === 'ACTIVE' && 'border-pm-clay bg-pm-clay',
            state === 'PENDING' && 'border-pm-clay/60 bg-pm-clay/15',
            state === 'VOID' && 'border-pm-hair bg-transparent',
          )}
        />
      ))}
    </span>
  )
}
