import { useMemo } from 'react'
import { siteplanSvg } from '../lib/siteplan'
import './../styles/siteplan.css'

interface Props {
  address: string | null | undefined
  className?: string
}

/**
 * v3 80×80 site-plan thumbnail. Deterministic per address — feeding
 * the same string to `siteplanSvg` always produces byte-identical
 * markup (verified by memo on the address itself).
 *
 * The SVG carries a per-thumb pattern id so multiple thumbs can
 * render on the same page without colliding.
 */
export function SitePlanThumb({ address, className }: Props) {
  const html = useMemo(() => siteplanSvg(address ?? ''), [address])
  return (
    <div
      className={
        'flex size-20 shrink-0 items-center justify-center border border-pm-hair bg-pm-paper ' +
        (className ?? '')
      }
      // SVG is a pure function of `address` and contains no user-supplied HTML.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
