import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'

/**
 * Lazy-load DemoBrowser — it carries the state machine, multiple
 * sub-components, and the result-card item map. Splitting it out of
 * the main chunk shrinks first-paint JS and lets the browser download
 * the demo chunk in parallel with the rest of the page.
 */
const DemoBrowser = lazy(() =>
  import('../visuals/DemoBrowser').then((m) => ({ default: m.DemoBrowser })),
)

function DemoBrowserSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative rounded-xl border border-border-strong/45 bg-paper/85 backdrop-blur-md shadow-[0_4px_14px_-6px_hsl(220_15%_11%/0.08),0_28px_56px_-20px_hsl(220_15%_11%/0.12)] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-strong/40 bg-paper/95">
        <div className="flex gap-1.5 shrink-0">
          <span className="size-2.5 rounded-full bg-ink/12" />
          <span className="size-2.5 rounded-full bg-ink/12" />
          <span className="size-2.5 rounded-full bg-ink/12" />
        </div>
        <div className="flex-1 max-w-[440px] mx-auto h-[26px] rounded-sm bg-muted/55" />
        <span className="size-2.5 rounded-full bg-clay/30 shrink-0" />
      </div>
      <div className="min-h-[460px] md:min-h-[500px]" />
    </div>
  )
}

export function Demo() {
  const { t } = useTranslation()
  return (
    <Section id="demo" bordered className="bg-blueprint">
      <Container>
        <SectionHeader
          eyebrow={t('demo.eyebrow')}
          heading={t('demo.heading')}
          sub={t('demo.sub')}
        />
        <div className="mt-14 md:mt-18 lg:mt-20 max-w-[920px] mx-auto">
          <Suspense fallback={<DemoBrowserSkeleton />}>
            <DemoBrowser />
          </Suspense>
        </div>
      </Container>
    </Section>
  )
}
