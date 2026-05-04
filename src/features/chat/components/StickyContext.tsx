// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 2 — Sticky context header (anti-scroll-loss device)
//
// A thin sticky banner that surfaces only when the user has scrolled
// past the latest assistant turn's spec-tag. Reminds them which
// specialist is speaking + what the topic is, with a "back to live"
// affordance that smooth-scrolls the spec-tag back to ~90 px below
// viewport top (matching Move 6's smart auto-scroll target).
//
// IntersectionObserver target: the article's `id="spec-tag-<msgid>"`
// (set in MessageAssistant). rootMargin = -90 px shifts the effective
// viewport top to y=90 so the trigger fires once the spec-tag has
// crossed the same line that auto-scroll uses as the "live edge."
// `boundingClientRect.top < 0` further requires the spec-tag to have
// scrolled completely above the unmodified viewport, so the banner
// only shows when the user is genuinely past the live edge — never
// while the spec-tag is partially visible.
//
// Hidden:
//   • Conversations under 3 turns (edge case 46) — too noisy.
//   • Mobile (renders via MobileChatWorkspace, separate component).
//
// Reduced-motion: opacity-only fade, no slide.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/types/db'

interface Props {
  messages: MessageRow[]
}

const SHOW_AT_TURNS = 3

export function StickyContext({ messages }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(false)

  // Latest persisted assistant message — drives both the IO target id
  // and the rendered specialist + topic text.
  let latestAssistant: MessageRow | null = null
  let assistantCount = 0
  for (const m of messages) {
    if (m.role === 'assistant') {
      latestAssistant = m
      assistantCount += 1
    }
  }
  const liveAnchorId = latestAssistant ? `spec-tag-${latestAssistant.id}` : null

  // The setVisible(false) early-return is "react to external signal" — the
  // anchor id is owned by the persisted-messages cache, not React state.
  // Same pattern used by ThinkingIndicator + BereichePlanSection.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!liveAnchorId || assistantCount < SHOW_AT_TURNS) {
      setVisible(false)
      return
    }
    const target = document.getElementById(liveAnchorId)
    if (!target) {
      setVisible(false)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Show only when the spec-tag has scrolled completely above the
        // unmodified viewport (top < 0) AND is no longer intersecting
        // the rootMargin-shifted region. Partial visibility = hide.
        const shouldShow =
          !entry.isIntersecting && entry.boundingClientRect.top < 0
        setVisible(shouldShow)
      },
      { rootMargin: '-90px 0px 0px 0px', threshold: 0 },
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [liveAnchorId, assistantCount])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!latestAssistant || assistantCount < SHOW_AT_TURNS) return null

  const specialist = latestAssistant.specialist
  const specialistLabel = specialist
    ? t(`chat.specialists.${specialist}`, { defaultValue: specialist })
    : ''
  const text =
    lang === 'en' && latestAssistant.content_en
      ? latestAssistant.content_en
      : latestAssistant.content_de
  const topicLine = deriveTopicLine(text)

  const onBackToLive = () => {
    if (!liveAnchorId) return
    const el = document.getElementById(liveAnchorId)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const target = window.scrollY + rect.top - 90
    window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={t('chat.stickyCtx.label', {
        defaultValue: 'Current discussion context',
      })}
      className={cn(
        // Hidden on mobile — MobileChatWorkspace doesn't share this
        // sticky scroll context. Desktop only for v1.
        'hidden lg:flex sticky top-[70px] z-20 mx-0 px-4 py-2.5',
        'items-center gap-3',
        'bg-paper-card border border-hairline rounded-[4px]',
        'shadow-[0_1px_0_rgba(26,22,18,0.03),0_6px_24px_-8px_rgba(26,22,18,0.08)]',
        reduced
          ? 'transition-opacity duration-[220ms] ease-ease'
          : 'transition-[opacity,transform] duration-[220ms] ease-ease',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none',
      )}
    >
      <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-clay shrink-0">
        <span
          aria-hidden="true"
          className="block w-1.5 h-1.5 rounded-full bg-clay pm-sticky-ctx-pulse"
        />
        {specialistLabel}
      </span>
      <span className="flex-1 min-w-0 font-serif italic text-sm text-ink-soft truncate">
        {topicLine}
      </span>
      <button
        type="button"
        onClick={onBackToLive}
        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] tracking-[0.08em] uppercase text-ink-mute border border-hairline rounded-[2px] bg-transparent transition-colors duration-[180ms] ease-ease hover:text-clay hover:border-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span aria-hidden="true">↓</span>
        <span>
          {t('chat.stickyCtx.backToLive', { defaultValue: 'back to live' })}
        </span>
      </button>
      <style>{`
        @keyframes pmStickyCtxPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(0.85); }
        }
        .pm-sticky-ctx-pulse {
          animation: pmStickyCtxPulse 1.6s cubic-bezier(0.32, 0.72, 0, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pm-sticky-ctx-pulse { animation: none; }
        }
      `}</style>
    </div>
  )
}

/**
 * Pulls a short topic line out of the assistant's last message body.
 *
 * Preference order: first sentence ending in `?` (the model's question),
 * then first sentence ending in `.` or `!`, then a 140-char clamp.
 * The visible text is also CSS-truncated via `truncate`, so the
 * derivation is just an upper bound to keep the DOM lean.
 */
function deriveTopicLine(text: string): string {
  const trimmed = text.trim()
  const qMatch = trimmed.match(/^[^?]{2,300}\?/)
  if (qMatch) return qMatch[0].trim()
  const sentenceMatch = trimmed.match(/^[^.!]{2,300}[.!]/)
  if (sentenceMatch) return sentenceMatch[0].trim()
  return trimmed.length > 140 ? `${trimmed.slice(0, 138)}…` : trimmed
}
