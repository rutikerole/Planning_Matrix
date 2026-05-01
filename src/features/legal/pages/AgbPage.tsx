// Phase 8 — Allgemeine Geschäftsbedingungen (AGB).
//
// B2B SaaS terms with explicit scope-of-service clause matching the
// system prompt's Vorbehaltsklausel ("ersetzt nicht die Beratung
// durch eine/n Bauvorlageberechtigte/n Architekt/in"). Consistent
// legal posture across product + legal pages.

import { useTranslation } from 'react-i18next'
import { LegalPageLayout } from '../components/LegalPageLayout'

const LAST_UPDATED = '2026-05-01'

export function AgbPage() {
  const { i18n } = useTranslation()
  const isEn = (i18n.resolvedLanguage ?? 'de') === 'en'
  return (
    <LegalPageLayout
      eyebrow={isEn ? 'Terms' : 'Rechtliches'}
      headline={isEn ? 'Terms of service' : 'Allgemeine Geschäftsbedingungen'}
      lastUpdated={LAST_UPDATED}
    >
      {isEn ? <AgbEn /> : <AgbDe />}
    </LegalPageLayout>
  )
}

function AgbDe() {
  return (
    <>
      <p>
        Die folgenden Allgemeinen Geschäftsbedingungen (AGB) regeln
        die Nutzung der Webanwendung „Planning Matrix“ (nachfolgend
        „die Anwendung“) zwischen Ihnen als Nutzer und dem im
        Impressum genannten Anbieter (nachfolgend „der Anbieter“).
      </p>

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese AGB gelten für alle Geschäftsbeziehungen zwischen dem
        Anbieter und dem Nutzer im Zusammenhang mit der Nutzung der
        Anwendung. Die Anwendung richtet sich ausschließlich an
        gewerbliche Nutzer im Sinne des § 14 BGB (Unternehmer) sowie
        an Bauherren, die das Vorhaben in Vorbereitung einer
        gewerblichen oder beruflichen Tätigkeit nutzen. Eine Nutzung
        durch Verbraucher im Sinne des § 13 BGB ist
        ausgeschlossen.
      </p>

      <h2>2. Vertragsschluss</h2>
      <p>
        Der Nutzungsvertrag kommt durch die Registrierung eines Kontos
        und die ausdrückliche Annahme dieser AGB zustande. Die
        Anwendung steht in der aktuellen Version 1.0 als technische
        Vorschau bereit; eine Verfügbarkeitsgarantie wird nicht
        zugesichert.
      </p>

      <h2>3. Leistungsbeschreibung — keine Rechts- oder Bauberatung</h2>
      <p>
        <strong>
          Die Anwendung erbringt entscheidungsunterstützende Hinweise
          und ersetzt nicht die Beratung durch eine/n
          Bauvorlageberechtigte/n Architekt/in oder eine
          Rechtsanwältin/einen Rechtsanwalt. Die finale rechtliche
          Verantwortung liegt beim Bauherrn und bei den von ihm
          beauftragten Fachpersonen.
        </strong>
      </p>
      <p>
        Die Anwendung kartiert auf Basis der vom Nutzer
        bereitgestellten Vorhabensdaten typische Genehmigungswege,
        Verfahrensarten, erforderliche Nachweise und Fachplaner-Rollen
        nach bayerischem und kommunalem Bau-, Planungs- und
        Denkmalrecht. Sämtliche Angaben sind Orientierungswerte. Sie
        ersetzen keinesfalls:
      </p>
      <ul>
        <li>
          die rechtsverbindliche Beauskunftung durch das zuständige
          Bauamt,
        </li>
        <li>
          die Bauvorlageberechtigung im Sinne des Art. 61 BayBO, die
          ausschließlich eingetragenen Architektinnen / Architekten
          sowie eingetragenen Bauingenieurinnen / Bauingenieuren
          obliegt,
        </li>
        <li>
          eine anwaltliche Beratung in baurechtlichen
          Streitfragen.
        </li>
      </ul>

      <h2>4. Vergütung</h2>
      <p>
        Die Anwendung wird in der aktuellen Vorschau-Version
        unentgeltlich bereitgestellt. Eine zukünftige
        Entgeltlichkeit (z. B. Abonnement-Modell) wird mit
        angemessener Vorlaufzeit angekündigt; Sie haben jederzeit das
        Recht, den Vertrag bei Einführung einer Vergütung
        unverzüglich zu beenden.
      </p>

      <h2>5. Nutzungsumfang und Verfügbarkeit</h2>
      <p>
        Der Anbieter ist bemüht, die Anwendung mit hoher Verfügbarkeit
        zu betreiben, garantiert jedoch keine bestimmten
        Verfügbarkeitsquoten. Wartungsarbeiten und betriebsbedingte
        Unterbrechungen sind möglich. Die KI-gestützten Antworten
        beruhen auf einem Sprachmodell der Anthropic, PBC; deren
        Verfügbarkeit liegt außerhalb unserer unmittelbaren
        Kontrolle.
      </p>

      <h2>6. Haftung</h2>
      <p>
        Der Anbieter haftet nach den gesetzlichen Vorschriften für
        Schäden aus der Verletzung des Lebens, des Körpers oder der
        Gesundheit, die auf einer fahrlässigen Pflichtverletzung des
        Anbieters oder einer vorsätzlichen oder fahrlässigen
        Pflichtverletzung eines gesetzlichen Vertreters oder
        Erfüllungsgehilfen des Anbieters beruhen.
      </p>
      <p>
        Im Übrigen haftet der Anbieter ausschließlich nach folgenden
        Maßgaben:
      </p>
      <ul>
        <li>
          Bei Vorsatz und grober Fahrlässigkeit nach den gesetzlichen
          Vorschriften.
        </li>
        <li>
          Bei einfacher Fahrlässigkeit nur bei Verletzung wesentlicher
          Vertragspflichten (Kardinalpflichten), und in diesem Fall
          beschränkt auf den vorhersehbaren, vertragstypischen Schaden.
        </li>
      </ul>
      <p>
        Eine darüber hinausgehende Haftung — insbesondere für
        Folgeschäden, mittelbare Schäden, entgangenen Gewinn oder
        Schäden infolge von Genehmigungsentscheidungen, die sich auf
        Hinweise der Anwendung gestützt haben — ist ausgeschlossen,
        soweit gesetzlich zulässig.
      </p>

      <h2>7. Datenschutz</h2>
      <p>
        Die Verarbeitung personenbezogener Daten ist in der gesonderten{' '}
        <a href="/datenschutz">Datenschutzerklärung</a> beschrieben.
      </p>

      <h2>8. Schlussbestimmungen</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland unter
        Ausschluss des UN-Kaufrechts. Ausschließlicher Gerichtsstand
        für alle Streitigkeiten aus oder im Zusammenhang mit diesen
        AGB ist — soweit der Nutzer Kaufmann, juristische Person des
        öffentlichen Rechts oder öffentlich-rechtliches
        Sondervermögen ist — der Sitz des Anbieters. Sollten einzelne
        Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die
        Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>

      <h2>9. Änderungen dieser AGB</h2>
      <p>
        Der Anbieter behält sich vor, diese AGB mit Wirkung für die
        Zukunft zu ändern. Über Änderungen werden Sie per E-Mail oder
        in der Anwendung informiert; die geänderten AGB gelten als
        angenommen, wenn Sie ihnen nicht innerhalb von vier Wochen
        nach Mitteilung widersprechen.
      </p>
    </>
  )
}

function AgbEn() {
  return (
    <>
      <p>
        These Terms of Service govern the use of the Planning Matrix
        web application. The German version above is the legally
        binding one; this English version is a courtesy translation.
      </p>
      <h2>Scope</h2>
      <p>
        Available to commercial users (B2B) in accordance with § 14
        BGB. Use by consumers under § 13 BGB is excluded.
      </p>
      <h2>Service description — not legal or building advice</h2>
      <p>
        <strong>
          The application provides decision-support guidance and does
          not replace consultation by a licensed German architect
          (Bauvorlageberechtigte/r) or a lawyer. Final legal
          responsibility rests with the building owner and their
          appointed professionals.
        </strong>
      </p>
      <h2>Liability</h2>
      <p>
        Standard German B2B SaaS liability framework — full liability
        for intent / gross negligence; for ordinary negligence only
        in case of breach of cardinal contractual duties, capped to
        foreseeable contract-typical damage.
      </p>
      <h2>Governing law</h2>
      <p>
        German law applies, excluding the UN Convention on Contracts
        for the International Sale of Goods. Place of jurisdiction is
        the provider's registered office.
      </p>
    </>
  )
}
