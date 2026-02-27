'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from './AuthProvider'

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || 'PUBLIC'
const LOGIN_PATH = '/login'
const ONBOARDING_PATH = '/onboarding'
const PUBLIC_PATHS = [LOGIN_PATH, ONBOARDING_PATH, '/auth/callback']

interface AuthGuardProps {
  children: ReactNode
}

/**
 * Redirects to /login when not authenticated (PUBLIC/MASTER only).
 * Redirects to /onboarding when authenticated but needsOnboarding is true.
 * DEMO mode and public paths are always allowed.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname?.startsWith(p))

  useEffect(() => {
    if (APP_MODE === 'DEMO') return
    if (isPublicPath) return
    if (isLoading) return
    if (!isAuthenticated) {
      const returnTo = pathname && pathname !== '/' ? `?returnTo=${encodeURIComponent(pathname)}` : ''
      router.replace(`${LOGIN_PATH}${returnTo}`)
      return
    }
    if (needsOnboarding && pathname !== ONBOARDING_PATH) {
      router.replace(ONBOARDING_PATH)
    }
  }, [isAuthenticated, isLoading, isPublicPath, needsOnboarding, pathname, router])

  if (APP_MODE === 'DEMO') return <>{children}</>
  if (isPublicPath) return <>{children}</>
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
