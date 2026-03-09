'use client'

import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Download, RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { compareVersions } from '@/lib/mobile/versioning'

interface ReleaseAsset {
  downloadUrl: string
  fileName: string
}

interface MobileReleaseInfo {
  android: ReleaseAsset | null
  ios: ReleaseAsset | null
  publishedAt: string | null
  releaseUrl: string
  tagName: string
  version: string
}

interface MobileUpdateResponse {
  success: boolean
  data: {
    enabled: boolean
    release: MobileReleaseInfo | null
  }
}

interface AvailableUpdate {
  currentVersion: string
  downloadUrl: string
  latestVersion: string
  releaseUrl: string
}

const DISMISSED_VERSION_STORAGE_KEY = 'mywed-mobile-dismissed-version'

function readDismissedVersion(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_VERSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistDismissedVersion(version: string) {
  try {
    window.localStorage.setItem(DISMISSED_VERSION_STORAGE_KEY, version)
  } catch {
    // Ignore storage restrictions.
  }
}

function resolveDownloadUrl(platform: string, release: MobileReleaseInfo): string | null {
  if (platform === 'android') {
    return release.android?.downloadUrl ?? null
  }

  if (platform === 'ios') {
    return release.ios?.downloadUrl ?? null
  }

  return null
}

export function AppUpdatePrompt() {
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null)
  const [isOpening, setIsOpening] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    let isMounted = true

    const checkForUpdate = async () => {
      try {
        const platform = Capacitor.getPlatform()

        if (platform !== 'android' && platform !== 'ios') {
          return
        }

        const response = await fetch('/api/mobile-update', { cache: 'no-store' })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as MobileUpdateResponse
        const release = payload.data.release
        const latestVersion = release?.version

        if (!payload.data.enabled || !release || !latestVersion) {
          if (isMounted) {
            setAvailableUpdate(null)
          }

          return
        }

        const downloadUrl = resolveDownloadUrl(platform, release)
        const hasAppPlugin = Capacitor.isPluginAvailable('App')

        if (!downloadUrl) {
          if (isMounted) {
            setAvailableUpdate(null)
          }

          return
        }

        let currentVersion = 'Legacy-Build'

        if (hasAppPlugin) {
          const appInfo = await App.getInfo()
          currentVersion = appInfo.version

          if (compareVersions(latestVersion, appInfo.version) <= 0) {
            if (isMounted) {
              setAvailableUpdate(null)
            }

            return
          }
        } else if (platform !== 'android') {
          if (isMounted) {
            setAvailableUpdate(null)
          }

          return
        }

        if (readDismissedVersion() === latestVersion) {
          return
        }

        if (isMounted) {
          setAvailableUpdate({
            currentVersion,
            downloadUrl,
            latestVersion,
            releaseUrl: release.releaseUrl,
          })
        }
      } catch (error) {
        console.error('[mobile-update] check failed', error)
      }
    }

    void checkForUpdate()

    const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void checkForUpdate()
      }
    })

    return () => {
      isMounted = false
      void listenerPromise.then((listener) => listener.remove())
    }
  }, [])

  if (!availableUpdate) {
    return null
  }

  const handleDismiss = () => {
    persistDismissedVersion(availableUpdate.latestVersion)
    setAvailableUpdate(null)
  }

  const openExternalUrl = async (url: string) => {
    setIsOpening(true)

    try {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Browser')) {
        await Browser.open({ url })
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[70] mx-auto w-full max-w-lg rounded-[2rem] border border-gold-200 bg-white/95 p-5 shadow-elegant backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
          <RefreshCw className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-700">
              Update verfuegbar
            </p>
            <h2 className="font-display text-xl text-charcoal-900">
              Version {availableUpdate.latestVersion} ist bereit
            </h2>
            <p className="text-sm text-charcoal-600">
              Die Inhalte sind zwar immer live, dieses Update bringt aber neue native Verbesserungen
              fuer die App. Aktuell installiert: {availableUpdate.currentVersion}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="min-w-[10rem]"
              loading={isOpening}
              type="button"
              onClick={() => void openExternalUrl(availableUpdate.downloadUrl)}
            >
              <Download className="h-4 w-4" />
              Update laden
            </Button>
            <Button type="button" variant="secondary" onClick={handleDismiss}>
              Spaeter
            </Button>
            <button
              className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-charcoal-600 transition hover:text-charcoal-900"
              type="button"
              onClick={() => void openExternalUrl(availableUpdate.releaseUrl)}
            >
              Release ansehen
            </button>
          </div>
        </div>

        <button
          aria-label="Update-Hinweis schliessen"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-charcoal-500 transition hover:bg-cream-100 hover:text-charcoal-900"
          type="button"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
