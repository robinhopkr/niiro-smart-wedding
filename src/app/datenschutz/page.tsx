import type { Metadata } from 'next'

import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Datenschutz | NiiRo Smart Wedding',
}

export default function DatenschutzPage() {
  return (
    <LegalPageLayout
      title="Datenschutzerklärung"
      intro="Hinweise zur Verarbeitung personenbezogener Daten bei der Nutzung von NiiRo Smart Wedding."
    >
      <h2>1. Verantwortlicher</h2>
      <p>{LEGAL.companyName}</p>
      <p>{LEGAL.ownerName}</p>
      <p>E-Mail: {LEGAL.email}</p>
      <p>Telefon: {LEGAL.phone}</p>

      <h2>2. Welche Daten verarbeitet werden</h2>
      <p>
        Beim Besuch und bei der Nutzung von NiiRo Smart Wedding können insbesondere folgende Daten verarbeitet werden:
      </p>
      <ul>
        <li>technische Zugriffsdaten und Server-Logs</li>
        <li>Kontodaten von Brautpaaren und Wedding Plannern</li>
        <li>RSVP-Angaben von Gästen</li>
        <li>hochgeladene Bilder und Inhalte</li>
        <li>Zahlungsdaten im Rahmen des Stripe-Checkouts</li>
      </ul>

      <h2>3. Zwecke der Verarbeitung</h2>
      <ul>
        <li>Bereitstellung und Betrieb der Plattform</li>
        <li>Verwaltung von Einladungen, Rückmeldungen und Galerien</li>
        <li>Abwicklung der kostenpflichtigen Brautpaar-Freischaltung</li>
        <li>Missbrauchsverhinderung, Fehleranalyse und Systemsicherheit</li>
      </ul>

      <h2>4. Eingesetzte Dienstleister</h2>
      <ul>
        <li>Vercel für Hosting und Web Analytics</li>
        <li>Supabase für Datenbank, Auth-nahe Datenhaltung und Dateispeicherung</li>
        <li>Stripe für die Zahlungsabwicklung</li>
      </ul>

      <h2>5. Cookies und lokale Speicherung</h2>
      <p>
        NiiRo Smart Wedding verwendet nach aktuellem Stand keine Marketing- oder Tracking-Cookies. Eingesetzt werden
        nur technisch notwendige Speicherungen, etwa für Logins, App-Funktionalität und lokale
        Zwischenspeicherungen.
      </p>

      <h2>6. Speicherdauer</h2>
      <p>
        Personenbezogene Daten werden nur so lange gespeichert, wie sie für die Bereitstellung,
        Vertragserfüllung, Dokumentation oder aufgrund gesetzlicher Pflichten benötigt werden.
      </p>

      <h2>7. Rechte betroffener Personen</h2>
      <p>
        Betroffene Personen haben im gesetzlichen Rahmen insbesondere das Recht auf Auskunft,
        Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.
      </p>

      <h2>8. Kontakt zum Datenschutz</h2>
      <p>
        Für Datenschutzanfragen erreicht ihr uns unter {LEGAL.email}. Wenn vorhanden, sollte hier
        zusätzlich eine spezifische Datenschutz-Kontaktadresse ergänzt werden.
      </p>

      <h2>9. Stand und Prüfung</h2>
      <p>
        Diese Datenschutzerklärung ist als anpassbare Basis eingebunden und sollte vor dem endgültigen
        Live-Betrieb mit den tatsächlichen Unternehmens- und Verarbeitungsdetails geprüft werden.
      </p>
    </LegalPageLayout>
  )
}
