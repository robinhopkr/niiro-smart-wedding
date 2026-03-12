import type { Metadata } from 'next'

import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'AGB | NiiRo Smart Wedding',
}

export default function AgbPage() {
  return (
    <LegalPageLayout
      title="Allgemeine Geschäftsbedingungen"
      intro="Muster-AGB für die Nutzung von NiiRo Smart Wedding durch Brautpaare und Wedding Planner."
    >
      <h2>1. Geltungsbereich</h2>
      <p>
        Diese AGB gelten für die Nutzung von NiiRo Smart Wedding durch Brautpaare und Wedding Planner.
        Der Gästebereich ist für Gäste kostenfrei nutzbar.
      </p>

      <h2>2. Vertragspartner</h2>
      <p>
        Vertragspartner ist {LEGAL.companyName}, vertreten durch {LEGAL.ownerName}.
      </p>

      <h2>3. Leistungsbeschreibung</h2>
      <p>
        NiiRo Smart Wedding bietet digitale Hochzeitsseiten mit RSVP, Inhaltsverwaltung, Galerie, Zugängen und
        optionalen Planungsfunktionen. Der konkrete Funktionsumfang ergibt sich aus der jeweils
        bereitgestellten App-Version.
      </p>

      <h2>4. Registrierung und Freischaltung</h2>
      <p>
        Brautpaare registrieren ihr Konto selbst. Der Zugriff auf den geschützten Paarbereich wird
        erst nach erfolgreicher kostenpflichtiger Freischaltung aktiviert. Wedding Planner erhalten
        Zugriff nur auf Hochzeiten, die ihnen vom Brautpaar freigegeben wurden.
      </p>

      <h2>5. Preise und Zahlung</h2>
      <p>
        Es gilt der zum Zeitpunkt des Kaufs angezeigte Preis. Die Zahlung erfolgt über Stripe.
        Ohne erfolgreiche Zahlung besteht kein Anspruch auf Nutzung des kostenpflichtigen Paarbereichs.
      </p>

      <h2>6. Mitwirkungspflichten</h2>
      <p>
        Nutzerinnen und Nutzer sind dafür verantwortlich, rechtlich zulässige Inhalte einzustellen,
        Zugangsdaten vertraulich zu behandeln und hochgeladene Inhalte nur mit den erforderlichen
        Rechten zu verwenden.
      </p>

      <h2>7. Verfügbarkeit</h2>
      <p>
        Wir bemühen uns um eine hohe Verfügbarkeit der Plattform. Vorübergehende Einschränkungen,
        etwa wegen Wartung, Sicherheitsmaßnahmen oder externer Dienstleister, bleiben vorbehalten.
      </p>

      <h2>8. Haftung</h2>
      <p>
        Für Vorsatz und grobe Fahrlässigkeit haften wir unbeschränkt. Im Übrigen gelten die
        gesetzlichen Haftungsregelungen; eine individuelle juristische Prüfung dieser Klausel ist
        vor dem endgültigen Live-Betrieb empfehlenswert.
      </p>

      <h2>9. Schlussbestimmungen</h2>
      <p>
        Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit
        der übrigen Regelungen unberührt.
      </p>
    </LegalPageLayout>
  )
}
