'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || 'PUBLIC'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { signInWithOtp, signInWithGoogle, isAuthenticated, isDemo } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'
  const errorParam = searchParams.get('error')

  const shouldRedirect = APP_MODE === 'DEMO' || isDemo || isAuthenticated

  useEffect(() => {
    if (shouldRedirect) {
      router.replace(returnTo)
    }
  }, [shouldRedirect, returnTo, router])

  const handleMagicLink = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email.' })
      return
    }
    setLoading(true)
    const { error } = await signInWithOtp(email.trim())
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to send magic link.' })
      return
    }
    setMessage({
      type: 'success',
      text: 'Check your email for the sign-in link.',
    })
  }, [email, signInWithOtp])

  const handleGoogle = useCallback(async () => {
    setMessage(null)
    setLoading(true)
    const { error } = await signInWithGoogle()
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Google sign-in failed.' })
    }
  }, [signInWithGoogle])

  if (shouldRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use your email for a magic link or sign in with Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorParam && !message && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorParam === 'auth_failed'
                  ? 'Sign-in failed. Please try again.'
                  : errorParam === 'missing_code'
                    ? 'Invalid sign-in link. Please request a new one.'
                    : 'An error occurred. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleMagicLink} className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              aria-label="Email address"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send magic link'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
              <span className="bg-card px-2">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleGoogle}
          >
            Sign in with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-foreground">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}
