// Phase 7 Chamber — ErrorBanner.

import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'

const KNOWN_ERROR_CODES = new Set([
  'streaming_failed',
  'model_response_invalid',
  'upstream_overloaded',
  'upstream_timeout',
  'persistence_failed',
  'idempotency_replay',
  'validation',
  'unauthenticated',
  // v1.0.4 A3 — close PROD_READINESS audit finding: forbidden +
  // qualifier_role_violation were Edge-Function-emittable codes
  // that the SPA fell through to generic 'internal' for. The
  // qualifier_role_violation case is load-bearing for the §6.B.01
  // legal shield; the locked German CTA must reach the user.
  // 'rate_limit_exceeded' is INTENTIONALLY excluded — useChatTurn
  // routes that envelope to the dedicated rate-limit banner, not
  // through this ErrorBanner.
  'forbidden',
  'qualifier_role_violation',
  'not_found',
  'internal',
])

export function ErrorBanner() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const lastError = useChatStore((s) => s.lastError)
  const setLastError = useChatStore((s) => s.setLastError)
  const code = lastError?.code
  const lookupCode = code && KNOWN_ERROR_CODES.has(code) ? code : 'internal'

  return (
    <AnimatePresence>
      {lastError && (
        <m.div
          initial={reduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          role="alert"
          className="fixed top-0 left-0 right-0 z-40 bg-paper border-b border-destructive/40"
        >
          <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-2 flex items-center gap-3">
            <p className="flex-1 text-[12.5px] text-clay/85 leading-snug">
              <span className="font-medium text-destructive/90">
                {t(`chat.errors.${lookupCode}.title`)}
              </span>{' '}
              <span className="italic">
                {t(`chat.errors.${lookupCode}.body`)}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setLastError(null)}
              className="text-[11px] uppercase tracking-[0.16em] text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 rounded-sm"
            >
              {t('chat.chamber.errorDismiss')}
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
