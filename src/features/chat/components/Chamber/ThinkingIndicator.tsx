// Phase 7 Chamber — ThinkingIndicator placeholder. Real in commit 19.

import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import { ChamberSigil } from '../../lib/specialistSigils'
import type { Specialist } from '@/types/projectState'

export function ThinkingIndicator() {
  const { t } = useTranslation()
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const specialist = useChatStore((s) => s.currentSpecialist) as Specialist | null
  const label = useChatStore((s) => s.currentThinkingLabel)
  if (!isThinking) return null
  return (
    <article role="status" aria-live="polite" className="flex items-center gap-3 py-2">
      <span style={{ color: 'hsl(var(--clay))' }}>
        <ChamberSigil specialist={specialist ?? 'moderator'} size={20} />
      </span>
      <p className="font-serif italic text-[15px] text-ink-soft">
        {label ?? t('chat.chamber.thinkingFallback', { specialist: specialist ?? 'Team' })}
      </p>
    </article>
  )
}
