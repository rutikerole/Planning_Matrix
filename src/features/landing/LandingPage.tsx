import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SEO } from '@/components/SEO'
import { SmoothScroll } from '@/components/shared/SmoothScroll'

import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { StatsStrip } from './components/StatsStrip'
import { ChatPreview } from './components/ChatPreview'
import { Analyzer } from './components/Analyzer'
import { Perspectives } from './components/Perspectives'
import { ThinkTabs } from './components/ThinkTabs'
import { Comparison } from './components/Comparison'
import { Trust } from './components/Trust'
import { Pricing } from './components/Pricing'
import { FAQ } from './components/Faq'
import { FinalCTA } from './components/FinalCta'
import { Footer } from './components/Footer'

export function LandingPage() {
  const { t, i18n } = useTranslation()

  // Sync <html lang> to active i18n language.
  useEffect(() => {
    const lang = i18n.language.startsWith('en') ? 'en' : 'de'
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang
    }
  }, [i18n.language])

  return (
    <>
      <SEO
        titleKey="seo.title.landing"
        descriptionKey="seo.description.landing"
      />
      <SmoothScroll />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:bg-pm-ink focus:px-3 focus:py-2 focus:text-sm focus:text-pm-paper"
      >
        {t('common.skipToContent')}
      </a>
      <Header />
      <main id="main" className="bg-pm-paper">
        <Hero />
        <StatsStrip />
        <ChatPreview />
        <Analyzer />
        <Perspectives />
        <ThinkTabs />
        <Comparison />
        <Trust />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
