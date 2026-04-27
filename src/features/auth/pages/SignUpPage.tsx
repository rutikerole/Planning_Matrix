import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { signUpSchema, safeNext, type SignUpInput } from '@/lib/authValidation'
import { AuthShell } from '../components/AuthShell'
import { AuthCard } from '../components/AuthCard'
import { AuthFooter } from '../components/AuthFooter'
import { CheckboxField } from '../components/CheckboxField'
import { EmailField } from '../components/EmailField'
import { ErrorAlert } from '../components/ErrorAlert'
import { HoneypotField } from '../components/HoneypotField'
import { PasswordField } from '../components/PasswordField'
import { SubmitButton } from '../components/SubmitButton'
import { TextField } from '../components/TextField'

interface SupabaseAuthError {
  code?: string
  status?: number
  message?: string
}

export function SignUpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isLoading } = useAuthStore()
  const auth = useAuth()

  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in → redirect to dashboard or whitelisted ?next=
  useEffect(() => {
    if (!isLoading && user) {
      navigate(safeNext(searchParams.get('next')), { replace: true })
    }
  }, [user, isLoading, searchParams, navigate])

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: searchParams.get('email') ?? '',
      password: '',
      acceptTerms: false,
      website: '',
    },
  })
  const errors = form.formState.errors

  const tk = (k: string | undefined): string | undefined =>
    k ? t(k) : undefined

  const onSubmit = async (values: SignUpInput) => {
    setServerError(null)

    // Honeypot — field is hidden from humans; bots typically fill every input.
    if (values.website && values.website.length > 0) {
      // Pretend we did the work, but don't actually call Supabase.
      navigate(`/check-email?email=${encodeURIComponent(values.email)}`)
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await auth.signUp({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
      })

      if (error) {
        const e = error as SupabaseAuthError
        if (
          e.code === 'over_request_rate_limit' ||
          e.code === 'over_email_send_rate_limit' ||
          e.status === 429
        ) {
          setServerError(t('auth.errors.rateLimit'))
        } else if (e.code === 'weak_password') {
          form.setError('password', {
            type: 'server',
            message: 'auth.errors.passwordTooShort',
          })
        } else {
          console.error('[signUp]', error)
          setServerError(t('auth.errors.unexpected'))
        }
        return
      }

      // Heuristic: when an email is already registered AND email-confirm
      // is on, Supabase historically returns user with identities=[].
      // If that signal is reliable in this version, surface it on the
      // email field. If not (newer anti-enumeration releases), the user
      // simply lands on /check-email and either gets a duplicate-confirm
      // email or eventually realises they're already registered and
      // uses "Bereits registriert? Anmelden".
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        form.setError('email', {
          type: 'server',
          message: 'auth.errors.emailAlreadyRegistered',
        })
        return
      }

      navigate(`/check-email?email=${encodeURIComponent(values.email)}`)
    } catch (e) {
      console.error('[signUp] network', e)
      setServerError(t('auth.errors.network'))
    } finally {
      setSubmitting(false)
    }
  }

  const emailErrorKey = errors.email?.message
  const showAlreadyRegisteredLink = emailErrorKey === 'auth.errors.emailAlreadyRegistered'

  return (
    <AuthShell
      photoStem="hero-rooftop"
      phraseKey="auth.phraseSignIn"
      titleKey="auth.signUp.title"
    >
      <AuthCard
        eyebrow={t('auth.signUp.eyebrow')}
        heading={
          <>
            {t('auth.signUp.headline').replace(/\.$/, '')}
            <span className="text-clay">.</span>
          </>
        }
        intro={t('auth.signUp.intro')}
      >
        {serverError && (
          <ErrorAlert className="mb-6">{serverError}</ErrorAlert>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
          noValidate
          aria-busy={submitting || undefined}
        >
          <TextField
            label={t('auth.signUp.fullNameLabel')}
            placeholder={t('auth.signUp.fullNamePlaceholder')}
            autoComplete="name"
            error={tk(errors.fullName?.message)}
            {...form.register('fullName')}
          />

          <div>
            <EmailField
              label={t('auth.signUp.emailLabel')}
              placeholder={t('auth.signUp.emailPlaceholder')}
              error={tk(errors.email?.message)}
              {...form.register('email')}
            />
            {showAlreadyRegisteredLink && (
              <p className="mt-1.5 text-xs text-ink/70">
                <Link
                  to={`/sign-in?email=${encodeURIComponent(form.getValues('email'))}`}
                  className="underline underline-offset-4 decoration-clay/55 hover:decoration-clay text-ink/85"
                >
                  {t('auth.signUp.signInLink')} →
                </Link>
              </p>
            )}
          </div>

          <PasswordField
            label={t('auth.signUp.passwordLabel')}
            hint={t('auth.signUp.passwordHint')}
            autoComplete="new-password"
            showStrength
            error={tk(errors.password?.message)}
            {...form.register('password')}
          />

          <CheckboxField
            error={tk(errors.acceptTerms?.message)}
            {...form.register('acceptTerms')}
          >
            {t('auth.signUp.termsBefore')}
            <Link
              to="/agb"
              className="underline underline-offset-4 decoration-clay/55 hover:decoration-clay"
            >
              {t('auth.signUp.termsLink')}
            </Link>
            {t('auth.signUp.termsAnd')}
            <Link
              to="/datenschutz"
              className="underline underline-offset-4 decoration-clay/55 hover:decoration-clay"
            >
              {t('auth.signUp.privacyLink')}
            </Link>
            {t('auth.signUp.termsAfter')}
          </CheckboxField>

          <HoneypotField {...form.register('website')} />

          <SubmitButton
            loading={submitting}
            loadingLabel={t('auth.signUp.submitLoading')}
            className="self-start mt-2"
          >
            {t('auth.signUp.submit')}
          </SubmitButton>
        </form>

        <AuthFooter
          prompt={t('auth.signUp.haveAccount')}
          linkLabel={t('auth.signUp.signInLink')}
          to="/sign-in"
        />
      </AuthCard>
    </AuthShell>
  )
}
