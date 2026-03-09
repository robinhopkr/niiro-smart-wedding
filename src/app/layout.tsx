import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'sonner'

import { AppUpdatePrompt } from '@/components/mobile/AppUpdatePrompt'
import { APP_BRAND_NAME, APP_DESCRIPTION, ENV } from '@/lib/constants'
import { fontBody, fontDisplay } from '@/lib/fonts'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(ENV.appUrl),
  applicationName: APP_BRAND_NAME,
  title: APP_BRAND_NAME,
  description: APP_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: APP_BRAND_NAME,
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: APP_BRAND_NAME,
    description: APP_DESCRIPTION,
    url: ENV.appUrl,
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: APP_BRAND_NAME,
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fffcf7',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="de" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body className="font-body bg-cream-50 text-charcoal-800 antialiased">
        {children}
        <AppUpdatePrompt />
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  )
}
