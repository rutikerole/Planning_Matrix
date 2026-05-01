// Phase 8 — Cookie / localStorage page.
// Enumerates every storage entry the SPA actually uses, by category.

import { useTranslation } from 'react-i18next'
import { LegalPageLayout } from '../components/LegalPageLayout'

const LAST_UPDATED = '2026-05-01'

export function CookiesPage() {
  const { i18n } = useTranslation()
  const isEn = (i18n.resolvedLanguage ?? 'de') === 'en'
  return (
    <LegalPageLayout
      eyebrow={isEn ? 'Storage' : 'Speicher'}
      headline={isEn ? 'Cookies & local storage' : 'Cookies und lokaler Speicher'}
      lastUpdated={LAST_UPDATED}
    >
      {isEn ? <CookiesEn /> : <CookiesDe />}
    </LegalPageLayout>
  )
}

function CookiesDe() {
  return (
    <>
      <p>
        Diese Übersicht erläutert sämtliche Cookies und
        localStorage-Einträge, die unsere Anwendung verwendet. Die
        Rechtsgrundlagen ergänzen die{' '}
        <a href="/datenschutz">Datenschutzerklärung</a>; eine
        Anpassung Ihrer Einwilligung ist jederzeit über
        „Cookie-Einstellungen“ im Seitenfußbereich möglich.
      </p>

      <h2>1. Essenziell (immer aktiv)</h2>
      <p>
        Diese Speicher-Einträge sind technisch zwingend für den
        Betrieb der Anwendung erforderlich und unterliegen daher nicht
        der Einwilligungspflicht (§ 25 Abs. 2 Nr. 2 TDDDG / Art. 6
        Abs. 1 lit. b DSGVO).
      </p>
      <ul>
        <li>
          <strong>sb-access-token</strong> (localStorage, Supabase
          Auth) — speichert Ihren Anmeldestatus. Lebensdauer: bis zur
          Abmeldung.
        </li>
        <li>
          <strong>sb-refresh-token</strong> (localStorage, Supabase
          Auth) — verlängert das Anmeldetoken, ohne dass Sie sich neu
          anmelden müssen. Lebensdauer: bis zur Abmeldung.
        </li>
        <li>
          <strong>i18nextLng</strong> (localStorage) — speichert Ihre
          Sprachauswahl (DE / EN). Lebensdauer: dauerhaft.
        </li>
      </ul>

      <h2>2. Funktional (immer aktiv)</h2>
      <ul>
        <li>
          <strong>pm.cookieConsent</strong> (localStorage) — speichert
          Ihre Einwilligungs-Entscheidungen, damit das
          Einwilligungsbanner nicht bei jedem Besuch erneut erscheint.
          Lebensdauer: dauerhaft, vom Nutzer jederzeit löschbar.
        </li>
      </ul>

      <h2>3. Analytik (Einwilligung erforderlich)</h2>
      <p>
        Werden ausschließlich nach Ihrer aktiven Einwilligung über das
        Cookie-Banner aktiv. PostHog läuft im Cookieless-Modus
        (<code>disable_persistence: true</code>), setzt also keine
        Cookies und keine localStorage-Einträge — die unten
        aufgeführten Daten werden nur als Ereignisstrom an PostHog EU
        übertragen, nicht im Browser gespeichert.
      </p>
      <ul>
        <li>
          <strong>PostHog Pageviews</strong> — aufgerufene Seiten ohne
          Pfad-Parameter (insbesondere ohne Projekt-IDs).
        </li>
        <li>
          <strong>Wizard-Funnel-Schritte</strong> — `wizard_q1_completed`,
          `wizard_q2_completed`, `project_created` (jeweils mit
          Vorhabens-Typ-Kürzel, ohne Adressen).
        </li>
        <li>
          <strong>Nutzungsmetriken</strong> — Anzahl Chat-Turns
          pro Sitzung, Aufruf der Briefing-Seite.
        </li>
      </ul>

      <h2>4. Drittanbieter-Cookies</h2>
      <p>
        Wir setzen keine Drittanbieter-Cookies. Externe Dienste
        (Anthropic, OpenFreeMap, Nominatim, Geoportal München)
        kommunizieren ausschließlich serverseitig über unsere
        Edge Functions und setzen daher keine Cookies in Ihrem
        Browser.
      </p>

      <h2>5. Browsereinstellungen</h2>
      <p>
        Die meisten Browser akzeptieren Cookies automatisch. Sie
        können das Speichern von Cookies in den Browser-Einstellungen
        deaktivieren, einzelne Einträge löschen oder das automatische
        Löschen beim Schließen des Browsers konfigurieren. Bei
        Deaktivierung essenzieller Speicher-Einträge ist eine
        Anmeldung an der Anwendung nicht mehr möglich.
      </p>

      <h2>6. Widerruf der Einwilligung</h2>
      <p>
        Ihre Einwilligung in die Analyse-Speicher-Einträge können Sie
        jederzeit über den Link „Cookie-Einstellungen“ im
        Seitenfußbereich widerrufen. Der Widerruf wirkt nur für die
        Zukunft.
      </p>
    </>
  )
}

function CookiesEn() {
  return (
    <>
      <p>
        This page enumerates all browser-storage entries our
        application uses. The German version above is the legally
        binding one; this English version is a courtesy translation.
      </p>
      <h2>Essential (always active)</h2>
      <ul>
        <li><code>sb-access-token</code>, <code>sb-refresh-token</code> — Supabase auth</li>
        <li><code>i18nextLng</code> — language preference</li>
      </ul>
      <h2>Functional (always active)</h2>
      <ul>
        <li><code>pm.cookieConsent</code> — your consent choices</li>
      </ul>
      <h2>Analytics (consent required)</h2>
      <p>
        PostHog runs in cookieless mode (<code>disable_persistence: true</code>),
        so no cookies or localStorage entries are set. Events stream
        only to PostHog EU after you accept the analytics category.
      </p>
      <h2>Third-party cookies</h2>
      <p>None.</p>
    </>
  )
}
