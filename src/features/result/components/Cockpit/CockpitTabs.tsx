// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — Linear-style tab strip
//
// Hairline-bottom border. Active tab gets a 2 px ink underline; the
// rest are ink/55 and lift to ink on hover. Optional count badge per
// tab. Horizontal-scrolls on narrow viewports without showing a
// scrollbar.
// ───────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils'

export interface CockpitTab<TId extends string = string> {
  id: TId
  label: string
  count?: number
}

interface Props<TId extends string = string> {
  tabs: CockpitTab<TId>[]
  active: TId
  onChange: (id: TId) => void
}

export function CockpitTabs<TId extends string = string>({
  tabs,
  active,
  onChange,
}: Props<TId>) {
  return (
    <div className="border-b border-ink/12 bg-paper/95">
      <div
        role="tablist"
        aria-label="Cockpit"
        className="mx-auto max-w-[1200px] px-2 sm:px-4 flex items-stretch gap-1 overflow-x-auto pm-chip-row"
        style={{ scrollbarWidth: 'none' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative inline-flex items-baseline gap-2 px-3 sm:px-4 py-2.5 text-[12.5px] whitespace-nowrap',
                'transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                isActive
                  ? 'text-ink font-medium'
                  : 'text-ink/55 hover:text-ink',
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={cn(
                    'tabular-nums text-[10.5px]',
                    isActive ? 'text-clay' : 'text-ink/40',
                  )}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 -bottom-px h-[2px] bg-ink"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
