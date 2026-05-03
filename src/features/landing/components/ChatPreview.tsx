import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionHead, FadeRise } from './shared'
import { getChatScript, type Specialist } from '../lib/chatScript'
import { useChatSequence, type AreaState } from '../hooks/useChatSequence'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

const EASE = [0.16, 1, 0.3, 1] as const

const SPECIALIST_TONE: Record<Specialist, string> = {
  moderator: 'text-pm-ink-soft',
  planungsrecht: 'text-pm-clay',
  bauordnungsrecht: 'text-pm-clay',
  sonstige: 'text-pm-clay',
  verfahren: 'text-pm-clay-deep',
}

export function ChatPreview() {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotionPref()
  const lang: 'de' | 'en' = i18n.language.startsWith('en') ? 'en' : 'de'
  const steps = useMemo(() => getChatScript(lang), [lang])
  const snap = useChatSequence(steps, reduce)

  return (
    <section id="chat" className="relative bg-pm-paper-soft py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow={t('landing.chat.eyebrow')}
          l1={t('landing.chat.h.l1')}
          l2={t('landing.chat.h.l2')}
          sub={t('landing.chat.sub')}
          align="left"
          maxWidth="max-w-3xl"
        />

        <div
          className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px] lg:gap-12"
          aria-live="off"
        >
          {/* Left — chat thread surface */}
          <FadeRise>
            <div className="border border-pm-hair bg-pm-paper p-6 lg:p-8">
              <div className="mb-6 flex items-center justify-between border-b border-pm-hair pb-4">
                <span className="font-sans text-[13px] text-pm-ink-mid">
                  {t('landing.chat.title')}
                </span>
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-pm-sage">
                  <span className="h-1.5 w-1.5 rounded-full bg-pm-sage animate-pm-blink-soft" />
                  Live
                </span>
              </div>

              <div className="flex min-h-[480px] flex-col gap-5">
                <AnimatePresence mode="popLayout">
                  {snap.messages.map((m) => (
                    <motion.div
                      key={m.id}
                      layout
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0.1 : 0.32, ease: EASE }}
                      className={
                        m.role === 'user'
                          ? 'max-w-[80%] self-end'
                          : 'max-w-[92%]'
                      }
                    >
                      {m.role === 'user' ? (
                        <div className="border border-pm-hair bg-pm-paper-tint px-4 py-2 text-[15px] text-pm-ink">
                          {m.text}
                        </div>
                      ) : (
                        <div>
                          <div
                            className={`mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] ${
                              SPECIALIST_TONE[m.specialist] ?? 'text-pm-clay'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {t(`landing.chat.specialists.${m.specialist}`)}
                          </div>
                          <p className="text-[15px] leading-relaxed text-pm-ink">
                            {m.text}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {snap.typing ? (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3"
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-pm-ink-mute2">
                        {t(`landing.chat.specialists.${snap.typing}`)}
                      </span>
                      <span className="flex gap-1" aria-hidden>
                        <span className="h-1 w-1 rounded-full bg-pm-clay animate-pm-blink-soft" />
                        <span
                          className="h-1 w-1 rounded-full bg-pm-clay animate-pm-blink-soft"
                          style={{ animationDelay: '0.2s' }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-pm-clay animate-pm-blink-soft"
                          style={{ animationDelay: '0.4s' }}
                        />
                      </span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Decorative input bar */}
              <div className="mt-6 border-b border-pm-hair pb-2 pt-4">
                <input
                  type="text"
                  disabled
                  placeholder={t('landing.chat.input.placeholder') as string}
                  className="w-full cursor-not-allowed border-none bg-transparent text-[14px] text-pm-ink-mute2 outline-none placeholder:text-pm-ink-mute2"
                />
              </div>

              {reduce ? (
                <button
                  type="button"
                  onClick={() => snap.replay()}
                  className="mt-4 font-mono text-[11px] uppercase tracking-wide text-pm-clay hover:text-pm-clay-deep"
                >
                  {t('landing.chat.replay')}
                </button>
              ) : null}
            </div>
          </FadeRise>

          {/* Right — live matrix panel */}
          <FadeRise delay={0.15}>
            <aside className="border border-pm-hair bg-pm-paper-tint p-6 lg:sticky lg:top-28">
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
                {t('landing.matrix.areas.label')}
              </div>
              <ul className="space-y-2.5">
                {(['A', 'B', 'C'] as const).map((area) => (
                  <AreaRow
                    key={area}
                    state={snap.areas[area]}
                    label={t(`landing.matrix.areas.${area.toLowerCase()}`)}
                  />
                ))}
              </ul>

              <div className="mt-6 border-t border-pm-hair pt-6">
                <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
                  {t('landing.matrix.recs.label')}
                </div>
                <ol className="list-none space-y-3">
                  <AnimatePresence>
                    {snap.recommendations.map((r, i) => (
                      <motion.li
                        key={r.id}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduce ? 0.1 : 0.3, ease: EASE }}
                        className="flex items-baseline gap-3"
                      >
                        <span className="font-mono text-[12px] text-pm-clay">
                          0{i + 1}
                        </span>
                        <div>
                          <div className="font-serif text-[15px] text-pm-ink">
                            {r.title}
                          </div>
                          <div className="mt-0.5 text-[12px] text-pm-ink-mid">
                            {r.detail}
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
                {snap.recommendations.length === 0 ? (
                  <div className="text-[12px] italic text-pm-ink-mute2">
                    …
                  </div>
                ) : null}
              </div>
            </aside>
          </FadeRise>
        </div>
      </div>
    </section>
  )
}

function AreaRow({ state, label }: { state: AreaState; label: string }) {
  let dot: React.ReactNode
  if (state === 'ACTIVE') {
    dot = <span className="block h-2 w-2 rounded-full bg-pm-clay" />
  } else if (state === 'PENDING') {
    dot = <span className="block h-2 w-2 rounded-full border border-pm-clay" />
  } else {
    dot = (
      <span className="block h-2 w-2 rounded-full bg-pm-ink-mute2 opacity-60" />
    )
  }
  return (
    <li className="flex items-center gap-3">
      <motion.span
        initial={false}
        animate={{ scale: state === 'ACTIVE' ? [1, 1.4, 1] : 1 }}
        transition={{ duration: 0.4 }}
        aria-hidden
      >
        {dot}
      </motion.span>
      <span
        className={`font-sans text-[13px] transition-colors ${
          state === 'ACTIVE' ? 'text-pm-ink' : 'text-pm-ink-mid'
        }`}
      >
        {label}
      </span>
    </li>
  )
}
