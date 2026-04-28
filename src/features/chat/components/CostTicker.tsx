import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { isAdminEmail } from '@/lib/cn-feature-flags'
import {
  estimateUsd,
  formatTokensDe,
  formatUsdDe,
  totalTokens,
  type CostBreakdown,
} from '@/lib/costFormat'
import type { MessageRow } from '@/types/db'

interface Props {
  messages: MessageRow[]
}

/**
 * Phase 3.2 #40 — cost ticker as a scale-bar flourish at the bottom
 * of the right rail.
 *
 * Visual: a small horizontal bar with five tick marks (mirrors the
 * M 1:100 scale bar at the head of the rail), with token + USD
 * totals printed in font-serif italic clay below the bar in a
 * pencilled register. Hover surfaces the per-channel breakdown.
 *
 * Visible only when the active user's email is admin (D3).
 */
export function CostTicker({ messages }: Props) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const totals = useMemo<CostBreakdown>(() => {
    const acc: CostBreakdown = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }
    for (const m of messages) {
      if (m.role !== 'assistant') continue
      acc.inputTokens += m.input_tokens ?? 0
      acc.outputTokens += m.output_tokens ?? 0
      acc.cacheReadTokens += m.cache_read_tokens ?? 0
      acc.cacheWriteTokens += m.cache_write_tokens ?? 0
    }
    return acc
  }, [messages])

  if (!isAdminEmail(user?.email)) return null

  const tokens = totalTokens(totals)
  const usd = estimateUsd(totals)

  return (
    <div className="relative group flex flex-col gap-1.5 self-stretch border-t border-border/40 pt-4 mt-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[9px] uppercase tracking-[0.18em] text-clay/65">
          {t('chat.rail.cost')}
        </span>
        <span className="font-serif italic text-[9px] text-clay/55 tabular-figures">
          M&nbsp;1:1
        </span>
      </div>
      {/* Architect-drawing scale-bar style flourish */}
      <svg
        viewBox="0 0 200 12"
        className="w-full h-3 text-clay/70"
        aria-hidden="true"
      >
        <line x1="2" y1="7" x2="198" y2="7" stroke="currentColor" strokeWidth="0.8" />
        {[2, 51, 100, 149, 198].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1={i % 2 === 0 ? 3 : 4.5}
            x2={x}
            y2={i % 2 === 0 ? 11 : 9.5}
            stroke="currentColor"
            strokeWidth="0.8"
          />
        ))}
        {/* Filled first segment to anchor "0–end" reading */}
        <rect
          x="2"
          y="6"
          width="49"
          height="2"
          fill="currentColor"
          stroke="none"
          fillOpacity="0.55"
        />
      </svg>
      <p className="font-serif italic text-[10px] text-clay/85 tabular-figures cursor-default text-right leading-snug">
        ≈ {formatTokensDe(tokens)} Tokens · {formatUsdDe(usd)}
      </p>

      {/* Breakdown popover */}
      <div className="hidden group-hover:flex group-focus-within:flex absolute right-0 bottom-full mb-2 w-60 flex-col gap-1.5 bg-paper border border-border-strong/45 rounded-sm px-3 py-2.5 shadow-[0_8px_24px_-8px_hsl(220_15%_11%/0.22)] z-20">
        <p className="text-[10px] uppercase tracking-[0.22em] text-clay/85 mb-1">
          {t('chat.cost.breakdown')}
        </p>
        <Row label={t('chat.cost.input')} value={formatTokensDe(totals.inputTokens)} />
        <Row label={t('chat.cost.output')} value={formatTokensDe(totals.outputTokens)} />
        <Row label={t('chat.cost.cacheRead')} value={formatTokensDe(totals.cacheReadTokens)} />
        <Row label={t('chat.cost.cacheWrite')} value={formatTokensDe(totals.cacheWriteTokens)} />
        <span aria-hidden="true" className="block h-px bg-border-strong/40 my-1" />
        <Row label={t('chat.cost.usd')} value={formatUsdDe(usd)} bold />
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between items-baseline text-[11px] tabular-nums">
      <span className="text-ink/65">{label}</span>
      <span className={bold ? 'text-ink font-medium' : 'text-ink/85'}>{value}</span>
    </div>
  )
}
