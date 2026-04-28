import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '@/lib/authValidation'
import { AuthShell } from '../components/AuthShell'
import { AuthCard } from '../components/AuthCard'
import { ErrorAlert } from '../components/ErrorAlert'
import { PasswordField } from '../components/PasswordField'
import { SubmitButton } from '../components/SubmitButton'

interface SupabaseAuthError {
  code?: string
  status?: number
  message?: string
}

type Phase = 'waiting' | 'ready' | 'invalid' | 'success'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const auth = useAuth()

  const [phase, setPhase] = useState<Phase>(() =>
    isSupabaseConfigured() ? 'waiting' : 'invalid',
  )
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Wait up to 3s for the PASSWORD_RECOVERY event (Supabase fires it
  // after detectSessionInUrl exchanges the ?code=… in the URL). If it
  // doesn't fire, the link is invalid / expired / opened on a different
  // device, and we surface the corresponding state.
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cleared = false
    const timer = window.setTimeout(() => {
      if (cleared) return
      setPhase((p) => (p === 'waiting' ? 'invalid' : p))
    }, 3000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        cleared = true
        window.clearTimeout(timer)
        setPhase('ready')
      }
    })

    return () => {
      cleared = true
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { password: '', confirmPassword: '' },
  })
  const errors = form.formState.errors
  const tk = (k: string | undefined): string | undefined =>
    k ? t(k) : undefined

  const onSubmit = async (values: ResetPasswordInput) => {
    setServerError(null)
    setSubmitting(true)
    try {
      const { error } = await auth.updatePassword(values.password)
      if (error) {
        const e = error as SupabaseAuthError
        if (
          e.code === 'over_request_rate_limit' ||
          e.status === 429
        ) {
          setServerError(t('auth.errors.rateLimit'))
          return
        }
        if (e.code === 'session_not_found' || e.status === 401) {
          setServerError(t('auth.reset.sessionExpiredBody'))
          return
        }
        console.error('[resetPassword]', error)
        setServerError(t('auth.errors.unexpected'))
        return
      }
      // Success — sign user out so they can re-authenticate cleanly,
      // then drop them on /sign-in with the success info block.
      await supabase.auth.signOut({ scope: 'local' })
      setPhase('success')
      window.setTimeout(() => {
        navigate('/sign-in?reset=success', { replace: true })
      }, 2500)
    } catch (e) {
      console.error('[resetPassword] network', e)
      setServerError(t('auth.errors.network'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      photoStem="finalcta-windows"
      phraseKey="auth.phraseReset"
      titleKey="auth.reset.title"
      captionKey="auth.photoCaption.finalcta-windows"
    >
      <AuthCard
        eyebrow={t('auth.reset.eyebrow')}
        heading={
          phase === 'invalid'
            ? t('auth.reset.linkInvalidTitle')
            : phase === 'success'
              ? t('auth.reset.successTitle')
              : t('auth.reset.headline')
        }
        intro={
          phase === 'invalid'
            ? t('auth.reset.linkInvalidBody')
            : phase === 'success'
              ? t('auth.reset.successBody')
              : phase === 'ready'
                ? t('auth.reset.intro')
                : undefined
        }
      >
        {phase === 'waiting' && (
          <div className="flex items-center gap-3" aria-busy="true">
            <span
              aria-hidden="true"
              className="h-px w-12 bg-clay/55 motion-safe:animate-[breath-dot_1.6s_ease-in-out_infinite]"
              style={{ transformOrigin: 'center' }}
            />
            <span className="sr-only">Lädt…</span>
          </div>
        )}

        {phase === 'invalid' && (
          <div className="flex flex-col gap-6">
            <Link
              to="/forgot-password"
              className="self-start text-sm text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink transition-colors"
            >
              {t('auth.reset.requestNew')} →
            </Link>
          </div>
        )}

        {phase === 'success' && (
          <div role="status" aria-live="polite" className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-px w-12 bg-clay/55 motion-safe:animate-[breath-dot_1.6s_ease-in-out_infinite]"
              style={{ transformOrigin: 'center' }}
            />
          </div>
        )}

        {phase === 'ready' && (
          <>
            {serverError && <ErrorAlert className="mb-6">{serverError}</ErrorAlert>}
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
              noValidate
              aria-busy={submitting || undefined}
            >
              <PasswordField
                label={t('auth.reset.passwordLabel')}
                autoComplete="new-password"
                showStrength
                error={tk(errors.password?.message)}
                {...form.register('password')}
              />
              <PasswordField
                label={t('auth.reset.confirmLabel')}
                autoComplete="new-password"
                error={tk(errors.confirmPassword?.message)}
                {...form.register('confirmPassword')}
              />
              <SubmitButton
                loading={submitting}
                loadingLabel={t('auth.reset.submitLoading')}
                className="self-start mt-2"
              >
                {t('auth.reset.submit')}
              </SubmitButton>
            </form>
          </>
        )}
      </AuthCard>
    </AuthShell>
  )
}
