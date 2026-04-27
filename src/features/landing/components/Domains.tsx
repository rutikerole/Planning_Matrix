import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Picture } from '@/components/shared/Picture'
import { DomainAVisual } from '../visuals/DomainAVisual'
import { DomainBVisual } from '../visuals/DomainBVisual'
import { DomainCVisual } from '../visuals/DomainCVisual'

type TabKey = 'A' | 'B' | 'C'

interface TabDef {
  key: TabKey
  i18nLabel: string
  i18nTitle: string
  i18nQuestion: string
  i18nBody: string
}

const TABS: TabDef[] = [
  {
    key: 'A',
    i18nLabel: 'domains.tabAlabel',
    i18nTitle: 'domains.tabAtitle',
    i18nQuestion: 'domains.tabAquestion',
    i18nBody: 'domains.tabAbody',
  },
  {
    key: 'B',
    i18nLabel: 'domains.tabBlabel',
    i18nTitle: 'domains.tabBtitle',
    i18nQuestion: 'domains.tabBquestion',
    i18nBody: 'domains.tabBbody',
  },
  {
    key: 'C',
    i18nLabel: 'domains.tabClabel',
    i18nTitle: 'domains.tabCtitle',
    i18nQuestion: 'domains.tabCquestion',
    i18nBody: 'domains.tabCbody',
  },
]

const VISUALS: Record<TabKey, React.ReactNode> = {
  A: <DomainAVisual />,
  B: <DomainBVisual />,
  C: <DomainCVisual />,
}

const BACKDROP_STEMS: Record<TabKey, string> = {
  A: 'domain-a-aerial',
  B: 'domain-b-facade',
  C: 'domain-c-heritage',
}

export function Domains() {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState<TabKey>('A')
  const reduced = useReducedMotion()

  const triggersRef = useRef<Record<TabKey, HTMLButtonElement | null>>({
    A: null,
    B: null,
    C: null,
  })
  const [bounds, setBounds] = useState<{ x: number; width: number }>({
    x: 0,
    width: 0,
  })
  const [bootstrapped, setBootstrapped] = useState(false)

  useLayoutEffect(() => {
    const measure = () => {
      const el = triggersRef.current[active]
      if (el) {
        setBounds({ x: el.offsetLeft, width: el.offsetWidth })
        setBootstrapped(true)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, i18n.resolvedLanguage])

  const activeTab = TABS.find((tab) => tab.key === active) ?? TABS[0]

  return (
    <Section id="domains" bordered className="isolate">
      {/* Three per-tab backdrops, cross-fading on tab change */}
      {(['A', 'B', 'C'] as TabKey[]).map((key) => (
        <div
          key={key}
          aria-hidden="true"
          className={cn(
            'absolute inset-0 -z-10 overflow-hidden pointer-events-none transition-opacity duration-1000 ease-out',
            active === key ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Picture
            stem={BACKDROP_STEMS[key]}
            alt=""
            loading="lazy"
            sizes="100vw"
            className="absolute inset-0 w-full h-full"
            imgClassName="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-paper" style={{ opacity: 0.88 }} />
        </div>
      ))}

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
              className="relative flex flex-wrap gap-x-1 gap-y-2 border-b border-border"
            >
              {TABS.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.key}
                  value={tab.key}
                  ref={(el) => {
                    triggersRef.current[tab.key] = el
                  }}
                  id={`domain-tab-${tab.key}`}
                  aria-controls={`domain-panel-${tab.key}`}
                  className={cn(
                    'relative inline-flex items-center px-1 sm:px-2 py-4 text-sm md:text-[15px] font-medium tracking-tight transition-colors duration-soft mr-4 sm:mr-8 rounded-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    active === tab.key
                      ? 'text-ink'
                      : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  {t(tab.i18nLabel)}
                </TabsPrimitive.Trigger>
              ))}

              {bootstrapped &&
                (reduced ? (
                  <span
                    aria-hidden="true"
                    style={{ left: bounds.x, width: bounds.width }}
                    className="pointer-events-none absolute -bottom-px h-[2px] bg-clay"
                  />
                ) : (
                  <m.span
                    aria-hidden="true"
                    initial={false}
                    animate={{ x: bounds.x, width: bounds.width }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none absolute left-0 -bottom-px h-[2px] bg-clay"
                  />
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
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-10 items-start">
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

                      {/* BauGB section chips — Tab A only, real statute references */}
                      {active === 'A' && (
                        <ul className="flex flex-wrap gap-2 mt-9">
                          {[30, 31, 32, 33, 34, 35].map((n, i) => (
                            <m.li
                              key={n}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.35,
                                delay: 0.45 + i * 0.08,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="inline-flex items-center text-[12px] font-medium tracking-tight text-clay border border-clay/45 px-2.5 py-1 rounded-sm tabular-nums"
                            >
                              § {n} BauGB
                            </m.li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="lg:col-span-5 flex justify-center lg:justify-end">
                      {VISUALS[active]}
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
