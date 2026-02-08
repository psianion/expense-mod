/**
 * Application configuration and startup validation.
 * Validates app mode, auth-related env vars, and DEMO_USER_ID format.
 */

const APP_MODES = ['PUBLIC', 'MASTER', 'DEMO'] as const
export type AppMode = (typeof APP_MODES)[number]

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates auth and app mode configuration at startup.
 * Call early (e.g. from API route or server entry) to fail fast on misconfiguration.
 */
export function validateAuthConfig(): void {
  const appMode = (process.env.NEXT_PUBLIC_APP_MODE || 'PUBLIC') as AppMode

  if (!APP_MODES.includes(appMode)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_APP_MODE: ${appMode}. Must be one of: ${APP_MODES.join(', ')}.`
    )
  }

  if (appMode === 'DEMO') {
    const demoUserId = process.env.DEMO_USER_ID
    if (demoUserId && !UUID_REGEX.test(demoUserId)) {
      throw new Error(`DEMO_USER_ID must be a valid UUID: ${demoUserId}`)
    }
    // When DEMO is implied (no service role key), DEMO_USER_ID is optional (default used)
  }

  if (appMode === 'MASTER' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      'MASTER mode without SUPABASE_SERVICE_ROLE_KEY: Will use anon key (limited access)'
    )
  }

  if (process.env.DEMO_USER_ID && !UUID_REGEX.test(process.env.DEMO_USER_ID)) {
    throw new Error(
      `DEMO_USER_ID must be a valid UUID: ${process.env.DEMO_USER_ID}`
    )
  }
}

/**
 * Returns the current app mode.
 * When SUPABASE_SERVICE_ROLE_KEY is not set, defaults to DEMO so the app runs with anon key only.
 */
export function getAppMode(): AppMode {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return 'DEMO'
  }
  const mode = (process.env.NEXT_PUBLIC_APP_MODE || 'PUBLIC') as AppMode
  return APP_MODES.includes(mode) ? mode : 'PUBLIC'
}

/** Default demo user ID when running in DEMO mode without DEMO_USER_ID set. */
const DEFAULT_DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Demo user ID from env (valid only when DEMO mode or tests).
 * When in DEMO mode and DEMO_USER_ID is not set, returns default so app works with anon key only.
 */
export function getDemoUserId(): string | undefined {
  const id = process.env.DEMO_USER_ID || (getAppMode() === 'DEMO' ? DEFAULT_DEMO_USER_ID : undefined)
  return id && UUID_REGEX.test(id) ? id : undefined
}
