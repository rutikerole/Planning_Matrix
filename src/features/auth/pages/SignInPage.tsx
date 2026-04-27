import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { signInSchema, safeNext, type SignInInput } from '@/lib/authValidation'
import { AuthShell } from '../components/AuthShell'
import { AuthCard } from '../components/AuthCard'
import { AuthFooter } from '../components/AuthFooter'
import { EmailField } from '../components/EmailField'
import { ErrorAlert } from '../components/ErrorAlert'
import { PasswordField } from '../components/PasswordField'
import { SubmitButton } from '../components/SubmitButton'

interface SupabaseAuthError {
  code?: string
  status?: number
  message?: string
}

export function SignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isLoading } = useAuthStore()
  const auth = useAuth()

  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const resetSuccess = searchParams.get('reset') === 'success'
  const postSignup = searchParams.get('postSignup') === '1'
  const prefilledEmail = searchParams.get('email') ?? ''

  // Already signed in → redirect
  useEffect(() => {
    if (!isLoading && user) {
      navigate(safeNext(searchParams.get('next')), { replace: true })
    }
  }, [user, isLoading, searchParams, navigate])

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
    defaultValues: {
      email: prefilledEmail,
      password: '',
    },
  })
  const errors = form.formState.errors
  const tk = (k: string | undefined): string | undefined =>
    k ? t(k) : undefined

  const onSubmit = async (values: SignInInput) => {
    setServerError(null)
    setSubmitting(true)

    try {
      const { error } = await auth.signIn({
        email: values.email,
        password: values.password,
      })

      if (error) {
        const e = error as SupabaseAuthError
        // Note: per Supabase auth#275, email_not_confirmed takes priority
        // over invalid_credentials — even with a wrong password, an
        // unconfirmed user gets email_not_confirmed. We can't distinguish.
        if (e.code === 'email_not_confirmed') {
          navigate(
            `/check-email?email=${encodeURIComponent(values.email)}&unverified=1`,
            { replace: true },
          )
          return
        }
        if (e.code === 'invalid_credentials' || e.status === 400) {
          setServerError(t('auth.errors.invalidCredentials'))
          return
        }
        if (
          e.code === 'over_request_rate_limit' ||
          e.status === 429
        ) {
          setServerError(t('auth.errors.rateLimit'))
          return
        }
        console.error('[signIn]', error)
        setServerError(t('auth.errors.unexpected'))
        return
      }

      navigate(safeNext(searchParams.get('next')), { replace: true })
    } catch (e) {
      console.error('[signIn] network', e)
      setServerError(t('auth.errors.network'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      photoStem="domain-b-facade"
      phraseKey="auth.phraseSignIn"
      titleKey="auth.signIn.title"
    >
      <AuthCard
        eyebrow={t('auth.signIn.eyebrow')}
        heading={
          <>
            {t('auth.signIn.headline').replace(/\.$/, '')}
            <span className="text-clay">.</span>
          </>
        }
        intro={t('auth.signIn.intro')}
      >
        {resetSuccess && (
          <div
            role="status"
            className="border-l-2 border-clay pl-3.5 py-2 text-sm text-ink/85 mb-6"
          >
            <strong className="block font-medium text-ink/95">
              {t('auth.signIn.resetSuccessTitle')}
            </strong>
            <span className="text-ink/70">
              {t('auth.signIn.resetSuccessBody')}
            </span>
          </div>
        )}
        {postSignup && !resetSuccess && (
          <div
            role="status"
            className="border-l-2 border-clay pl-3.5 py-2 text-sm text-ink/85 mb-6"
          >
            <strong className="block font-medium text-ink/95">
              {t('auth.signIn.postSignupTitle')}
            </strong>
            <span className="text-ink/70">
              {t('auth.signIn.postSignupBody')}
            </span>
          </div>
        )}
        {serverError && (
          <ErrorAlert className="mb-6">{serverError}</ErrorAlert>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
          noValidate
          aria-busy={submitting || undefined}
        >
          <EmailField
            label={t('auth.signIn.emailLabel')}
            placeholder={t('auth.signIn.emailPlaceholder')}
            error={tk(errors.email?.message)}
            {...form.register('email')}
          />

          <div className="flex flex-col gap-2">
            <PasswordField
              label={t('auth.signIn.passwordLabel')}
              autoComplete="current-password"
              error={tk(errors.password?.message)}
              {...form.register('password')}
            />
            <Link
              to={`/forgot-password?email=${encodeURIComponent(form.getValues('email'))}`}
              className="self-end text-xs text-ink/60 hover:text-ink transition-colors duration-soft underline-offset-4 hover:underline decoration-clay/55"
            >
              {t('auth.signIn.forgotPassword')}
            </Link>
          </div>

          <SubmitButton
            loading={submitting}
            loadingLabel={t('auth.signIn.submitLoading')}
            className="self-start mt-2"
          >
            {t('auth.signIn.submit')}
          </SubmitButton>
        </form>

        <AuthFooter
          prompt={t('auth.signIn.noAccount')}
          linkLabel={t('auth.signIn.signUpLink')}
          to="/sign-up"
        />
      </AuthCard>
    </AuthShell>
  )
}
