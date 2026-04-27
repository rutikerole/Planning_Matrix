import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
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

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const auth = useAuth()

  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: searchParams.get('email') ?? '' },
  })
  const errors = form.formState.errors
  const tk = (k: string | undefined): string | undefined =>
    k ? t(k) : undefined

  const onSubmit = async (values: ForgotPasswordInput) => {
    setServerError(null)
    setSubmitting(true)
    try {
      const { error } = await auth.resetPasswordForEmail(values.email)
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
        // For any other error: still show generic success — don't leak
        // whether the email is registered. Log for debugging.
        // eslint-disable-next-line no-console
        console.warn('[forgotPassword]', error)
      }
      setSuccess(true)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[forgotPassword] network', e)
      setServerError(t('auth.errors.network'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      photoStem="trust-pen"
      phraseKey="auth.phraseRecover"
      titleKey="auth.forgot.title"
    >
      <AuthCard
        eyebrow={t('auth.forgot.eyebrow')}
        heading={t('auth.forgot.headline')}
        intro={!success ? t('auth.forgot.intro') : undefined}
      >
        {success ? (
          <div role="status" aria-live="polite" className="flex flex-col gap-6">
            <div className="border-l-2 border-clay pl-3.5 py-2">
              <p className="text-base font-medium text-ink mb-1">
                {t('auth.forgot.successTitle')}
              </p>
              <p className="text-sm text-ink/70 leading-relaxed">
                {t('auth.forgot.successBody')}
              </p>
            </div>
            <Link
              to="/sign-in"
              className="self-start text-sm text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink transition-colors"
            >
              ← {t('auth.forgot.backToSignIn')}
            </Link>
          </div>
        ) : (
          <>
            {serverError && <ErrorAlert className="mb-6">{serverError}</ErrorAlert>}
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
              noValidate
              aria-busy={submitting || undefined}
            >
              <EmailField
                label={t('auth.forgot.emailLabel')}
                error={tk(errors.email?.message)}
                {...form.register('email')}
              />
              <SubmitButton
                loading={submitting}
                loadingLabel={t('auth.forgot.submitLoading')}
                className="self-start mt-2"
              >
                {t('auth.forgot.submit')}
              </SubmitButton>
            </form>
            <Link
              to="/sign-in"
              className="mt-10 inline-block text-sm text-ink/60 hover:text-ink transition-colors duration-soft underline-offset-4 hover:underline decoration-clay/55"
            >
              ← {t('auth.forgot.backToSignIn')}
            </Link>
          </>
        )}
      </AuthCard>
    </AuthShell>
  )
}
