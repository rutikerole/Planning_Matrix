import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  count?: number
  /** Polish Move 4 — render the ambient activity dot prefix on this section. */
  active?: boolean
  emptyCopy: string
  defaultOpen?: boolean
  children?: ReactNode
}

/**
 * Shared right-rail collapsible. Section eyebrow has a hairline
 * divider above it (Polish Move 3 — separates dossier sections),
 * tracking 0.18em, and accepts an `active` flag that prefixes the
 * eyebrow with a 4px clay dot pulsing at 1.6s (Polish Move 4 —
 * ambient activity hint).
 */
export function RailSectionHeader({
  title,
  count,
  active,
  emptyCopy,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const isEmpty = !children || (Array.isArray(children) && children.length === 0)

  return (
    <div className="flex flex-col gap-2 border-t border-border/40 pt-6 mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between text-left gap-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        <span className="flex items-center gap-2">
          {active && (
            <span
              aria-hidden="true"
              className="block size-1 rounded-full bg-clay motion-safe:animate-[pmAmbientPulse_1.6s_ease-in-out_infinite]"
            />
          )}
          <span className="text-[10px] tracking-[0.18em] uppercase font-medium text-foreground/60 hover:text-ink transition-colors duration-soft">
            {title}
          </span>
          {typeof count === 'number' && count > 0 && (
            <span className="text-[10px] tabular-nums text-ink/45">{count}</span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-3 text-ink/55 transition-transform duration-soft',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-3 pt-2">
          {isEmpty ? (
            <p className="text-[12px] text-clay/70 italic leading-relaxed">{emptyCopy}</p>
          ) : (
            children
          )}
        </div>
      )}
      <style>{`@keyframes pmAmbientPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </div>
  )
}
