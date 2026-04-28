// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #75 — Footer right column
//
// Right-side cluster of the unified footer band:
//
//   Cockpit öffnen ↗
//   M 1:100 ├──■──┤
//   ≈ 313K Tokens · 1,17 USD
//
// The Open-cockpit link is a quick route to /overview (mirrors the
// left column's secondary entry; the data-side of the workspace has its
// own affordance for users who naturally look right). Scale bar +
// cost ticker live here permanently — they were idle decoration in
// the right rail body and now anchor the band.
// ───────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import type { MessageRow, ProjectRow } from '@/types/db'
import { CostTicker } from '../CostTicker'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
}

export function FooterRightColumn({ project, messages }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-end gap-2 min-w-0 text-right">
      <Link
        to={`/projects/${project.id}/overview`}
        className="inline-flex items-center gap-1 text-[13px] text-ink/75 hover:text-ink transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        <span>
          {t('chat.footer.cockpitSecondary', {
            defaultValue: 'Cockpit öffnen',
          })}
        </span>
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </Link>

      <FooterScaleBar />

      <div className="self-end w-full max-w-[200px]">
        <CostTicker messages={messages} />
      </div>
    </div>
  )
}

/**
 * A compact scale-bar variant for the unified footer's right column.
 * The full atelier scale-bar lives in #78's `<ScaleBar>` extraction —
 * here we render the inline version that already lived in IntentAxonometric.
 */
function FooterScaleBar() {
  return (
    <div className="inline-flex items-center gap-2 text-clay/72 leading-none select-none">
      <span className="font-serif italic text-[11px] tabular-figures">
        M&nbsp;1:100
      </span>
      <svg
        width="78"
        height="10"
        viewBox="0 0 78 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="3" y1="6" x2="68" y2="6" />
        <line x1="3" y1="2.5" x2="3" y2="9" />
        <line x1="19.25" y1="4" x2="19.25" y2="8" />
        <line x1="35.5" y1="2.5" x2="35.5" y2="9" />
        <line x1="51.75" y1="4" x2="51.75" y2="8" />
        <line x1="68" y1="2.5" x2="68" y2="9" />
        <rect
          x="3"
          y="5"
          width="16.25"
          height="2"
          fill="currentColor"
          stroke="none"
          fillOpacity="0.6"
        />
      </svg>
    </div>
  )
}
