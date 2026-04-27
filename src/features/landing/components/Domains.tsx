import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'

type TabKey = 'A' | 'B' | 'C'

interface TabDef {
  key: TabKey
  i18nLabel: string
  i18nTitle: string
  i18nQuestion: string
  i18nBody: string
  chips: string[]
}

const TABS: TabDef[] = [
  {
    key: 'A',
    i18nLabel: 'domains.tabAlabel',
    i18nTitle: 'domains.tabAtitle',
    i18nQuestion: 'domains.tabAquestion',
    i18nBody: 'domains.tabAbody',
    chips: [
      'domains.tabAchipOne',
      'domains.tabAchipTwo',
      'domains.tabAchipThree',
      'domains.tabAchipFour',
    ],
  },
  {
    key: 'B',
    i18nLabel: 'domains.tabBlabel',
    i18nTitle: 'domains.tabBtitle',
    i18nQuestion: 'domains.tabBquestion',
    i18nBody: 'domains.tabBbody',
    chips: [
      'domains.tabBchipOne',
      'domains.tabBchipTwo',
      'domains.tabBchipThree',
      'domains.tabBchipFour',
    ],
  },
  {
    key: 'C',
    i18nLabel: 'domains.tabClabel',
    i18nTitle: 'domains.tabCtitle',
    i18nQuestion: 'domains.tabCquestion',
    i18nBody: 'domains.tabCbody',
    chips: [
      'domains.tabCchipOne',
      'domains.tabCchipTwo',
      'domains.tabCchipThree',
      'domains.tabCchipFour',
    ],
  },
]

export function Domains() {
  const { t } = useTranslation()
  const [active, setActive] = useState<TabKey>('A')
  const reduced = useReducedMotion()

  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0]

  return (
    <Section id="domains" bordered>
      <Container>
        <SectionHeader
          eyebrow={t('domains.eyebrow')}
          heading={t('domains.heading')}
          sub={t('domains.subheading')}
        />

        <div className="mt-16 md:mt-20">
          <TabsPrimitive.Root
            value={active}
            onValueChange={(v) => setActive(v as TabKey)}
          >
            <TabsPrimitive.List
              aria-label={t('domains.heading')}
              className="flex flex-wrap gap-x-1 gap-y-2 border-b border-border"
            >
              {TABS.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.key}
                  value={tab.key}
                  id={`domain-tab-${tab.key}`}
                  aria-controls={`domain-panel-${tab.key}`}
                  className={cn(
                    'group relative inline-flex items-center px-1 sm:px-2 py-4 text-sm md:text-[15px] font-medium tracking-tight transition-colors duration-soft',
                    'mr-4 sm:mr-8',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm',
                    active === tab.key
                      ? 'text-ink'
                      : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  <span>{t(tab.i18nLabel)}</span>
                  {active === tab.key &&
                    (reduced ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px] bg-clay"
                      />
                    ) : (
                      <m.span
                        layoutId="domain-tab-indicator"
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px] bg-clay"
                        transition={{
                          duration: 0.45,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    ))}
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>

            <div
              role="tabpanel"
              id={`domain-panel-${active}`}
              aria-labelledby={`domain-tab-${active}`}
              className="pt-12 md:pt-16 lg:pt-20 min-h-[28rem]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={active}
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-12">
                    <div className="lg:col-span-7">
                      <h3 className="font-display text-display-3 text-ink leading-[1.02] mb-6">
                        {t(activeTab.i18nTitle)}
                      </h3>
                      <p className="font-display italic text-title md:text-title-lg text-clay mb-8 leading-snug max-w-2xl">
                        {t(activeTab.i18nQuestion)}
                      </p>
                      <p className="text-body-lg md:text-body-xl text-muted-foreground leading-relaxed max-w-2xl">
                        {t(activeTab.i18nBody)}
                      </p>
                    </div>
                    <div className="lg:col-span-4 lg:col-start-9 flex flex-col">
                      <p className="eyebrow mb-5 inline-flex items-center text-muted-foreground/80">
                        <span className="accent-dot" aria-hidden="true" />
                        Beispiele
                      </p>
                      <ul className="flex flex-col gap-3">
                        {activeTab.chips.map((chipKey) => (
                          <li
                            key={chipKey}
                            className="inline-flex items-baseline gap-3 text-[15px] text-ink/85"
                          >
                            <span
                              className="font-display italic text-clay tabular-nums shrink-0"
                              aria-hidden="true"
                            >
                              ›
                            </span>
                            <span>{t(chipKey)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </m.div>
              </AnimatePresence>
            </div>
          </TabsPrimitive.Root>
        </div>
      </Container>
    </Section>
  )
}
