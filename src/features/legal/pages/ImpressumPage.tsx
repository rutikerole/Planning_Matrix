// Phase 8 — Impressum per § 5 DDG / § 18 Abs. 2 MStV.
//
// PLACEHOLDERS marked {{...}} must be filled by Rutik before this
// page goes public. See docs/launch-checklist.md for the full list.
//
// Mandatory fields per § 5 DDG (formerly TMG):
//   1. Vollständiger Name
//   2. Ladungsfähige Anschrift (postal address)
//   3. Telefonnummer
//   4. E-Mail-Adresse (in plain text — NOT mailto-only per BGH 2008)
//   5. Handelsregistereintrag (if applicable)
//   6. USt-IdNr. (if applicable for EU transactions)
//
// For a single-founder pre-revenue B2B SaaS, fields 5–6 are typically
// "nicht zutreffend" — clearly state that rather than omit silently.

import { useTranslation } from 'react-i18next'
import { LegalPageLayout } from '../components/LegalPageLayout'
import { getLegalConfig, type LegalConfigValues, type LegalConfigKey } from '../lib/legalConfig'
import { LegalConfigUnavailable } from '../components/LegalConfigUnavailable'

const LAST_UPDATED = '2026-05-08'

export function ImpressumPage() {
  const { i18n } = useTranslation()
  const isEn = (i18n.resolvedLanguage ?? 'de') === 'en'
  const cfg = getLegalConfig()
  return (
    <LegalPageLayout
      eyebrow={isEn ? 'Legal notice' : 'Rechtliches'}
      headline="Impressum"
      lastUpdated={LAST_UPDATED}
    >
      {isEn
        ? <ImprintEn cfg={cfg} />
        : <ImprintDe cfg={cfg} />}
    </LegalPageLayout>
  )
}

type Cfg =
  | { ok: true; values: LegalConfigValues }
  | { ok: false; missing: LegalConfigKey[] }

function ImprintDe({ cfg }: { cfg: Cfg }) {
  return (
    <>
      <p>
        Angaben gemäß § 5 DDG (vormals § 5 TMG) sowie § 18 Abs. 2 MStV.
        Die folgenden Angaben sind zwingend für jede gewerblich oder
        ähnlich genutzte deutsche Webseite.
      </p>

      <h2>Anbieter und verantwortlich für den Inhalt</h2>
      {cfg.ok ? (
        <p>
          <strong>{cfg.values.anbieterName}</strong>
          <br />
          {cfg.values.anbieterStrasseHausnummer}
          <br />
          {cfg.values.anbieterPlz} {cfg.values.anbieterOrt}
          <br />
          Deutschland
        </p>
      ) : (
        <LegalConfigUnavailable missing={cfg.missing} />
      )}

      <h2>Kontakt</h2>
      {cfg.ok ? (
        <p>
          Telefon: {cfg.values.kontaktTelefon}
          <br />
          E-Mail: {cfg.values.kontaktEmail}
        </p>
      ) : (
        <LegalConfigUnavailable missing={cfg.missing} />
      )}

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      {cfg.ok ? (
        <p>{cfg.values.anbieterName}, Anschrift wie oben.</p>
      ) : (
        <LegalConfigUnavailable missing={cfg.missing} />
      )}

      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      {cfg.ok ? (
        <p>
          Eine Umsatzsteuer-Identifikationsnummer nach § 27a UStG ist
          nicht vorhanden ({cfg.values.ustIdHinweis}). Sobald eine
          USt-IdNr. erteilt wurde, wird sie hier ergänzt.
        </p>
      ) : (
        <LegalConfigUnavailable missing={cfg.missing} />
      )}

      <h2>Handelsregister / Berufsbezeichnung</h2>
      {cfg.ok ? (
        <p>
          Eintragung im Handelsregister: {cfg.values.handelsregisterHinweis}.
          Berufsbezeichnung und kammerrechtliche Aufsicht entfallen, da
          Planning Matrix kein reglementiertes Beratungsangebot im Sinne
          einer berufsrechtlichen Kammer erbringt.
        </p>
      ) : (
        <LegalConfigUnavailable missing={cfg.missing} />
      )}

      <h2>Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr
        </a>
        . Wir sind nicht bereit oder verpflichtet, an
        Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene
        Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
        verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
        Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
        gespeicherte fremde Informationen zu überwachen oder nach
        Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
        hinweisen.
      </p>
      <p>
        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
        Informationen nach den allgemeinen Gesetzen bleiben hiervon
        unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem
        Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung
        möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen
        werden wir diese Inhalte umgehend entfernen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Webseiten Dritter, auf
        deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
        diese fremden Inhalte auch keine Gewähr übernehmen. Für die
        Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
        oder Betreiber der Seiten verantwortlich. Die verlinkten
        Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
        Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum
        Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente
        inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne
        konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar.
        Bei Bekanntwerden von Rechtsverletzungen werden wir
        derartige Links umgehend entfernen.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
        diesen Seiten unterliegen dem deutschen Urheberrecht. Die
        Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
        Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen
        der schriftlichen Zustimmung des jeweiligen Autors bzw.
        Erstellers. Downloads und Kopien dieser Seite sind nur für den
        privaten, nicht kommerziellen Gebrauch gestattet.
      </p>
      <p>
        Soweit die Inhalte auf dieser Seite nicht vom Betreiber
        erstellt wurden, werden die Urheberrechte Dritter beachtet.
        Insbesondere werden Inhalte Dritter als solche gekennzeichnet.
        Sollten Sie trotzdem auf eine Urheberrechtsverletzung
        aufmerksam werden, bitten wir um einen entsprechenden Hinweis.
        Bei Bekanntwerden von Rechtsverletzungen werden wir derartige
        Inhalte umgehend entfernen.
      </p>
    </>
  )
}

function ImprintEn({ cfg }: { cfg: Cfg }) {
  return (
    <>
      <p>
        Information pursuant to § 5 DDG (formerly § 5 TMG) and § 18
        para. 2 MStV. The fields below are mandatory for any commercial
        German website. The German version of this page is the
        legally binding one; this English translation is provided as a
        courtesy.
      </p>
      <h2>Provider and content responsibility</h2>
      {cfg.ok ? (
        <p>
          <strong>{cfg.values.anbieterName}</strong>
          <br />
          {cfg.values.anbieterStrasseHausnummer}
          <br />
          {cfg.values.anbieterPlz} {cfg.values.anbieterOrt}
          <br />
          Germany
        </p>
      ) : (
        <LegalConfigUnavailable missing={cfg.missing} />
      )}
      <h2>Contact</h2>
      {cfg.ok ? (
        <p>
          Telephone: {cfg.values.kontaktTelefon}
          <br />
          Email: {cfg.values.kontaktEmail}
        </p>
      ) : (
        <LegalConfigUnavailable missing={cfg.missing} />
      )}
      <h2>VAT ID / Commercial register</h2>
      <p>
        No VAT ID under § 27a UStG has been issued; no commercial
        register entry currently applies. These fields are added
        promptly when issued.
      </p>
      <h2>Online dispute resolution</h2>
      <p>
        The European Commission provides a platform for online dispute
        resolution at{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr
        </a>
        . We are neither willing nor obliged to participate in dispute
        resolution proceedings before a consumer arbitration board
        (§ 36 VSBG).
      </p>
      <h2>Liability — content, links, copyright</h2>
      <p>
        Standard German § 7–10 DDG disclaimers apply. The German text
        above is binding.
      </p>
    </>
  )
}
