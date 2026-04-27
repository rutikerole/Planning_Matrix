import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { DemoBrowser } from '../visuals/DemoBrowser'

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
          <DemoBrowser />
        </div>
      </Container>
    </Section>
  )
}
