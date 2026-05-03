interface Props {
  /** Optional live coordinates; falls back to prototype's München sample. */
  lat?: number
  lng?: number
  /** Optional parcel id; falls back to prototype's "0218 / 7". */
  flst?: string
}

function fmtCoord(n: number, suffix: 'N' | 'E'): string {
  // German decimal style: comma instead of dot.
  return `${n.toFixed(4).replace('.', ',')}° ${suffix}`
}

/**
 * v3 architectural corner overlays for the Q2 map. Mono labels at:
 *   • top-left:  FLST. xxxx / x  (parcel id, clay)
 *   • top-right: north arrow + N
 *   • bottom-left: M 1:500 + scale bar + "25 m"
 *   • bottom-right: live coords
 *
 * Copied verbatim from the prototype's `.map-corners` block.
 * pointer-events:none so the map underneath stays interactive.
 */
export function MapCorners({ lat, lng, flst = '0218 / 7' }: Props) {
  const coords =
    typeof lat === 'number' && typeof lng === 'number'
      ? `${fmtCoord(lat, 'N')} · ${fmtCoord(lng, 'E')}`
      : '48,1289° N · 11,5728° E'

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-[402] pointer-events-none font-mono text-[10px] tracking-[0.08em] uppercase text-pm-ink-soft"
    >
      <div className="absolute left-[18px] top-[14px] font-medium text-pm-clay">
        FLST. {flst}
      </div>
      <div className="absolute right-[18px] top-[14px] w-[38px] text-center">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="mx-auto mb-0.5 block"
        >
          <path d="M12 2 L17 18 L12 14 L7 18 Z" fill="currentColor" />
        </svg>
        N
      </div>
      <div className="absolute bottom-[14px] left-[18px] flex items-center gap-2">
        <span>M 1:500</span>
        <span className="relative block h-px w-[60px] bg-pm-ink-soft">
          <span className="absolute -top-[3px] left-0 block h-[6px] w-px bg-pm-ink-soft" />
          <span className="absolute -top-[3px] right-0 block h-[6px] w-px bg-pm-ink-soft" />
        </span>
        <span>25 m</span>
      </div>
      <div className="absolute bottom-[14px] right-[18px] text-[10px] tracking-[0.04em] normal-case text-pm-ink-mid">
        {coords}
      </div>
    </div>
  )
}
