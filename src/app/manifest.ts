import type { MetadataRoute } from 'next'

import { APP_BRAND_NAME, APP_DESCRIPTION, APP_SHORT_NAME } from '@/lib/constants'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_BRAND_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#fffcf7',
    theme_color: '#fffcf7',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
