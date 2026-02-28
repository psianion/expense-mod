import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { profileRepository } from '@server/db/repositories/profile.repo'
import { createServiceLogger } from '@/server/lib/logger'

const log = createServiceLogger('AuthCallback')

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // Use the proxy URL if set — must match what the browser client uses so the
  // PKCE code verifier cookie key prefix (derived from the URL) is identical.
  // If the prefixes differ, exchangeCodeForSession fails with pkce_code_verifier_not_found.
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/login?error=config`)
  }

  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    log.error({ method: 'GET', err: exchangeError }, 'exchangeCodeForSession failed')
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Check if user needs onboarding via service role (direct, reliable).
  // Fail-open: if the lookup errors for any reason other than "no row", let the user through.
  const { data: { user }, error: getUserError } = await supabase.auth.getUser()
  if (getUserError) {
    log.error({ method: 'GET', err: getUserError }, 'getUser() failed after session exchange')
    return response
  }

  if (user) {
    try {
      const profile = await profileRepository.getProfile(user.id)
      const needsOnboarding = !profile?.display_name

      if (needsOnboarding) {
        const onboardingUrl = new URL('/onboarding', origin)
        const redirectResponse = NextResponse.redirect(onboardingUrl)
        // Copy auth cookies to the onboarding redirect, preserving all cookie options.
        response.cookies.getAll().forEach(({ name, value, ...options }) => {
          redirectResponse.cookies.set(name, value, options)
        })
        return redirectResponse
      }
    } catch (profileErr) {
      // Log but default to letting the user through — client-side guards still apply.
      log.error({ method: 'GET', err: profileErr }, 'Profile lookup failed, defaulting to home')
    }
  }

  return response
}
