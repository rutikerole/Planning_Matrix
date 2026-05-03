import { m } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  /** Per-segment fill 0..1, length === labels.length. */
  fills: number[]
  className?: string
}

/**
 * Three faint hairline segments side by side. Each fills clay
 * left-to-right as its `fills[i]` value approaches 1. Width per
 * segment is fixed at 80px.
 */
export function Stepper({ fills, className }: Props) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {fills.map((fill, idx) => (
        <div
          key={idx}
          aria-hidden="true"
          className="relative h-px w-[80px] overflow-hidden bg-pm-ink/15"
        >
          <m.span
            className="absolute inset-y-0 left-0 bg-pm-clay"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(1, Math.max(0, fill)) * 100}%` }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      ))}
    </div>
  )
}
