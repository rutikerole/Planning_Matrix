import { useTranslation } from 'react-i18next'
import type { LegalConfigKey } from '../lib/legalConfig'

interface Props {
  missing: LegalConfigKey[]
}

/**
 * v1.0.4 — fail-closed banner rendered in place of the inline
 * provider details whenever `getLegalConfig()` returns `ok: false`.
 *
 * The audit-blocker scenario (v1.0.3): a literal `{{ANBIETER_NAME}}`
 * leaks onto /impressum because env wasn't filled. This banner
 * replaces that leak with an honest "details unavailable — contact
 * the operator at the email below" surface, preserving § 5 DDG's
 * intent (visible operator contact) without rendering placeholder
 * syntax to a visitor's eyeballs.
 *
 * The banner intentionally does NOT name the missing keys to the
 * visitor. The build-time validator
 * (`scripts/verify-legal-config.mjs`) is supposed to catch this
 * before deploy; if it slipped through, the missing keys still get
 * console.error'd in the development build for the operator.
 */
export function LegalConfigUnavailable({ missing }: Props) {
  const { i18n } = useTranslation()
  const isEn = (i18n.resolvedLanguage ?? 'de') === 'en'
  if (import.meta.env.DEV) {
    console.error(
      '[legalConfig] missing keys (visible only in DEV):',
      missing.join(', '),
    )
  }
  return (
    <div className="border border-clay/40 bg-clay/5 px-4 py-3 my-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-clay">
        {isEn ? 'Provider details unavailable' : 'Anbieterangaben nicht verfügbar'}
      </p>
      <p className="mt-1 text-sm text-ink/75">
        {isEn
          ? 'Operator details are not currently available. Please contact the operator directly via the channel through which you reached this site.'
          : 'Die Anbieterangaben sind derzeit nicht abrufbar. Bitte wenden Sie sich direkt über den Kanal an den Anbieter, über den Sie diese Seite erreicht haben.'}
      </p>
    </div>
  )
}
