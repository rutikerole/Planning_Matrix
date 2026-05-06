// Phase 8 — DSGVO-compliant cookie consent banner.
//
// Design contract per the brief:
//   • Three options: Alle akzeptieren / Nur essenzielle / Anpassen
//   • "Alle akzeptieren" and "Nur essenzielle" SAME visual weight
//     (DSGVO requirement — equal-prominence is the bar set by the
//     EuGH "Planet 49" ruling)
//   • "Anpassen" opens a modal with three toggles (Essential always
//     on / Analytics / Functional)
//   • On rejection → no PostHog init at all (analytics.ts reads the
//     consent state before initialising)
//   • Re-open from footer "Cookie-Einstellungen" link
//
// No third-party CMP — pure local React. ~100 LOC.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCookieConsent } from './useCookieConsent'

interface Props {
  /** When true, shows the banner regardless of stored state — used
   *  by the footer's "Cookie-Einstellungen" re-open link. */
  forceOpen?: boolean
  /** Called when the user makes any choice (also when forceOpen is
   *  true and the user closes the banner). */
  onClose?: () => void
}

export function CookieBanner({ forceOpen = false, onClose }: Props) {
  const { i18n } = useTranslation()
  const isEn = (i18n.resolvedLanguage ?? 'de') === 'en'
  const { state, isPending, acceptAll, rejectAll, saveCustom } = useCookieConsent()
  const [showCustomise, setShowCustomise] = useState(false)
  const [analyticsToggle, setAnalyticsToggle] = useState(state?.analytics ?? false)
  const [functionalToggle, setFunctionalToggle] = useState(state?.functional ?? false)

  const visible = forceOpen || isPending
  if (!visible) return null

  function handleAcceptAll() {
    acceptAll()
    onClose?.()
  }

  function handleRejectAll() {
    rejectAll()
    onClose?.()
  }

  function handleSaveCustom() {
    saveCustom(analyticsToggle, functionalToggle)
    setShowCustomise(false)
    onClose?.()
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-paper shadow-[0_-2px_12px_-4px_hsl(0_0%_0%/0.08)]"
    >
      <div className="mx-auto max-w-3xl px-6 py-5">
        {!showCustomise ? (
          <div className="flex flex-col gap-4">
            <p
              id="cookie-banner-title"
              className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85"
            >
              {isEn ? 'Cookies' : 'Cookies'}
            </p>
            <p
              id="cookie-banner-body"
              className="text-[14px] text-ink/85 leading-relaxed"
            >
              {isEn
                ? 'We use essential storage to keep you signed in plus optional analytics (PostHog EU, cookieless) to improve the product. Analytics never receives your plot address. Read the '
                : 'Wir nutzen technisch notwendigen Speicher, damit Sie angemeldet bleiben, sowie optional Analytics (PostHog EU, cookieless) zur Produktverbesserung. Adressen werden niemals an Analytics übertragen. Details in der '}
              <a
                href="/cookies"
                className="underline underline-offset-4 decoration-clay/45 hover:decoration-clay text-ink"
              >
                {isEn ? 'cookie policy' : 'Cookie-Erklärung'}
              </a>
              {isEn ? ' or the ' : ' und der '}
              <a
                href="/datenschutz"
                className="underline underline-offset-4 decoration-clay/45 hover:decoration-clay text-ink"
              >
                {isEn ? 'privacy notice' : 'Datenschutzerklärung'}
              </a>
              .
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Equal-weight buttons per DSGVO Planet-49 ruling. */}
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 inline-flex items-center justify-center h-11 px-5 rounded-[5px] text-[14px] font-medium tracking-tight bg-ink text-paper hover:bg-ink/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {isEn ? 'Accept all' : 'Alle akzeptieren'}
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="flex-1 inline-flex items-center justify-center h-11 px-5 rounded-[5px] text-[14px] font-medium tracking-tight bg-ink text-paper hover:bg-ink/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {isEn ? 'Essential only' : 'Nur essenzielle'}
              </button>
              <button
                type="button"
                onClick={() => setShowCustomise(true)}
                className="inline-flex items-center justify-center h-11 px-5 text-[14px] text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-[3px]"
              >
                {isEn ? 'Customise' : 'Anpassen'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p
              id="cookie-banner-title"
              className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay/85"
            >
              {isEn ? 'Customise cookies' : 'Cookies anpassen'}
            </p>
            <ConsentRow
              label={isEn ? 'Essential' : 'Essenziell'}
              description={
                isEn
                  ? 'Required to keep you signed in. Cannot be turned off.'
                  : 'Notwendig zur Anmeldung. Nicht abwählbar.'
              }
              checked
              disabled
              onChange={() => {}}
            />
            <ConsentRow
              label={isEn ? 'Functional' : 'Funktional'}
              description={
                isEn
                  ? 'Stores your consent choices, language preference, and Sentry EU error reports (no addresses, no PII).'
                  : 'Speichert Einwilligung, Sprachauswahl und Sentry-EU-Fehlerberichte (keine Adressen, keine PII).'
              }
              checked={functionalToggle}
              disabled={false}
              onChange={setFunctionalToggle}
            />
            <ConsentRow
              label={isEn ? 'Analytics' : 'Analytik'}
              description={
                isEn
                  ? 'PostHog EU cookieless analytics. No plot addresses, no PII.'
                  : 'PostHog EU im Cookieless-Modus. Keine Adressen, keine PII.'
              }
              checked={analyticsToggle}
              disabled={false}
              onChange={setAnalyticsToggle}
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveCustom}
                className="flex-1 inline-flex items-center justify-center h-11 px-5 rounded-[5px] text-[14px] font-medium tracking-tight bg-ink text-paper hover:bg-ink/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                {isEn ? 'Save selection' : 'Auswahl speichern'}
              </button>
              <button
                type="button"
                onClick={() => setShowCustomise(false)}
                className="inline-flex items-center justify-center h-11 px-5 text-[14px] text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink rounded-[3px]"
              >
                {isEn ? 'Back' : 'Zurück'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConsentRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-70 cursor-default' : ''}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-ink"
      />
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[12px] text-ink/70 leading-relaxed">{description}</span>
      </div>
    </label>
  )
}
