import { useEffect, useState } from 'react'

interface Tab {
  id: string
  numeral: string
  label: string
}

interface Props {
  tabs: Tab[]
}

/**
 * Phase 3.2 #44 — paper-tab navigation strip across the top of the
 * project binder (overview page).
 *
 * Each tab renders as a small flat-top paper "ear" with a Roman
 * numeral above an uppercase tracked label. Click → smooth-scroll
 * to the section's anchor. As the page scrolls, the closest section
 * to the top of the viewport is marked active — the active tab gets
 * a 2px clay underline; idle tabs get a thin paper edge.
 *
 * The strip is rendered inside the page's sticky header by the
 * caller; we just lay out the tabs and maintain active state.
 */
export function BinderTabStrip({ tabs }: Props) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')

  useEffect(() => {
    const onScroll = () => {
      // Pick the section whose top is closest to but above ~ 120px from
      // the viewport top — the sticky header height + a small grace.
      const offset = 140
      let best = tabs[0]?.id ?? ''
      for (const tab of tabs) {
        const el = document.getElementById(tab.id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top - offset <= 0) best = tab.id
      }
      setActive(best)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [tabs])

  return (
    <nav
      aria-label="Project binder sections"
      className="border-b border-ink/12 -mb-px"
    >
      <ul className="flex items-end gap-px overflow-x-auto px-1 sm:px-2 scrollbar-thin">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <li key={tab.id} className="shrink-0">
              <a
                href={`#${tab.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById(tab.id)
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    setActive(tab.id)
                  }
                }}
                className={
                  'group relative flex flex-col items-center gap-1 px-4 pt-3 pb-2 min-w-[88px] text-center transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background ' +
                  (isActive
                    ? 'bg-paper text-ink'
                    : 'bg-paper-tinted text-ink/55 hover:text-ink hover:bg-paper')
                }
                style={{
                  clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 100%, 0 100%)',
                }}
              >
                {/* Top hairline + side hairlines for paper-tab edge */}
                <span
                  aria-hidden="true"
                  className={
                    'absolute inset-x-2 top-0 h-px ' +
                    (isActive ? 'bg-ink/35' : 'bg-ink/15')
                  }
                />
                <span className="font-serif italic text-[11px] text-clay-deep tabular-figures leading-none">
                  {tab.numeral}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] leading-none">
                  {tab.label}
                </span>
                {/* Active indicator — clay underline at the bottom of the tab */}
                <span
                  aria-hidden="true"
                  className={
                    'absolute inset-x-2 bottom-0 h-px transition-colors duration-soft ' +
                    (isActive ? 'bg-clay' : 'bg-transparent')
                  }
                />
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
