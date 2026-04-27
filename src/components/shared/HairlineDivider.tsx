import { m } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

/**
 * Section divider — 1px hairline draws left→right when scrolled into
 * view, then a 5×5 clay tick mark fades in at the centre. Placed
 * absolutely at the top edge of any Section with bordered=true.
 */
export function HairlineDivider({ className }: Props) {
  return (
    <div
      className={cn(
        'absolute inset-x-0 top-0 h-2.5 pointer-events-none',
        className,
      )}
      aria-hidden="true"
    >
      <m.div
        className="absolute inset-x-0 top-0 h-px origin-left bg-border-strong/70"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
      />
      <m.span
        className="absolute left-1/2 top-0 block size-[5px] -translate-x-1/2 -translate-y-1/2 bg-clay"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}
