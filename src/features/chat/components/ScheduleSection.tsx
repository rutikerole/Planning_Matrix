import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** Roman numeral marking the section ("I", "II", "III"). */
  numeral: string
  title: string
  count?: number
  active?: boolean
  emptyCopy: string
  defaultOpen?: boolean
  children?: ReactNode
}

/**
 * Phase 3.2 #40 — schedule-style section header for the right rail.
 *
 * Replaces the generic "RailSectionHeader" inside dossier panels with
 * an architectural-schedule header: hairline rule above, then a row
 * with [Roman numeral · uppercase title · count] on the left and a
 * collapse chevron on the right. The Roman numeral is Instrument Serif
 * italic 13 clay-deep; sits in a 24px column so subsequent rows can
 * vertically align underneath.
 *
 * `active` keeps the Polish-Move-4 ambient pulse next to the title.
 */
export function ScheduleSection({
  numeral,
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
    <section className="flex flex-col gap-2 border-t border-border/40 pt-6 mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between text-left gap-3 py-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        <span className="flex items-baseline gap-3">
          {/* Roman numeral, anchored to a 24px column for row alignment */}
          <span className="font-serif italic text-[13px] text-clay-deep tabular-figures w-6 leading-none">
            {numeral}
          </span>
          {active && (
            <span
              aria-hidden="true"
              className="block size-1 rounded-full bg-clay motion-safe:animate-[pmAmbientPulse_1.6s_ease-in-out_infinite]"
            />
          )}
          <span className="text-[11px] tracking-[0.18em] uppercase font-medium text-foreground/65 hover:text-ink transition-colors duration-soft">
            {title}
          </span>
          {typeof count === 'number' && count > 0 && (
            <span className="font-serif italic text-[11px] text-clay/72 tabular-figures leading-none">
              {String(count).padStart(2, '0')}
            </span>
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
        <div className="flex flex-col gap-3 pt-1">
          {isEmpty ? (
            <p className="font-serif italic text-[12px] text-clay/70 leading-relaxed pl-9">
              {emptyCopy}
            </p>
          ) : (
            children
          )}
        </div>
      )}
      <style>{`@keyframes pmAmbientPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </section>
  )
}

interface ScheduleRowProps {
  /** 01 / 02 / 03 ... — printed as the row index in the numeral column. */
  index: number
  title: string
  /** Right-side meta — typically a StatusPill or a tiny "needed/not" tag. */
  meta?: ReactNode
  /** Sub-line (rationale, etc.) — Inter 11 ink/65. */
  sub?: ReactNode
  /** Footer qualifier — Inter 9 clay/65 italic uppercase. */
  qualifier?: string
}

/**
 * Phase 3.2 #40 — one row in a ScheduleSection. Aligns with the
 * 24px Roman-numeral column established by the section header. The
 * row index ("01", "02") sits in font-serif italic clay/55 in that
 * same column; the rest of the row is the schedule entry proper.
 */
export function ScheduleRow({ index, title, meta, sub, qualifier }: ScheduleRowProps) {
  return (
    <article className="grid grid-cols-[24px_1fr] gap-x-3 gap-y-1">
      <span className="font-serif italic text-[11px] text-clay/72 tabular-figures leading-snug pt-0.5">
        {String(index).padStart(2, '0')}
      </span>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-ink leading-snug">{title}</p>
        {meta}
      </div>
      {sub && (
        <>
          <span aria-hidden="true" />
          <p className="text-[11px] text-ink/65 leading-relaxed">{sub}</p>
        </>
      )}
      {qualifier && (
        <>
          <span aria-hidden="true" />
          <p className="text-[11px] text-clay/72 italic uppercase tracking-[0.14em] tabular-nums">
            {qualifier}
          </p>
        </>
      )}
    </article>
  )
}
