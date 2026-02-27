'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const APP_MODE = (process.env.NEXT_PUBLIC_APP_MODE || 'PUBLIC') as string
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_EMAIL = 'demo@expense-tracker.app'

export interface AuthUser {
  userId: string
  email: string | null
  displayName: string | null
  isMaster: boolean
  isDemo: boolean
  needsOnboarding: boolean
  roles: string[]
}

interface AuthContextValue {
  user: AuthUser | null
  supabaseUser: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isMaster: boolean
  isDemo: boolean
  needsOnboarding: boolean
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export function useAuth(): AuthContextValue {
  return useAuthContext()
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [serverUser, setServerUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isDemoMode = APP_MODE === 'DEMO'

  const mergedUser: AuthUser | null = useMemo(() => {
    if (isDemoMode) {
      return {
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        displayName: 'Demo User',
        isMaster: false,
        isDemo: true,
        needsOnboarding: false,
        roles: ['user'],
      }
    }
    if (serverUser) return serverUser
    if (supabaseUser) {
      return {
        userId: supabaseUser.id,
        email: supabaseUser.email ?? null,
        displayName: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? null,
        isMaster: false,
        isDemo: false,
        needsOnboarding: true, // Will be overwritten when serverUser loads
        roles: ['user'],
      }
    }
    return null
  }, [isDemoMode, serverUser, supabaseUser])

  const isAuthenticated = !!mergedUser

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data?.data?.user) {
          setServerUser(data.data.user)
          return
        }
      }
      setServerUser(null)
    } catch {
      setServerUser(null)
    }
  }, [])

  useEffect(() => {
    if (isDemoMode) {
      setIsLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        fetchMe().finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        fetchMe()
      } else {
        setServerUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [isDemoMode, fetchMe])

  const signInWithOtp = useCallback(async (email: string) => {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return { error: new Error('Supabase not configured') as Error }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined },
    })
    return { error: error as Error | null }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return { error: new Error('Supabase not configured') as Error }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined },
    })
    return { error: error as Error | null }
  }, [])

  const signOut = useCallback(async () => {
    if (isDemoMode) return
    const supabase = createSupabaseBrowserClient()
    if (supabase) await supabase.auth.signOut()
    setSupabaseUser(null)
    setServerUser(null)
  }, [isDemoMode])

  const value: AuthContextValue = useMemo(
    () => ({
      user: mergedUser,
      supabaseUser,
      isLoading,
      isAuthenticated,
      isMaster: mergedUser?.isMaster ?? false,
      isDemo: mergedUser?.isDemo ?? false,
      needsOnboarding: mergedUser?.needsOnboarding ?? false,
      signInWithOtp,
      signInWithGoogle,
      signOut,
    }),
    [
      mergedUser,
      supabaseUser,
      isLoading,
      isAuthenticated,
      signInWithOtp,
      signInWithGoogle,
      signOut,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
