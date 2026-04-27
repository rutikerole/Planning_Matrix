import { useTranslation } from 'react-i18next'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'

const ITEMS = ['1', '2', '3', '4', '5', '6'] as const

export function Faq() {
  const { t } = useTranslation()
  return (
    <Section id="faq" bordered>
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-12">
          <div className="lg:col-span-4">
            <SectionHeader
              eyebrow={t('faq.eyebrow')}
              heading={t('faq.heading')}
            />
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <AccordionPrimitive.Root type="single" collapsible className="border-t border-border">
              {ITEMS.map((n) => (
                <AccordionPrimitive.Item
                  key={n}
                  value={`item-${n}`}
                  className="border-b border-border"
                >
                  <AccordionPrimitive.Header>
                    <AccordionPrimitive.Trigger
                      className={cn(
                        'group flex w-full items-start justify-between gap-6 py-7 md:py-8 text-left',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      )}
                    >
                      <span className="font-display text-title md:text-title-lg text-ink leading-[1.18] pr-6 transition-colors duration-soft group-hover:text-clay group-data-[state=open]:text-clay">
                        {t(`faq.q${n}`)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 mt-2 size-9 rounded-sm border border-border-strong inline-flex items-center justify-center text-ink/70 group-data-[state=open]:bg-ink group-data-[state=open]:text-paper group-data-[state=open]:border-ink transition-colors duration-soft"
                      >
                        <Plus
                          className="size-4 transition-transform duration-soft group-data-[state=open]:rotate-45"
                          aria-hidden="true"
                        />
                      </span>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionPrimitive.Content className="overflow-hidden text-base data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <p className="pb-8 max-w-2xl text-body-lg text-muted-foreground leading-relaxed">
                      {t(`faq.a${n}`)}
                    </p>
                  </AccordionPrimitive.Content>
                </AccordionPrimitive.Item>
              ))}
            </AccordionPrimitive.Root>
          </div>
        </div>
      </Container>
    </Section>
  )
}
