import Link from 'next/link'

export function Footer({
  coupleLabel,
  weddingDate,
}: {
  coupleLabel: string
  weddingDate?: string | null
}) {
  const parsedWeddingDate = weddingDate ? new Date(weddingDate) : null
  const year =
    parsedWeddingDate && !Number.isNaN(parsedWeddingDate.getTime())
      ? parsedWeddingDate.getFullYear()
      : new Date().getFullYear()

  return (
    <footer className="wedding-footer">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-charcoal-600 sm:px-10 md:flex-row md:items-center md:justify-between">
        <p>{coupleLabel} · {year}</p>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <p>Datenschutzfreundlich umgesetzt: keine Tracking-Cookies, nur funktionale Speicherung und Vercel Analytics.</p>
          <div className="flex flex-wrap gap-4">
            <Link className="font-semibold text-gold-700 hover:text-gold-800" href="/impressum">
              Impressum
            </Link>
            <Link className="font-semibold text-gold-700 hover:text-gold-800" href="/datenschutz">
              Datenschutz
            </Link>
            <Link className="font-semibold text-gold-700 hover:text-gold-800" href="/agb">
              AGB
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
