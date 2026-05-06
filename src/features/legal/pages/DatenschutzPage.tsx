// Phase 8 — Datenschutzerklärung per DSGVO Art. 13 + 14.
// Phase 9.2 follow-up — Sentry reclassified from legitimate-interest
// to functional-consent after the SentryLifecycle component started
// gating init on state.functional. PostHog and Sentry subprocessor
// entries expanded with company addresses + EU-instance qualifier
// (Frankfurt) + DPA wording (Sentry: standard DPA Art. 28 DSGVO;
// PostHog: standard DPA + EU SCCs).
//
// Lists every processing activity in the product:
//   • Account (email, password)        — Art. 6 (1) (b)
//   • Plot address + chat content       — Art. 6 (1) (b)
//   • Sentry error tracking (Functional consent) — Art. 6 (1) (a)
//   • PostHog analytics (Analytics consent)      — Art. 6 (1) (a)
//   • Anthropic API                     — Art. 6 (1) (b) + AVV
//   • Supabase (DB + Auth + Functions)  — Art. 6 (1) (b) + AVV
//   • OpenFreeMap / Nominatim           — Art. 6 (1) (f)
//   • München Geoportal WMS (admin-only Phase 6a) — Art. 6 (1) (f)

import { useTranslation } from 'react-i18next'
import { LegalPageLayout } from '../components/LegalPageLayout'

const LAST_UPDATED = '2026-05-06'

export function DatenschutzPage() {
  const { i18n } = useTranslation()
  const isEn = (i18n.resolvedLanguage ?? 'de') === 'en'
  return (
    <LegalPageLayout
      eyebrow={isEn ? 'Privacy' : 'Datenschutz'}
      headline={isEn ? 'Privacy notice' : 'Datenschutzerklärung'}
      lastUpdated={LAST_UPDATED}
    >
      {isEn ? <PrivacyEn /> : <PrivacyDe />}
    </LegalPageLayout>
  )
}

function PrivacyDe() {
  return (
    <>
      <p>
        Diese Datenschutzerklärung informiert Sie gemäß Art. 13 und 14
        DSGVO darüber, wie wir personenbezogene Daten verarbeiten, wenn
        Sie unser Produkt nutzen. Verbindlich ist diese deutsche
        Fassung; eine englische Übersetzung wird zur Verständigung
        bereitgestellt.
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich im Sinne des Art. 4 Nr. 7 DSGVO ist der
        Anbieter gemäß Impressum:
      </p>
      <p>
        {'{{ANBIETER_NAME}}'}, {'{{ANBIETER_STRASSE_HAUSNUMMER}}'},
        {' '}
        {'{{ANBIETER_PLZ}}'} {'{{ANBIETER_ORT}}'}, Deutschland.
        E-Mail: {'{{KONTAKT_EMAIL}}'}.
      </p>

      <h2>2. Datenschutzbeauftragter</h2>
      <p>
        Die Bestellung einer/eines Datenschutzbeauftragten ist gemäß
        Art. 37 DSGVO i. V. m. § 38 BDSG bei dem aktuellen
        Tätigkeitsumfang nicht erforderlich. Anfragen zum Datenschutz
        richten Sie bitte an die im Impressum genannte E-Mail.
      </p>

      <h2>3. Verarbeitete Daten und Zwecke</h2>

      <h3>3.1 Konto (Registrierung, Anmeldung)</h3>
      <p>
        <strong>Daten:</strong> E-Mail-Adresse, Passwort-Hash,
        Anmelde-Zeitstempel, IP-Adresse zur Missbrauchsabwehr.
        <br />
        <strong>Zweck:</strong> Bereitstellung der zugangsgeschützten
        Anwendung; Authentifizierung; Schutz vor automatisiertem
        Missbrauch (Brute-Force, Bot-Anmeldungen).
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
        (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an Anwendungssicherheit).
        <br />
        <strong>Speicherdauer:</strong> bis zur Löschung des Kontos
        durch Sie. Anmelde-Logs werden nach 30 Tagen anonymisiert.
      </p>

      <h3>3.2 Projektdaten (Vorhabensbeschreibung, Adresse, Chat-Verlauf)</h3>
      <p>
        <strong>Daten:</strong> Vorhabensart, Grundstücksadresse, im
        Gespräch übermittelte Projekteckdaten, generierte
        Empfehlungen.
        <br />
        <strong>Zweck:</strong> Bereitstellung der KI-gestützten
        Beratung; Speicherung Ihrer Projekte zur späteren
        Wiederaufnahme.
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
        (Vertragserfüllung).
        <br />
        <strong>Speicherdauer:</strong> bis zur Löschung des Projekts
        oder des Kontos durch Sie. RLS-Schutz: Projekte sind über
        Row-Level-Security streng auf den Eigentümer beschränkt.
      </p>

      <h3>3.3 Anthropic API (KI-Modell)</h3>
      <p>
        <strong>Daten:</strong> Konversationsinhalt einschließlich der
        Grundstücksadresse, Anbietersystem-Prompt, Modellantwort.
        <br />
        <strong>Empfänger:</strong> Anthropic, PBC (USA).
        <br />
        <strong>Drittlandübermittlung:</strong> Anthropic ist in den
        USA ansässig. Die Übermittlung erfolgt auf Grundlage der
        EU-Standardvertragsklauseln (SCCs) gemäß Art. 46 Abs. 2 lit. c
        DSGVO. Anthropic bietet zusätzlich ein
        Auftragsverarbeitungsverhältnis (DPA) an, das wir
        abgeschlossen haben.
        <br />
        <strong>Zweck:</strong> Generierung der KI-gestützten Antworten.
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO.
        Anthropic hat zugesichert, dass API-Daten ohne ausdrückliche
        Einwilligung nicht zum Modelltraining verwendet werden.
      </p>

      <h3>3.4 Supabase (Datenbank, Authentifizierung, Edge Functions)</h3>
      <p>
        <strong>Daten:</strong> alle in 3.1 und 3.2 genannten Daten
        sowie technische Server-Logs.
        <br />
        <strong>Empfänger:</strong> Supabase Inc. (USA), Hosting-Region
        Frankfurt am Main (Europa).
        <br />
        <strong>Drittlandübermittlung:</strong> Auftragsverarbeitung
        in Frankfurt; Konzern-Sitz USA. SCCs + DPA abgeschlossen.
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h3>3.5 Vercel (Hosting der Web-Oberfläche)</h3>
      <p>
        <strong>Daten:</strong> IP-Adresse, User-Agent, aufgerufene
        URL, Zeitstempel — übliche HTTP-Server-Logs.
        <br />
        <strong>Empfänger:</strong> Vercel Inc. (USA),
        Edge-Distribution global.
        <br />
        <strong>Drittlandübermittlung:</strong> SCCs + DPA
        abgeschlossen.
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an Website-Bereitstellung).
        <br />
        <strong>Speicherdauer:</strong> bis zu 30 Tage.
      </p>

      <h3>3.6 Sentry (Fehler-Telemetrie, EU-Region — Functional Storage)</h3>
      <p>
        <strong>Daten:</strong> Fehler-Stacktrace, Browser-Information,
        URL, anonymisierter Benutzer-Identifier. Sensible Felder
        (insbesondere Grundstücksadresse, E-Mail, Passwort, Telefon,
        Chat-Inhalte) werden bereits client-seitig vor der Übertragung
        über den <code>beforeSend</code>-Hook entfernt (PII-Scrubbing).
        IP-Adressen werden gekürzt.
        <br />
        <strong>Empfänger:</strong> Functional Software, Inc. (Sentry,
        Inc.), 132 Hawthorne Street, San Francisco, CA 94107, USA.
        Verarbeitung über die EU-Instanz (sentry.io EU-Region,
        Frankfurt).
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO —
        ausschließlich nach Ihrer aktiven Einwilligung in
        <em>funktionale Cookies</em> über das Cookie-Banner.
        Auftragsverarbeitungsvertrag (Stand-DPA gemäß Art. 28 DSGVO,
        EU-Standardvertragsklauseln) abgeschlossen.
        <br />
        <strong>Aktivierung:</strong> nur nach ausdrücklicher
        Einwilligung in funktionale Cookies; ohne Einwilligung wird
        das SDK nicht geladen, es findet keine Datenverarbeitung statt.
        <br />
        <strong>Speicherdauer:</strong> 30 Tage.
      </p>

      <h3>3.7 PostHog (Produkt-Analytik, EU-Region — Analytics)</h3>
      <p>
        <strong>Daten:</strong> aufgerufene Seiten, Wizard-Funnel-Schritte,
        Anzahl Chat-Turns. <strong>Keine</strong> Grundstücksadressen,
        E-Mails oder andere PII. Keine Sitzungsaufzeichnung.
        <br />
        <strong>Empfänger:</strong> PostHog Inc., 2261 Market Street
        #4008, San Francisco, CA 94114, USA. Verarbeitung über die
        EU-Instanz (eu.i.posthog.com, Frankfurt).
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO —
        ausschließlich nach Ihrer aktiven Einwilligung in
        <em>Analyse-Cookies</em> über das Cookie-Banner. PostHog läuft
        im Cookieless-Modus (<code>persistence: 'memory'</code>) und
        setzt keine Cookies. Auftragsverarbeitungsvertrag (Stand-DPA
        gemäß Art. 28 DSGVO, EU-Standardvertragsklauseln) abgeschlossen.
        <br />
        <strong>Aktivierung:</strong> nur nach ausdrücklicher
        Einwilligung in Analyse-Cookies; ohne Einwilligung wird das
        SDK nicht geladen, es findet keine Datenverarbeitung statt.
        <br />
        <strong>Speicherdauer:</strong> 90 Tage.
      </p>

      <h3>3.8 OpenFreeMap (Karten-Tiles, nur Phase-6a-Vorschau)</h3>
      <p>
        <strong>Daten:</strong> Zoom-Level, Tile-Koordinaten,
        IP-Adresse implizit.
        <br />
        <strong>Empfänger:</strong> OpenFreeMap-Projekt, MIT-lizenziert,
        verteiltes CDN.
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an Kartendarstellung).
        <br />
        <strong>Speicherdauer:</strong> Server-Logs nach Vorgabe des
        Anbieters; OpenFreeMap führt nach eigenen Angaben keine
        Benutzer-Datenbank, keine Cookies, keine API-Keys.
      </p>

      <h3>3.9 Nominatim (Geocoding, nur Phase-6a-Vorschau)</h3>
      <p>
        <strong>Daten:</strong> die getippte Grundstücksadresse als
        Freitext, IP-Adresse implizit.
        <br />
        <strong>Empfänger:</strong> OpenStreetMap Foundation
        (Großbritannien).
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
        (technische Notwendigkeit zur Auflösung Adresse → Koordinate).
        <br />
        <strong>Speicherdauer:</strong> Server-Logs nach Vorgabe der
        OSMF.
      </p>

      <h3>3.10 Geoportal München (Bebauungsplan-Lookup, nur Phase-6a-Vorschau)</h3>
      <p>
        <strong>Daten:</strong> Geokoordinaten in EPSG:25832,
        identifizierender User-Agent unseres Edge-Function-Proxies.
        Die Grundstücksadresse selbst wird nicht übermittelt.
        <br />
        <strong>Empfänger:</strong> Landeshauptstadt München —
        Kommunalreferat — GeodatenService.
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h2>4. Cookies und ähnliche Technologien</h2>
      <p>
        Wir verwenden ausschließlich technisch notwendige Cookies
        bzw. localStorage-Einträge sowie — nach Ihrer Einwilligung —
        Analyse-Speicher. Eine vollständige Liste finden Sie auf der
        Seite{' '}
        <a href="/cookies">/cookies</a>. Ihre Einwilligung können Sie
        jederzeit über den Link „Cookie-Einstellungen“ im
        Seitenfußbereich ändern.
      </p>

      <h2>5. Ihre Rechte als betroffene Person</h2>
      <p>Sie haben jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>
          Widerruf einer erteilten Einwilligung mit Wirkung für die
          Zukunft (Art. 7 Abs. 3 DSGVO)
        </li>
      </ul>
      <p>
        Anfragen zur Ausübung dieser Rechte richten Sie bitte
        formlos per E-Mail an {'{{KONTAKT_EMAIL}}'}.
      </p>

      <h2>6. Recht auf Beschwerde bei der Aufsichtsbehörde</h2>
      <p>
        Sie haben gemäß Art. 77 DSGVO das Recht, Beschwerde bei einer
        Datenschutzaufsichtsbehörde einzulegen. Zuständig für unseren
        Sitz ist:
      </p>
      <p>
        Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)
        <br />
        Promenade 27, 91522 Ansbach
        <br />
        Telefon: +49 (0) 981 180093-0
        <br />
        E-Mail: poststelle@lda.bayern.de
      </p>

      <h2>7. Änderungen dieser Erklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung zu aktualisieren,
        soweit dies aufgrund neuer Rechtsprechung, Gesetzesänderungen,
        technischer Anpassungen oder neuer Verarbeitungszwecke
        erforderlich wird. Es gilt jeweils die zum Zeitpunkt Ihrer
        Nutzung abrufbare Version.
      </p>
    </>
  )
}

function PrivacyEn() {
  return (
    <>
      <p>
        This privacy notice describes how we process personal data
        under DSGVO (GDPR) Art. 13 and 14. The German version above
        is the legally binding one; this English version is a courtesy
        translation.
      </p>
      <h2>Controller</h2>
      <p>
        Per Art. 4 (7) GDPR: the provider listed in the Impressum
        ({'{{ANBIETER_NAME}}'}, {'{{ANBIETER_PLZ}}'}{' '}
        {'{{ANBIETER_ORT}}'}, Germany; email{' '}
        {'{{KONTAKT_EMAIL}}'}).
      </p>
      <h2>Processing activities (summary)</h2>
      <ul>
        <li>Account (email, password) — Art. 6 (1) (b) GDPR</li>
        <li>Project data, plot address, chat history — Art. 6 (1) (b)</li>
        <li>Anthropic API (US, SCCs + DPA) — Art. 6 (1) (b)</li>
        <li>Supabase (Frankfurt + US, SCCs + DPA) — Art. 6 (1) (b)</li>
        <li>Vercel hosting (SCCs + DPA) — Art. 6 (1) (f)</li>
        <li>
          Sentry EU (Functional Storage, PII-scrubbed, DPA) —
          Art. 6 (1) (a) (consent)
        </li>
        <li>
          PostHog EU (Analytics, cookieless, no session recording,
          DPA + EU SCCs) — Art. 6 (1) (a) (consent)
        </li>
        <li>OpenFreeMap basemap tiles — Art. 6 (1) (f)</li>
        <li>Nominatim geocoder — Art. 6 (1) (f)</li>
        <li>Munich Geoportal WMS (admin preview only) — Art. 6 (1) (f)</li>
      </ul>
      <h2>Your rights</h2>
      <p>
        Access, rectification, erasure, restriction, objection,
        portability, consent withdrawal — Articles 15–22 GDPR. Contact{' '}
        {'{{KONTAKT_EMAIL}}'}.
      </p>
      <h2>Supervisory authority</h2>
      <p>
        Bayerisches Landesamt für Datenschutzaufsicht (BayLDA),
        Promenade 27, 91522 Ansbach, Germany.
      </p>
    </>
  )
}
