// Inline SVG line-icons for the Q1 intent chips. 24 px viewBox, single
// 1.25 px clay stroke, no fills. Pure decoration — every icon carries
// aria-hidden via the chip wrapper.

import type { ComponentType } from 'react'
import type { Intent } from '../lib/selectTemplate'

interface Props {
  className?: string
}

const SVG_BASE = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function HouseEFH({ className }: Props) {
  return (
    <svg {...SVG_BASE} className={className}>
      <path d="M4 11 L12 5 L20 11" />
      <path d="M6 11 V19 H18 V11" />
      <path d="M11 19 V14 H13 V19" />
    </svg>
  )
}

function HouseMFH({ className }: Props) {
  return (
    <svg {...SVG_BASE} className={className}>
      <path d="M3 12 L9 7 L15 12" />
      <path d="M9 12 L15 7 L21 12" />
      <path d="M5 12 V19 H13 V12" />
      <path d="M13 12 V19 H19 V12" />
    </svg>
  )
}

function HouseWrench({ className }: Props) {
  return (
    <svg {...SVG_BASE} className={className}>
      <path d="M4 12 L11 6 L18 12" />
      <path d="M6 12 V19 H16 V12" />
      <circle cx="18" cy="17" r="2" />
      <path d="M16.5 18.5 L13.5 21.5" />
    </svg>
  )
}

function HouseArrow({ className }: Props) {
  return (
    <svg {...SVG_BASE} className={className}>
      <path d="M4 11 L11 6 L18 11" />
      <path d="M6 11 V18 H16 V11" />
      <path d="M14.5 14 A3 3 0 1 1 11.5 17" />
      <path d="M11.5 17 L10 17 M11.5 17 L11.5 18.5" />
    </svg>
  )
}

function HouseSlash({ className }: Props) {
  return (
    <svg {...SVG_BASE} className={className}>
      <path d="M4 11 L11 6 L18 11" />
      <path d="M6 11 V18 H16 V11" />
      <path d="M3.5 20.5 L20.5 4.5" strokeWidth={1.6} />
    </svg>
  )
}

function MoreDots({ className }: Props) {
  return (
    <svg {...SVG_BASE} className={className}>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

const REGISTRY: Record<Intent, ComponentType<Props>> = {
  neubau_einfamilienhaus: HouseEFH,
  neubau_mehrfamilienhaus: HouseMFH,
  sanierung: HouseWrench,
  umnutzung: HouseArrow,
  abbruch: HouseSlash,
  // v3 stubs — file is replaced by SketchCard SVGs in commit 2.
  // Kept here only so Record<Intent, ...> compiles after the union
  // grew to 8 values. INTENT_VALUES (the legacy 6-item order) does
  // not include these slugs, so they never render in the existing
  // chip grid.
  aufstockung: HouseEFH,
  anbau: HouseEFH,
  sonstige: MoreDots,
}

export function IntentIcon({ intent, className }: { intent: Intent; className?: string }) {
  const Icon = REGISTRY[intent]
  return <Icon className={className} />
}
