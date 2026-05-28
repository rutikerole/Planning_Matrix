// Bucket A.2 — chat-UI preliminary banner for stub states.
//
// Renders above the chat message stream when the project's bundesland has
// a thin state-block (11 of 16 states; see hasSubstantiveStateBlock in
// src/legal/demoCoverage.ts). Persistent (no dismiss) because the state
// IS preliminary for the entire session. Single inline div following the
// RecoveryBanner pattern (mx-auto / max-w-2xl / bg-paper-card), not the
// fixed-top OfflineBanner pattern. data-no-print so PDF rendering does
// not capture it.

import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { hasSubstantiveStateBlock } from '@/legal/demoCoverage'
import { getStateCitations } from '@/legal/stateCitations'

interface Props {
  bundesland: string | null | undefined
}

export function PreliminaryStateBanner({ bundesland }: Props) {
  const { t, i18n } = useTranslation()

  if (!bundesland) return null
  if (hasSubstantiveStateBlock(bundesland)) return null

  // Resolve the human label so the banner names the bundesland. getStateCitations
  // normalises internally and falls back to an honest stub on unknown codes,
  // so no try/catch needed.
  const pack = getStateCitations(bundesland)
  const label = i18n.language === 'en' ? pack.labelEn : pack.labelDe

  return (
    <div
      role="note"
      className={cn(
        'mx-auto my-3 max-w-2xl flex items-start gap-3 px-4 py-3',
        'bg-paper-card border border-clay/40 rounded-[8px]',
        'text-[12.5px] leading-snug text-clay/85 italic font-serif',
      )}
      data-no-print="true"
    >
      <Info aria-hidden="true" className="size-3.5 text-clay mt-0.5 shrink-0" />
      <p className="flex-1">
        {t('chat.banner.preliminaryState', { bundesland: label })}
      </p>
    </div>
  )
}
