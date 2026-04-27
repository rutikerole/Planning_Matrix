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
        setSubmitting(false)
        return
      }

      // Heuristic: when an email is already registered, Supabase
      // historically returns user with identities=[]. If reliable on
      // this version, surface the inline error; otherwise fall through
      // to the autoconfirm path below — duplicate signups will fail
      // gracefully on signInWithPassword anyway.
      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        form.setError('email', {
          type: 'server',
          message: 'auth.errors.emailAlreadyRegistered',
        })
        setSubmitting(false)
        return
      }

      // Phase 2 v1: the autoconfirm trigger (supabase/migrations/
      // 0002_autoconfirm.sql) flips email_confirmed_at = now() at the
      // instant the auth.users row is inserted. By the time this code
      // runs, the user is confirmed in the database — but signUp's
      // own response was already prepared and may come back with
      // session=null. So:
      //
      //   • If signUp returned a session, use it directly.
      //   • If it didn't, immediately try signInWithPassword. The
      //     trigger has already confirmed the user, so the signin
      //     should succeed and yield a session.
      //   • If even that fails (genuine email-confirmation requirement
      //     somehow re-engaged), fall through to /check-email as a
      //     defensive last resort.
      //
      // Either successful path leaves submitting=true; the auth store
      // SIGNED_IN handler triggers the redirect-when-signed-in
      // useEffect at the top of this component, which navigates to
      // safeNext(?next=) — and the component unmounts.
      if (!data.session) {
        const { error: signInError } = await auth.signIn({
          email: values.email,
          password: values.password,
        })
        if (signInError) {
          // Account exists but signin failed (network blip, race with
          // trigger, etc.). Send to /sign-in with email prefilled +
          // a "Konto erstellt — bitte anmelden" notice (postSignup=1).
          // Better than dead-ending on /check-email when the autoconfirm
          // trigger is doing the heavy lifting.
          navigate(
            `/sign-in?email=${encodeURIComponent(values.email)}&postSignup=1`,
            { replace: true },
          )
          return
        }
      }
      // session present (or signin just succeeded) — the redirect
      // useEffect handles navigation via the store update.
    } catch (e) {
      console.error('[signUp] network', e)
      setServerError(t('auth.errors.network'))
      setSubmitting(false)
    }
    // No finally{} — happy path leaves submitting=true so the form
    // stays disabled until the auth store settles and the redirect
    // useEffect navigates away. Error paths set submitting=false
    // explicitly above.
  }

  const emailErrorKey = errors.email?.message
  const showAlreadyRegisteredLink = emailErrorKey === 'auth.errors.emailAlreadyRegistered'

  return (
    <AuthShell
      photoStem="hero-rooftop"
      phraseKey="auth.phraseSignUp"
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
