import type { Metadata } from 'next'

import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { LEGAL, LEGAL_ADDRESS_LINES } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Impressum | NiiRo Smart Wedding',
}

export default function ImpressumPage() {
  return (
    <LegalPageLayout
      title="Impressum"
      intro="Anbieterkennzeichnung und Kontaktdaten für NiiRo Smart Wedding."
    >
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>{LEGAL.companyName}</p>
      <p>{LEGAL.ownerName}</p>
      {LEGAL_ADDRESS_LINES.map((line) => (
        <p key={line}>{line}</p>
      ))}

      <h2>Kontakt</h2>
      <p>Telefon: {LEGAL.phone}</p>
      <p>E-Mail: {LEGAL.email}</p>
      <p>Website: {LEGAL.appUrl}</p>

      <h2>Vertretungsberechtigte Person</h2>
      <p>{LEGAL.ownerName}</p>

      {LEGAL.vatId ? (
        <>
          <h2>Umsatzsteuer-ID</h2>
          <p>{LEGAL.vatId}</p>
        </>
      ) : null}

      {LEGAL.registerCourt || LEGAL.registerNumber ? (
        <>
          <h2>Registereintrag</h2>
          {LEGAL.registerCourt ? <p>Registergericht: {LEGAL.registerCourt}</p> : null}
          {LEGAL.registerNumber ? <p>Registernummer: {LEGAL.registerNumber}</p> : null}
        </>
      ) : null}

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>{LEGAL.responsiblePerson}</p>
      {LEGAL_ADDRESS_LINES.map((line) => (
        <p key={`responsible-${line}`}>{line}</p>
      ))}

      <h2>Hinweis</h2>
      <p>
        Dieses Impressum ist technisch eingebunden, ersetzt aber keine individuelle rechtliche Prüfung.
      </p>
    </LegalPageLayout>
  )
}
