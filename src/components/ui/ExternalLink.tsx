'use client'

import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { forwardRef } from 'react'

interface ExternalLinkProps extends React.ComponentPropsWithoutRef<'a'> {
  href: string
}

function isExternalHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

export const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(function ExternalLink(
  { href, onClick, rel, target, ...props },
  ref,
) {
  const useExternalTarget = isExternalHttpUrl(href)

  return (
    <a
      ref={ref}
      href={href}
      rel={rel ?? (useExternalTarget ? 'noopener noreferrer' : undefined)}
      target={target ?? (useExternalTarget ? '_blank' : undefined)}
      onClick={async (event) => {
        onClick?.(event)

        if (
          event.defaultPrevented ||
          !useExternalTarget ||
          !Capacitor.isNativePlatform() ||
          !Capacitor.isPluginAvailable('Browser')
        ) {
          return
        }

        event.preventDefault()

        try {
          await Browser.open({ url: href })
        } catch {
          window.open(href, '_blank', 'noopener,noreferrer')
        }
      }}
      {...props}
    />
  )
})
