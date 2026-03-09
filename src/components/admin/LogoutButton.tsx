'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '../ui/Button'

export function LogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogout() {
    setIsLoading(true)
    await fetch('/api/admin/logout', {
      method: 'POST',
    })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <Button loading={isLoading} type="button" variant="ghost" onClick={handleLogout}>
      Abmelden
    </Button>
  )
}
