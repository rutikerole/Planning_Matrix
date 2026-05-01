import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { LandingPage } from '@/features/landing/LandingPage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'
import { SignUpPage } from '@/features/auth/pages/SignUpPage'
import { SignInPage } from '@/features/auth/pages/SignInPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { CheckEmailPage } from '@/features/auth/pages/CheckEmailPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ImpressumPage } from '@/features/legal/pages/ImpressumPage'
import { DatenschutzPage } from '@/features/legal/pages/DatenschutzPage'
import { AgbPage } from '@/features/legal/pages/AgbPage'
import { CookiesPage } from '@/features/legal/pages/CookiesPage'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { ProjectGuard } from '@/components/shared/ProjectGuard'
import { WizardPage } from '@/features/wizard'
import { ChatWorkspacePage } from '@/features/chat/pages/ChatWorkspacePage'
import { OverviewPage } from '@/features/chat/pages/OverviewPage'
import { ResultPage } from '@/features/result/pages/ResultPage'
import { SharedResultPage } from '@/features/result/pages/SharedResultPage'
import { SEO } from '@/components/SEO'

export function AppRouter() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public marketing — landing already wires its own SEO with
          * description; the router doesn't add a duplicate here. */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth — public. Sign-in already wires its own SEO inside
          * formBody so it survives both AuthShell + MobileAuthShell. */}
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route
          path="/forgot-password"
          element={
            <>
              <SEO titleKey="seo.title.forgotPassword" />
              <ForgotPasswordPage />
            </>
          }
        />
        <Route
          path="/reset-password"
          element={
            <>
              <SEO titleKey="seo.title.resetPassword" />
              <ResetPasswordPage />
            </>
          }
        />
        <Route
          path="/check-email"
          element={
            <>
              <SEO titleKey="seo.title.checkEmail" />
              <CheckEmailPage />
            </>
          }
        />
        <Route
          path="/verify-email"
          element={
            <>
              <SEO titleKey="seo.title.verifyEmail" />
              <VerifyEmailPage />
            </>
          }
        />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <>
              <SEO titleKey="seo.title.dashboard" />
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            </>
          }
        />
        <Route
          path="/projects/new"
          element={
            <>
              <SEO titleKey="seo.title.wizard" />
              <ProtectedRoute>
                <WizardPage />
              </ProtectedRoute>
            </>
          }
        />
        {/* Project routes wire their own SEO from inside the page so
          * the title can include the live project name (`{{name}}`). */}
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectGuard>
                <ChatWorkspacePage />
              </ProjectGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/overview"
          element={
            <ProtectedRoute>
              <ProjectGuard>
                <OverviewPage />
              </ProjectGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/result"
          element={
            <ProtectedRoute>
              <ProjectGuard>
                <ResultPage />
              </ProjectGuard>
            </ProtectedRoute>
          }
        />

        {/* Phase 3.5 #65 — Public read-only share view. No auth required.
          * SEO with project name lives inside SharedResultPage. */}
        <Route path="/result/share/:token" element={<SharedResultPage />} />

        {/* Phase 8 — full legal pages (replaces Phase 1's
          * LegalPlaceholder). Required for German B2B launch. */}
        <Route
          path="/impressum"
          element={
            <>
              <SEO titleKey="seo.title.legalImprint" />
              <ImpressumPage />
            </>
          }
        />
        <Route
          path="/datenschutz"
          element={
            <>
              <SEO titleKey="seo.title.legalPrivacy" />
              <DatenschutzPage />
            </>
          }
        />
        <Route
          path="/agb"
          element={
            <>
              <SEO titleKey="seo.title.legalTerms" />
              <AgbPage />
            </>
          }
        />
        <Route
          path="/cookies"
          element={
            <>
              <SEO titleKey="seo.title.legalCookies" />
              <CookiesPage />
            </>
          }
        />
        {/* Phase-1 LegalPlaceholder removed; ImpressumPage and friends
          * own the routes now. */}

        <Route
          path="*"
          element={
            <>
              <SEO titleKey="seo.title.notFound" />
              <NotFoundPage />
            </>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}
