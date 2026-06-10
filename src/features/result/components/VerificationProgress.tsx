import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import type { ProjectState } from '@/types/projectState'
import { computeVerificationRollup } from '../lib/verificationRollup'

/**
 * C8 (Bug 33) — project-wide verification progress indicator.
 *
 * Renders "{verified} of {total} items verified by an architect" while
 * any item is pending, and an affirmative "All items architect-verified ·
 * {date}" once the rollup clears. No architect name (not available in
 * state under RLS — date only, never fabricated). Hidden when there are
 * no qualifier-bearing items.
 */
export function VerificationProgress({
  state,
  variant = 'pill',
}: {
  state: Partial<ProjectState>
  /** feat/result-spine-layout — 'rail' renders the document-spine
   *  split layout (large "n / m" + mono caption). The original
   *  full-sentence `progress` key is NOT orphaned: it becomes the rail
   *  block's accessible name (aria-label + title). */
  variant?: 'pill' | 'rail'
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const rollup = computeVerificationRollup(state)

  if (rollup.total === 0) return null

  if (variant === 'rail' && !rollup.allVerified) {
    const sentence = t('result.workspace.verification.progress', {
      verified: rollup.verified,
      total: rollup.total,
    })
    return (
      <div aria-label={sentence} title={sentence} className="flex items-baseline gap-2 spine:block">
        <p
          aria-hidden="true"
          className="font-serif italic text-[16px] spine:text-[26px] text-ink leading-none tabular-nums"
        >
          {rollup.verified} / {rollup.total}
        </p>
        <p
          aria-hidden="true"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-clay leading-snug spine:mt-1.5"
        >
          {t('result.workspace.verification.railCaption')}
        </p>
      </div>
    )
  }

  if (rollup.allVerified) {
    const date = rollup.lastVerifiedAt
      ? new Date(rollup.lastVerifiedAt).toLocaleDateString(
          lang === 'en' ? 'en-GB' : 'de-DE',
          { day: '2-digit', month: 'long', year: 'numeric' },
        )
      : ''
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-700/[0.06] px-3 py-1.5">
        <Check aria-hidden="true" className="size-3.5 text-emerald-700" />
        <span className="text-[12px] text-emerald-800">
          {t('result.workspace.verification.allVerified', { date })}
        </span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-clay/30 bg-clay/[0.05] px-3 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clay">
        {t('result.workspace.verification.progress', {
          verified: rollup.verified,
          total: rollup.total,
        })}
      </span>
    </div>
  )
}
