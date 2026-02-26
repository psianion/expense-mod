import { createClient, SupabaseClient } from '@supabase/supabase-js'

const DB_UNAVAILABLE_MSG =
  'Database unavailable. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example).'

let _client: SupabaseClient | null = null
let _serviceClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_client) return _client
  const proxyUrl = process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL
  const supabaseUrl = proxyUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example).'
    )
  }
  _client = createClient(supabaseUrl, supabaseAnonKey)
  return _client
}

/**
 * Service role client (bypasses RLS). Server-only; never expose to client.
 * Used for: admin operations, master mode data access, loading user roles in auth context.
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function getServiceRoleClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient
  const proxyUrl = process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL
  const supabaseUrl = proxyUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing service role configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  _serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  return _serviceClient
}

/**
 * Returns service role client when SUPABASE_SERVICE_ROLE_KEY is set, otherwise null.
 * Use with getSupabase() as fallback for local dev without the key.
 */
export function getServiceRoleClientIfAvailable(): SupabaseClient | null {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getServiceRoleClient()
  }
  return null
}

/** Lazy-initialized client so the app can start without env and fail on first DB use with a clear message. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  },
})

/** Message used by API middleware to return 503 for DB/network errors. */
export const DB_UNAVAILABLE_MESSAGE = DB_UNAVAILABLE_MSG
