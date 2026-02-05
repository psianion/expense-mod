import { createClient, SupabaseClient } from '@supabase/supabase-js'

const DB_UNAVAILABLE_MSG =
  'Database unavailable. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see env.example).'

let _client: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_client) return _client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see env.example).'
    )
  }
  _client = createClient(supabaseUrl, supabaseAnonKey)
  return _client
}

/** Lazy-initialized client so the app can start without env and fail on first DB use with a clear message. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  },
})

/** Message used by API middleware to return 503 for DB/network errors. */
export const DB_UNAVAILABLE_MESSAGE = DB_UNAVAILABLE_MSG
