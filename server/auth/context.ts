import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAppMode, getDemoUserId } from '@lib/config'
import { getServiceRoleClient } from '@server/db/supabase'

export interface UserContext {
  userId: string
  email: string | null
  isMaster: boolean
  isDemo: boolean
  roles: string[]
}

const DEMO_EMAIL = 'demo@expense-tracker.app'

/**
 * Resolves the current user from the request (session or DEMO mode).
 * Returns null if unauthenticated (PUBLIC/MASTER mode with no session).
 */
export async function getCurrentUser(request: NextRequest): Promise<UserContext | null> {
  const appMode = getAppMode()

  if (appMode === 'DEMO') {
    const demoUserId = getDemoUserId()
    if (!demoUserId) {
      throw new Error('DEMO mode requires DEMO_USER_ID environment variable.')
    }
    return {
      userId: demoUserId,
      email: DEMO_EMAIL,
      isMaster: false,
      isDemo: true,
      roles: ['user'],
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const cookieStore = await import('next/headers').then((m) => m.cookies())
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const roles = await getRolesForUser(user.id)
  const isMaster =
    appMode === 'MASTER' || roles.includes('master')

  return {
    userId: user.id,
    email: user.email ?? null,
    isMaster,
    isDemo: false,
    roles,
  }
}

async function getRolesForUser(userId: string): Promise<string[]> {
  try {
    const service = getServiceRoleClient()
    const { data: rows } = await service
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)

    if (!rows?.length) {
      return ['user']
    }

    type RoleRow = { roles: { name: string } | { name: string }[] | null }
    const names = (rows as RoleRow[]).flatMap((r) => {
      const roles = r.roles
      if (!roles) return []
      return Array.isArray(roles) ? roles.map((x) => x.name) : [roles.name]
    }).filter((n): n is string => Boolean(n))
    return names.length ? names : ['user']
  } catch {
    return ['user']
  }
}

/**
 * Returns the current user or throws an error that results in 401.
 */
export async function requireAuth(request: NextRequest): Promise<UserContext> {
  const user = await getCurrentUser(request)
  if (!user) {
    const err = new Error('Authentication required') as Error & { status?: number; code?: string }
    err.status = 401
    err.code = 'AUTH_REQUIRED'
    throw err
  }
  return user
}

/**
 * Phase 1: Stub – allows all for authenticated user; master always allowed.
 * Future: Query role_permissions and throw 403 if no permission.
 */
export async function requirePermission(
  user: UserContext,
  _resource: string,
  _action: string
): Promise<void> {
  if (user.isMaster) return
  // Phase 1: All authenticated users can do basic operations
  // Future: check role_permissions and throw { status: 403, code: 'FORBIDDEN' }
}

/**
 * Synthetic context for cron/job runners (no request user). Use only when request is already
 * authorized (e.g. CRON_SECRET). Services will use master access (see all data).
 */
export function getCronUserContext(): UserContext {
  return {
    userId: '',
    email: null,
    isMaster: true,
    isDemo: false,
    roles: ['master'],
  }
}
