import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthShell } from '../components/AuthShell'
import { AuthCard } from '../components/AuthCard'
import { ErrorAlert } from '../components/ErrorAlert'

interface SupabaseAuthError {
  code?: string
  status?: number
  message?: string
}

const COOLDOWN_SECONDS = 30

export function CheckEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const auth = useAuth()

  const email = searchParams.get('email') ?? ''
  const unverified = searchParams.get('unverified') === '1'

  const [serverError, setServerError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef<number | null>(null)

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    if (intervalRef.current) return
    intervalRef.current = window.setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1))
    }, 1000)
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [cooldown])

  const handleResend = async () => {
    if (!email || cooldown > 0) return
    setServerError(null)
    setInfo(null)
    try {
      const { error } = await auth.resendConfirmation(email)
      if (error) {
        const e = error as SupabaseAuthError
        if (
          e.code === 'over_request_rate_limit' ||
          e.code === 'over_email_send_rate_limit' ||
          e.status === 429
        ) {
          setServerError(t('auth.errors.rateLimit'))
        } else {
          console.warn('[checkEmail] resend', error)
          setServerError(t('auth.errors.unexpected'))
        }
        return
      }
      setInfo(t('auth.checkEmail.resendSent'))
      setCooldown(COOLDOWN_SECONDS)
    } catch (e) {
      console.error('[checkEmail] resend network', e)
      setServerError(t('auth.errors.network'))
    }
  }

  const headline = unverified
    ? t('auth.checkEmail.unverifiedHeadline')
    : t('auth.checkEmail.headline')

  const bodyTemplate = unverified
    ? t('auth.checkEmail.unverifiedBody')
    : t('auth.checkEmail.body')

  const body = bodyTemplate.replace('{{email}}', email || '—')

  return (
    <AuthShell
      photoStem="finalcta-windows"
      phraseKey="auth.phraseVerify"
      titleKey="auth.checkEmail.title"
    >
      <AuthCard
        eyebrow={t('auth.checkEmail.eyebrow')}
        heading={headline}
        intro={body}
      >
        {serverError && <ErrorAlert className="mb-6">{serverError}</ErrorAlert>}
        {info && (
          <div
            role="status"
            aria-live="polite"
            className="border-l-2 border-clay pl-3.5 py-2 text-sm text-ink/85 mb-6"
          >
            {info}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-2">
          <p className="text-sm text-ink/65">
            {t('auth.checkEmail.noEmailReceived')}
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={!email || cooldown > 0}
            className="self-start text-sm font-medium text-ink underline underline-offset-4 decoration-clay/55 hover:decoration-clay transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {cooldown > 0
              ? t('auth.checkEmail.resendCooldown').replace(
                  '{{seconds}}',
                  String(cooldown),
                )
              : t('auth.checkEmail.resend')}
          </button>
        </div>

        <div className="mt-10 flex flex-col gap-1.5">
          <p className="text-sm text-ink/60">
            {t('auth.checkEmail.wrongEmail')}
          </p>
          {unverified ? (
            <Link
              to="/sign-in"
              className="self-start text-sm text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink transition-colors"
            >
              ← {t('auth.checkEmail.backToSignIn')}
            </Link>
          ) : (
            <Link
              to="/sign-up"
              className="self-start text-sm text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink transition-colors"
            >
              ← {t('auth.checkEmail.backToSignUp')}
            </Link>
          )}
        </div>
      </AuthCard>
    </AuthShell>
  )
}
