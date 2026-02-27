import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceRoleClientIfAvailable } from '@server/db/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // Use the proxy URL if set — must match what the browser client uses so the
  // PKCE code verifier cookie key prefix (derived from the URL) is identical.
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Check if user needs onboarding using the service role client (direct, reliable).
  // Only redirect when the profile is confirmed to have no display_name — if the
  // query fails for any reason we default to letting the user through to home.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const service = getServiceRoleClientIfAvailable()
    if (service) {
      const { data: profile, error: profileError } = await service
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (!profileError && !profile?.display_name) {
        const onboardingUrl = new URL('/onboarding', origin)
        const redirectResponse = NextResponse.redirect(onboardingUrl)
        // Copy auth cookies to the redirect response (preserving all cookie options)
        response.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
    }
  }

  return response
}
