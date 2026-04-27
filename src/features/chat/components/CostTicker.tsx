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
 * Polish Move 7 — italic margin annotation cost ticker. Right-aligned,
 * no border, no fill, no card chrome. Hand-pencilled tone. German
 * number formatting (period thousands, comma decimal). Hover surfaces
 * a small breakdown tooltip — input / output / cache read / cache write.
 *
 * Visible only when the active user's email is in ADMIN_EMAILS (D3).
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
    <div className="relative group self-end">
      <p className="text-[9px] text-clay/70 italic tabular-nums text-right cursor-default">
        ≈ {formatTokensDe(tokens)} Tokens · {formatUsdDe(usd)}
      </p>
      <div className="hidden group-hover:flex group-focus-within:flex absolute right-0 bottom-full mb-2 w-60 flex-col gap-1.5 bg-paper border border-border-strong/45 rounded-sm px-3 py-2.5 shadow-[0_8px_24px_-8px_hsl(220_15%_11%/0.22)] z-20">
        <p className="text-[10px] uppercase tracking-[0.16em] text-clay/85 mb-1">
          {t('chat.cost.breakdown')}
        </p>
        <Row label={t('chat.cost.input')} value={formatTokensDe(totals.inputTokens)} />
        <Row label={t('chat.cost.output')} value={formatTokensDe(totals.outputTokens)} />
        <Row
          label={t('chat.cost.cacheRead')}
          value={formatTokensDe(totals.cacheReadTokens)}
        />
        <Row
          label={t('chat.cost.cacheWrite')}
          value={formatTokensDe(totals.cacheWriteTokens)}
        />
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
