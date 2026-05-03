import { useTranslation } from 'react-i18next'
import * as Accordion from '@radix-ui/react-accordion'
import { SectionHead, FadeRise } from './shared'

type FaqItem = { q: string; a: string }

export function FAQ() {
  const { t } = useTranslation()
  const raw = t('landing.faq.items', { returnObjects: true })
  const items: FaqItem[] = Array.isArray(raw) ? (raw as FaqItem[]) : []

  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  })

  return (
    <section id="faq" className="bg-pm-paper-soft py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld }}
      />
      <div className="mx-auto max-w-4xl px-6">
        <SectionHead
          eyebrow={t('landing.faq.eyebrow')}
          l1={t('landing.faq.h.l1')}
          l2={t('landing.faq.h.l2')}
          align="left"
          maxWidth="max-w-3xl"
        />

        <FadeRise delay={0.08} className="mt-12">
          <Accordion.Root type="single" collapsible className="w-full">
            {items.map((it, i) => (
              <Accordion.Item
                key={i}
                value={`q${i}`}
                className="border-t border-pm-hair last:border-b"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-6 text-left">
                    <span className="flex items-baseline gap-3 font-sans text-[17px] text-pm-ink group-data-[state=open]:text-pm-clay">
                      <span
                        aria-hidden
                        className="block h-1.5 w-1.5 rounded-full bg-pm-clay opacity-0 transition-opacity group-data-[state=open]:opacity-100"
                      />
                      {it.q}
                    </span>
                    <span
                      aria-hidden
                      className="font-mono text-[18px] text-pm-ink-mid transition-transform duration-200 group-data-[state=open]:rotate-45 group-data-[state=open]:text-pm-clay"
                    >
                      +
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="max-w-prose pb-6 font-sans text-[16px] leading-relaxed text-pm-ink-mid">
                    {it.a}
                  </p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </FadeRise>

        <p className="mt-10 font-sans text-[13px] text-pm-ink-muted">
          {t('landing.faq.contactLine')}
        </p>
      </div>
    </section>
  )
}
