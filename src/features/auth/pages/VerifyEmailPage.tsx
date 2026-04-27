import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/lib/authValidation'
import { AuthShell } from '../components/AuthShell'
import { AuthCard } from '../components/AuthCard'
import { EmailField } from '../components/EmailField'
import { ErrorAlert } from '../components/ErrorAlert'
import { SubmitButton } from '../components/SubmitButton'

interface SupabaseAuthError {
  code?: string
  status?: number
  message?: string
}

type Phase = 'loading' | 'success' | 'error' | 'resent'

const VERIFY_TIMEOUT_MS = 5000
const REDIRECT_AFTER_SUCCESS_MS = 1500

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const auth = useAuth()

  const [phase, setPhase] = useState<Phase>(() =>
    isSupabaseConfigured() ? 'loading' : 'error',
  )
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Within VERIFY_TIMEOUT_MS we expect the Supabase client's
  // detectSessionInUrl to exchange ?code=… and emit SIGNED_IN. The
  // INITIAL_SESSION callback also covers idempotent re-visits where
  // the user was already signed in from a prior session.
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cleared = false
    const timer = window.setTimeout(() => {
      if (cleared) return
      setPhase((p) => (p === 'loading' ? 'error' : p))
    }, VERIFY_TIMEOUT_MS)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        session?.user
      ) {
        cleared = true
        window.clearTimeout(timer)
        setPhase('success')
        window.setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, REDIRECT_AFTER_SUCCESS_MS)
      }
    })

    return () => {
      cleared = true
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [navigate])

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })
  const errors = form.formState.errors
  const tk = (k: string | undefined): string | undefined =>
    k ? t(k) : undefined

  const onResend = async (values: ForgotPasswordInput) => {
    setServerError(null)
    setSubmitting(true)
    try {
      const { error } = await auth.resendConfirmation(values.email)
      if (error) {
        const e = error as SupabaseAuthError
        if (
          e.code === 'over_request_rate_limit' ||
          e.code === 'over_email_send_rate_limit' ||
          e.status === 429
        ) {
          setServerError(t('auth.errors.rateLimit'))
          return
        }
        console.warn('[verifyEmail] resend', error)
        setServerError(t('auth.errors.unexpected'))
        return
      }
      setPhase('resent')
    } catch (e) {
      console.error('[verifyEmail] resend network', e)
      setServerError(t('auth.errors.network'))
    } finally {
      setSubmitting(false)
    }
  }

  let heading: string
  let intro: string | undefined

  if (phase === 'loading') {
    heading = t('auth.verify.loadingTitle')
    intro = undefined
  } else if (phase === 'success') {
    heading = t('auth.verify.successTitle')
    intro = t('auth.verify.successBody')
  } else if (phase === 'resent') {
    heading = t('auth.verify.resendSent')
    intro = undefined
  } else {
    heading = t('auth.verify.errorTitle')
    intro = t('auth.verify.errorBody')
  }

  return (
    <AuthShell
      photoStem="finalcta-windows"
      phraseKey="auth.phraseVerify"
      titleKey="auth.verify.title"
    >
      <AuthCard
        eyebrow={t('auth.verify.eyebrow')}
        heading={heading}
        intro={intro}
      >
        {phase === 'loading' && (
          <div className="flex items-center" aria-busy="true">
            <span
              aria-hidden="true"
              className="h-px w-12 bg-clay/55 motion-safe:animate-[breath-dot_1.6s_ease-in-out_infinite]"
              style={{ transformOrigin: 'center' }}
            />
            <span className="sr-only">{t('auth.verify.loadingTitle')}</span>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex items-center" aria-live="polite">
            <span
              aria-hidden="true"
              className="h-px w-12 bg-clay/55"
              style={{ transformOrigin: 'center' }}
            />
          </div>
        )}

        {phase === 'error' && (
          <>
            <p className="text-sm text-ink/70 mb-6 leading-relaxed">
              {t('auth.verify.differentDevice')}
            </p>
            {serverError && (
              <ErrorAlert className="mb-6">{serverError}</ErrorAlert>
            )}
            <form
              onSubmit={form.handleSubmit(onResend)}
              className="flex flex-col gap-6"
              noValidate
              aria-busy={submitting || undefined}
            >
              <EmailField
                label={t('auth.verify.resendEmailLabel')}
                placeholder={t('auth.verify.resendEmailPlaceholder')}
                error={tk(errors.email?.message)}
                {...form.register('email')}
              />
              <SubmitButton
                loading={submitting}
                loadingLabel={t('auth.verify.resendSubmit')}
                className="self-start mt-2"
              >
                {t('auth.verify.resendNew')}
              </SubmitButton>
            </form>
          </>
        )}

        {phase === 'resent' && (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-ink/75 leading-relaxed"
          >
            {t('auth.verify.resendSent')}
          </p>
        )}
      </AuthCard>
    </AuthShell>
  )
}
