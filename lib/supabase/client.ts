'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates the Supabase browser client for auth (used in AuthProvider).
 * Returns null if env vars are missing.
 */
export function createSupabaseBrowserClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key)
}
