import { versionFromReleaseTag } from '@/lib/mobile/versioning'

const DEFAULT_RELEASE_REPO = 'robinhopkr/hochzeits-rsvp'
const DEFAULT_RELEASE_TAG_PREFIX = 'mobile-v'
const RELEASE_CACHE_SECONDS = 600

interface GitHubReleaseAsset {
  browser_download_url: string
  name: string
}

interface GitHubReleaseResponse {
  assets: GitHubReleaseAsset[]
  html_url: string
  published_at: string | null
  tag_name: string
}

interface MobileReleaseAsset {
  downloadUrl: string
  fileName: string
}

export interface MobileReleaseInfo {
  android: MobileReleaseAsset | null
  ios: MobileReleaseAsset | null
  publishedAt: string | null
  releaseUrl: string
  tagName: string
  version: string
}

function findReleaseAsset(
  assets: GitHubReleaseAsset[],
  predicate: (asset: GitHubReleaseAsset) => boolean,
): MobileReleaseAsset | null {
  const asset = assets.find(predicate)

  if (!asset) {
    return null
  }

  return {
    downloadUrl: asset.browser_download_url,
    fileName: asset.name,
  }
}

function readReleaseRepo() {
  return process.env.MOBILE_RELEASES_REPO ?? DEFAULT_RELEASE_REPO
}

export async function fetchLatestMobileRelease(): Promise<MobileReleaseInfo | null> {
  const repository = readReleaseRepo()
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'myWed by NiiRo AI',
    },
    next: {
      revalidate: RELEASE_CACHE_SECONDS,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed with status ${response.status}`)
  }

  const release = (await response.json()) as GitHubReleaseResponse
  const version = versionFromReleaseTag(release.tag_name, DEFAULT_RELEASE_TAG_PREFIX)

  if (!version) {
    return null
  }

  return {
    android: findReleaseAsset(
      release.assets,
      (asset) => asset.name.endsWith('.apk') || asset.name.includes('android-release'),
    ),
    ios: findReleaseAsset(
      release.assets,
      (asset) => asset.name.endsWith('.ipa') || asset.name.includes('ios'),
    ),
    publishedAt: release.published_at,
    releaseUrl: release.html_url,
    tagName: release.tag_name,
    version,
  }
}
