import type { WorkspaceTabId } from '../hooks/useTabState'

interface Props {
  id: WorkspaceTabId
  active: boolean
}

/**
 * Phase 8 — small line-art glyphs for the tab bar. Match the brief's
 * sketches: filled circle in ring (overview), square + line (legal),
 * stepped diagram (procedure), two overlapping circles (team), upward
 * chart (cost), star outline (suggestions), data-flow nodes (expert).
 *
 * Sized 14×14, currentColor so the parent's text-color drives them.
 */
export function TabIcon({ id, active }: Props) {
  const stroke = 1.2
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 14 14',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (id === 'overview') {
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="5" />
        <circle cx="7" cy="7" r="2" fill={active ? 'currentColor' : 'none'} />
      </svg>
    )
  }
  if (id === 'legal') {
    return (
      <svg {...common}>
        <rect x="2.5" y="2.5" width="9" height="9" rx="0.5" />
        <line x1="4" y1="7" x2="10" y2="7" />
      </svg>
    )
  }
  if (id === 'procedure') {
    return (
      <svg {...common}>
        <rect x="1.5" y="9" width="3" height="3.5" />
        <rect x="5.5" y="6" width="3" height="6.5" />
        <rect x="9.5" y="3" width="3" height="9.5" />
      </svg>
    )
  }
  if (id === 'team') {
    return (
      <svg {...common}>
        <circle cx="5" cy="7" r="3" />
        <circle cx="9" cy="7" r="3" />
      </svg>
    )
  }
  if (id === 'cost') {
    return (
      <svg {...common}>
        <polyline points="2,11 5,8 8,9 12,3" />
        <polyline points="9,3 12,3 12,6" />
      </svg>
    )
  }
  if (id === 'suggestions') {
    return (
      <svg {...common}>
        <path d="M 7 2 L 8.4 5.4 L 12 5.7 L 9.2 8.1 L 10 11.6 L 7 9.8 L 4 11.6 L 4.8 8.1 L 2 5.7 L 5.6 5.4 Z" />
      </svg>
    )
  }
  // expert / data-flow
  return (
    <svg {...common}>
      <circle cx="3" cy="7" r="1.5" />
      <circle cx="11" cy="3.5" r="1.5" />
      <circle cx="11" cy="10.5" r="1.5" />
      <line x1="4.4" y1="6.4" x2="9.6" y2="4.1" />
      <line x1="4.4" y1="7.6" x2="9.6" y2="9.9" />
    </svg>
  )
}
