const VERSION_PATTERN = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/u

export interface ParsedVersion {
  major: number
  minor: number
  patch: number
}

export function normalizeVersionString(input: string): string | null {
  const match = input.match(VERSION_PATTERN)

  if (!match) {
    return null
  }

  const major = Number(match[1] ?? 0)
  const minor = Number(match[2] ?? 0)
  const patch = Number(match[3] ?? 0)

  return `${major}.${minor}.${patch}`
}

export function parseVersion(input: string): ParsedVersion | null {
  const normalized = normalizeVersionString(input)

  if (!normalized) {
    return null
  }

  const segments = normalized.split('.').map((segment) => Number(segment))
  const major = segments[0] ?? 0
  const minor = segments[1] ?? 0
  const patch = segments[2] ?? 0

  return {
    major,
    minor,
    patch,
  }
}

export function compareVersions(left: string, right: string): number {
  const parsedLeft = parseVersion(left)
  const parsedRight = parseVersion(right)

  if (!parsedLeft || !parsedRight) {
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  }

  if (parsedLeft.major !== parsedRight.major) {
    return parsedLeft.major - parsedRight.major
  }

  if (parsedLeft.minor !== parsedRight.minor) {
    return parsedLeft.minor - parsedRight.minor
  }

  return parsedLeft.patch - parsedRight.patch
}

export function buildVersionCode(input: string): number | null {
  const parsedVersion = parseVersion(input)

  if (!parsedVersion) {
    return null
  }

  return parsedVersion.major * 10_000 + parsedVersion.minor * 100 + parsedVersion.patch
}

export function versionFromReleaseTag(tagName: string, prefix = 'mobile-v'): string | null {
  const versionCandidate = tagName.startsWith(prefix) ? tagName.slice(prefix.length) : tagName

  return normalizeVersionString(versionCandidate)
}
