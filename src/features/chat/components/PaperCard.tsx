import type { ReactNode } from 'react'
import { TitleBlock } from './TitleBlock'
import type { ProjectRow } from '@/types/db'

interface Props {
  project: ProjectRow
  children: ReactNode
}

/**
 * Phase 3.2 #37 — paper card wrapping the conversation thread. The page is
 * paper, this card is paper sitting on paper. Depth comes from a near-
 * invisible drop shadow + an inset paper-edge highlight, not from
 * elevation styling. Hairline border at ink/12 for restraint. Sharp
 * corners (rounded-[2px], not pillowy).
 *
 * Title block at top per German A1 architectural-drawing convention,
 * with the north-arrow rosette in the top-right corner drawing itself
 * in on first mount.
 */
export function PaperCard({ project, children }: Props) {
  return (
    <div
      className="relative bg-paper border border-ink/12 rounded-[2px] px-8 sm:px-12 pt-10 sm:pt-14 pb-24 mx-auto max-w-2xl"
      style={{
        boxShadow:
          'inset 0 1px 0 hsl(0 0% 100% / 0.6), 0 1px 0 rgba(0,0,0,0.04), 0 8px 32px -12px rgba(20,15,8,0.08)',
      }}
    >
      <TitleBlock project={project} />
      {children}
    </div>
  )
}
