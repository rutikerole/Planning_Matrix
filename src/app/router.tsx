import { Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'
import { SignUpPage } from '@/features/auth/pages/SignUpPage'
import { SignInPage } from '@/features/auth/pages/SignInPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { CheckEmailPage } from '@/features/auth/pages/CheckEmailPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { DashboardPlaceholder } from '@/features/dashboard/DashboardPlaceholder'
import { LegalPlaceholder } from '@/features/legal/LegalPlaceholder'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Auth — public */}
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPlaceholder />
          </ProtectedRoute>
        }
      />

      {/* Legal placeholders — required for German B2B before public launch */}
      <Route
        path="/impressum"
        element={<LegalPlaceholder titleKey="legal.imprintTitle" />}
      />
      <Route
        path="/datenschutz"
        element={<LegalPlaceholder titleKey="legal.privacyTitle" />}
      />
      <Route
        path="/agb"
        element={<LegalPlaceholder titleKey="legal.termsTitle" />}
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
