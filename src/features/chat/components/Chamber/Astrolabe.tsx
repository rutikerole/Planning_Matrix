// Phase 7 Chamber — Astrolabe.
//
// Two visual sizes:
//   - 'full' (132px) — sits at the top of the conversation column when
//     scrollY === 0 on desktop / tablet. Hero progress dial.
//   - 'compact' (44px) — lives inside AstrolabeStickyHeader once the
//     user scrolls past the threshold.
//
// Geometry (single source of truth — both sizes scale from these):
//   - Outer ring at r = 0.50
//   - Inner ring at r = 0.40
//   - 22 turn ticks between the rings (radial hairlines)
//   - 7 specialist sigils on the inner ring (every 360/7 ≈ 51.4°)
//   - Center holds the percent label
//   - A clay arc traces the outer ring from 12 o'clock through
//     (percent / 100) × 360°
//   - A 1px clay needle from center → current turn tick
//
// Drag-to-scrub lives in commit 7. This commit ships static geometry +
// state-driven styling.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Specialist } from '@/types/projectState'
import { ChamberSigil } from '../../lib/specialistSigils'
import { SEGMENT_ORDER } from '../../lib/segmentOrder'

export interface AstrolabeProps {
  percent: number
  currentTurn: number
  totalEstimate: number
  currentSpecialist: Specialist | null
  spokenSpecialists: Set<Specialist>
  size: 'full' | 'compact'
  onScrubTo?: (turnIndex: number) => void
  onSigilClick?: (specialist: Specialist) => void
  onClick?: () => void
  className?: string
  ariaLabel?: string
}

export function Astrolabe(props: AstrolabeProps) {
  const {
    percent,
    currentTurn,
    totalEstimate,
    currentSpecialist,
    spokenSpecialists,
    size,
    onSigilClick,
    onClick,
    className,
    ariaLabel,
  } = props
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [hoverTurn, setHoverTurn] = useState<number | null>(null)
  // State mirror of draggingRef so the className can read it without
  // tripping react-hooks/refs.
  const [isDragging, setIsDragging] = useState(false)

  const px = size === 'full' ? 132 : 44
  const cx = px / 2
  const cy = px / 2
  const rOuter = px * 0.50
  const rInner = px * 0.40
  const rTickInner = rOuter - (size === 'full' ? 9 : 4)
  const rNeedleEnd = rTickInner - 1
  const rSigil = rInner

  const totalTicks = Math.max(totalEstimate, 1)
  const cappedPercent = Math.max(0, Math.min(100, percent))
  const arcEndRad = ((cappedPercent / 100) * Math.PI * 2) - Math.PI / 2

  // Arc path (svg arc from 12 o'clock through cappedPercent of the
  // circle). When percent === 0 → no path. When 100 → full circle.
  const arcPath = (() => {
    if (cappedPercent <= 0) return ''
    if (cappedPercent >= 99.99) {
      // Full ring — split into two semicircle arcs to avoid SVG
      // start===end degeneracy.
      return [
        `M ${cx} ${cy - rOuter}`,
        `A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy + rOuter}`,
        `A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy - rOuter}`,
      ].join(' ')
    }
    const startX = cx
    const startY = cy - rOuter
    const endX = cx + rOuter * Math.cos(arcEndRad)
    const endY = cy + rOuter * Math.sin(arcEndRad)
    const largeArc = cappedPercent > 50 ? 1 : 0
    return `M ${startX} ${startY} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endX} ${endY}`
  })()

  // Needle (only when there's a current turn).
  const needleAngle = currentTurn > 0
    ? ((currentTurn - 1) / totalTicks) * Math.PI * 2 - Math.PI / 2
    : -Math.PI / 2
  const needleX = cx + rNeedleEnd * Math.cos(needleAngle)
  const needleY = cy + rNeedleEnd * Math.sin(needleAngle)

  const handleSigilClick = (s: Specialist, e: MouseEvent) => {
    if (!onSigilClick) return
    e.stopPropagation()
    onSigilClick(s)
  }

  // Drag-to-scrub (full size only, when onScrubTo is provided).
  const scrubEnabled = size === 'full' && !!props.onScrubTo && currentTurn > 0

  const turnIndexFromPointer = (clientX: number, clientY: number): number => {
    const el = rootRef.current
    if (!el) return -1
    const rect = el.getBoundingClientRect()
    const dx = clientX - (rect.left + cx)
    const dy = clientY - (rect.top + cy)
    // atan2 returns radians from +x axis. We rotate so 12 o'clock = 0.
    let theta = Math.atan2(dy, dx) + Math.PI / 2
    if (theta < 0) theta += Math.PI * 2
    const fraction = theta / (Math.PI * 2)
    const idx = Math.round(fraction * totalTicks) % totalTicks
    return idx
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrubEnabled) return
    if (e.button !== 0) return
    e.stopPropagation()
    draggingRef.current = true
    setIsDragging(true)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const idx = turnIndexFromPointer(e.clientX, e.clientY)
    if (idx >= 0 && idx < currentTurn) setHoverTurn(idx)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const idx = turnIndexFromPointer(e.clientX, e.clientY)
    if (idx >= 0 && idx < currentTurn) setHoverTurn(idx)
  }
  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setIsDragging(false)
    if (hoverTurn !== null && props.onScrubTo) {
      props.onScrubTo(hoverTurn)
    }
    setHoverTurn(null)
  }

  // Cancel drag if pointer leaves the window.
  useEffect(() => {
    if (!scrubEnabled) return
    const onCancel = () => {
      draggingRef.current = false
    setIsDragging(false)
      setHoverTurn(null)
    }
    window.addEventListener('pointercancel', onCancel)
    return () => window.removeEventListener('pointercancel', onCancel)
  }, [scrubEnabled])

  const handleRootClick = () => {
    if (draggingRef.current) return // suppressed during drag
    onClick?.()
  }

  const interactive = !!onClick || scrubEnabled
  const tickStrokeBase = 'rgba(26, 22, 18, 0.18)'

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={ariaLabel ?? `${cappedPercent}% — Runde ${currentTurn} von ungefähr ${totalEstimate}`}
      onClick={interactive ? handleRootClick : undefined}
      onPointerDown={scrubEnabled ? onPointerDown : undefined}
      onPointerMove={scrubEnabled ? onPointerMove : undefined}
      onPointerUp={scrubEnabled ? onPointerUp : undefined}
      onPointerLeave={scrubEnabled ? onPointerUp : undefined}
      className={cn(
        'relative inline-block select-none',
        interactive && 'cursor-pointer',
        isDragging && 'cursor-grabbing',
        className,
      )}
      style={{ width: px, height: px } as CSSProperties}
      data-chamber-astrolabe={size}
    >
      <svg
        viewBox={`0 0 ${px} ${px}`}
        width={px}
        height={px}
        className="block"
      >
        {/* Outer ring */}
        <circle
          cx={cx}
          cy={cy}
          r={rOuter}
          fill="none"
          stroke="rgba(26, 22, 18, 0.14)"
          strokeWidth={1}
        />
        {/* Inner ring */}
        <circle
          cx={cx}
          cy={cy}
          r={rInner}
          fill="none"
          stroke="rgba(26, 22, 18, 0.08)"
          strokeWidth={1}
        />

        {/* Turn ticks */}
        {Array.from({ length: totalTicks }, (_, i) => {
          const angle = (i / totalTicks) * Math.PI * 2 - Math.PI / 2
          const x1 = cx + rTickInner * Math.cos(angle)
          const y1 = cy + rTickInner * Math.sin(angle)
          const x2 = cx + rOuter * Math.cos(angle)
          const y2 = cy + rOuter * Math.sin(angle)
          const isCurrent = i === currentTurn - 1 && currentTurn > 0
          const isPast = i < currentTurn - 1
          const stroke = isCurrent
            ? 'hsl(var(--clay))'
            : isPast
              ? 'hsl(var(--clay) / 0.8)'
              : tickStrokeBase
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={isCurrent ? 1.5 : 1}
              strokeLinecap="round"
            />
          )
        })}

        {/* Progress arc */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke="hsl(var(--clay))"
            strokeOpacity={0.86}
            strokeWidth={size === 'full' ? 2.5 : 1.5}
            strokeLinecap="round"
            style={{
              transition: reduced
                ? 'none'
                : 'stroke-dasharray 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}

        {/* Needle */}
        {currentTurn > 0 && (
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke="hsl(var(--clay))"
            strokeWidth={1}
            strokeLinecap="round"
            style={{
              transition: reduced
                ? 'none'
                : 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}

        {/* Ghost needle while scrubbing */}
        {hoverTurn !== null && (() => {
          const a = (hoverTurn / totalTicks) * Math.PI * 2 - Math.PI / 2
          const gx = cx + rNeedleEnd * Math.cos(a)
          const gy = cy + rNeedleEnd * Math.sin(a)
          return (
            <line
              x1={cx}
              y1={cy}
              x2={gx}
              y2={gy}
              stroke="hsl(var(--clay-deep))"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeOpacity={0.7}
            />
          )
        })()}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={1.4} fill="hsl(var(--clay))" />
      </svg>

      {/* Specialist sigils — absolutely positioned on the inner ring */}
      {SEGMENT_ORDER.map((spec, i) => {
        const angle = (i / SEGMENT_ORDER.length) * Math.PI * 2 - Math.PI / 2
        const sx = cx + rSigil * Math.cos(angle)
        const sy = cy + rSigil * Math.sin(angle)
        const isActive = currentSpecialist === spec
        const isSpoken = spokenSpecialists.has(spec)
        const sigilSize = size === 'full' ? 16 : 8
        return (
          <button
            key={spec}
            type="button"
            onClick={(e) => handleSigilClick(spec, e)}
            disabled={!onSigilClick}
            aria-label={spec}
            tabIndex={onSigilClick ? 0 : -1}
            className={cn(
              'absolute grid place-items-center rounded-full',
              onSigilClick
                ? 'cursor-pointer hover:scale-110 transition-transform duration-200'
                : 'cursor-default',
              isActive
                ? 'opacity-100'
                : isSpoken
                  ? 'opacity-65'
                  : 'opacity-32',
            )}
            style={{
              left: sx,
              top: sy,
              transform: 'translate(-50%, -50%)',
              width: sigilSize + 4,
              height: sigilSize + 4,
            }}
          >
            {isActive && size === 'full' && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full chamber-astro-halo"
                style={{ background: 'rgba(123, 92, 63, 0.18)' }}
              />
            )}
            <span
              className="relative grid place-items-center"
              style={{
                color: isActive ? 'hsl(var(--clay))' : 'hsl(var(--ink) / 0.6)',
                width: sigilSize,
                height: sigilSize,
              }}
            >
              <ChamberSigil specialist={spec} size={sigilSize} />
            </span>
          </button>
        )
      })}

      {/* Center label — full only */}
      {size === 'full' && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center leading-none">
            <p className="font-serif italic text-[20px] text-ink tabular-figures leading-none">
              {cappedPercent}
              <span className="text-[12px] text-ink/55 ml-0.5">%</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

