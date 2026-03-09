import { NextResponse } from 'next/server'

import { fetchLatestMobileRelease } from '@/lib/mobile/releases'

export async function GET() {
  try {
    const release = await fetchLatestMobileRelease()

    return NextResponse.json(
      {
        success: true,
        data: {
          enabled: Boolean(release),
          release,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      },
    )
  } catch (error) {
    console.error('[mobile-update] release lookup failed', error)

    return NextResponse.json(
      {
        success: true,
        data: {
          enabled: false,
          release: null,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15',
        },
      },
    )
  }
}
