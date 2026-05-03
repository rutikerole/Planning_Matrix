import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as Tabs from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import { SectionHead, FadeRise } from './shared'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

const TAB_KEYS = ['a', 'b', 'c'] as const
type TabKey = (typeof TAB_KEYS)[number]

type RefItem = { ref: string; src: string }

export function ThinkTabs() {
  const { t } = useTranslation()
  const [active, setActive] = useState<TabKey>('a')
  const reduce = useReducedMotionPref()

  return (
    <section id="thinks" className="bg-pm-paper-soft py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between gap-8 max-md:flex-col max-md:items-start">
          <SectionHead
            eyebrow={t('landing.thinks.eyebrow')}
            l1={t('landing.thinks.h.l1')}
            l2={t('landing.thinks.h.l2')}
            sub={t('landing.thinks.sub')}
            align="left"
            maxWidth="max-w-2xl"
          />
          <div className="font-mono text-[11px] text-pm-sage">
            {t('landing.thinks.live')}
          </div>
        </div>

        <FadeRise delay={0.1} className="mt-12">
          <Tabs.Root
            value={active}
            onValueChange={(v) => setActive(v as TabKey)}
          >
            <Tabs.List
              className="relative flex gap-6 overflow-x-auto border-b border-pm-hair pb-px md:gap-8"
              aria-label="Rechtliche Perspektiven"
            >
              {TAB_KEYS.map((k) => (
                <Tabs.Trigger
                  key={k}
                  value={k}
                  className={`relative whitespace-nowrap pb-3 font-sans text-[14px] transition-colors ${
                    active === k
                      ? 'text-pm-ink'
                      : 'text-pm-ink-mid hover:text-pm-ink'
                  }`}
                >
                  {t(`landing.thinks.tab.${k}`)}
                  {active === k ? (
                    <motion.span
                      layoutId={reduce ? undefined : 'thinks-underline'}
                      transition={{
                        duration: reduce ? 0 : 0.32,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="absolute -bottom-px left-0 right-0 h-[1.5px] bg-pm-clay"
                    />
                  ) : null}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {TAB_KEYS.map((k) => (
              <Tabs.Content
                key={k}
                value={k}
                className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr]"
              >
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
                    {t('landing.thinks.questionLabel')}
                  </div>
                  <p className="mt-4 font-serif text-[clamp(1.4rem,2vw,1.75rem)] italic leading-snug text-pm-clay">
                    {t(`landing.thinks.${k}.q`)}
                  </p>
                </div>
                <div>
                  <h3 className="font-serif text-[clamp(1.5rem,2.2vw,1.875rem)] leading-tight text-pm-ink">
                    {t(`landing.thinks.${k}.h`)}
                  </h3>
                  <p className="mt-4 max-w-prose font-sans text-[16px] leading-relaxed text-pm-ink-mid">
                    {t(`landing.thinks.${k}.b`)}
                  </p>
                  <div className="mt-8">
                    <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
                      {t('landing.thinks.refsLabel')}
                    </div>
                    <RefsGrid k={k} />
                  </div>
                </div>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </FadeRise>
      </div>
    </section>
  )
}

function RefsGrid({ k }: { k: TabKey }) {
  const { t } = useTranslation()
  const raw = t(`landing.thinks.${k}.refs`, { returnObjects: true })
  const refs: RefItem[] = Array.isArray(raw) ? (raw as RefItem[]) : []
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {refs.map((r, i) => (
        <li
          key={i}
          className="border border-pm-hair p-3 transition-colors hover:bg-pm-paper-tint"
        >
          <div className="font-mono text-[12px] text-pm-clay">{r.ref}</div>
          <div className="mt-1 font-sans text-[11px] text-pm-ink-muted">
            {r.src}
          </div>
        </li>
      ))}
    </ul>
  )
}
