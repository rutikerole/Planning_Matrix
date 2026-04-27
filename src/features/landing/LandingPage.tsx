import { useTranslation } from 'react-i18next'
import { LazyMotion, domAnimation } from 'framer-motion'
import { GrainOverlay } from '@/components/shared/GrainOverlay'
import { SmoothScroll } from '@/components/shared/SmoothScroll'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Problem } from './components/Problem'
import { Product } from './components/Product'
import { Domains } from './components/Domains'
import { Audience } from './components/Audience'
import { Trust } from './components/Trust'
import { Footer } from './components/Footer'

export function LandingPage() {
  const { t } = useTranslation()
  return (
    <LazyMotion features={domAnimation} strict>
      <SmoothScroll />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:text-paper focus:px-3 focus:py-2 focus:rounded-sm focus:text-sm"
      >
        {t('common.skipToContent')}
      </a>
      <Nav />
      <main id="main" className="relative">
        <Hero />
        <Problem />
        <Product />
        <Domains />
        <Audience />
        <Trust />
      </main>
      <Footer />
      <GrainOverlay />
    </LazyMotion>
  )
}
