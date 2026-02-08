'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from './AuthProvider'

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || 'PUBLIC'
const LOGIN_PATH = '/login'

interface AuthGuardProps {
  children: ReactNode
}

/**
 * Redirects to /login when not authenticated (PUBLIC/MASTER only).
 * DEMO mode and /login path are always allowed.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (APP_MODE === 'DEMO') return
    if (pathname === LOGIN_PATH) return
    if (isLoading) return
    if (!isAuthenticated) {
      const returnTo = pathname && pathname !== '/' ? `?returnTo=${encodeURIComponent(pathname)}` : ''
      router.replace(`${LOGIN_PATH}${returnTo}`)
    }
  }, [isAuthenticated, isLoading, pathname, router])

  if (APP_MODE === 'DEMO') return <>{children}</>
  if (pathname === LOGIN_PATH) return <>{children}</>
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
