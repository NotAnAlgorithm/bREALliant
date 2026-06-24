import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

type AuthMode = 'signin' | 'signup'

export function Auth() {
  const { user, signIn, signUp } = useAuth()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<AuthMode>('signin')
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    const result =
      mode === 'signin'
        ? await signIn(login, password)
        : await signUp(email, password, username)

    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }

    if (mode === 'signup') {
      const signupResult = result as Awaited<ReturnType<typeof signUp>>
      if (signupResult.message) {
        setInfo(signupResult.message)
      }
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
    setInfo(null)
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-ink">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="text-sm text-ink-muted">
          {mode === 'signin'
            ? 'Use your email or username to continue where you left off.'
            : 'Pick a username to track progress and streaks.'}
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-sm">
          <p className="text-sm text-ink-muted">
            Add Supabase env vars to <code className="rounded bg-surface px-1">.env</code>{' '}
            and run the SQL migration in{' '}
            <code className="rounded bg-surface px-1">supabase/migrations/</code>.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-surface-elevated p-6 shadow-sm"
        >
          {mode === 'signup' ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">Username</span>
              <input
                type="text"
                required
                minLength={2}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          ) : null}

          {mode === 'signin' ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">
                Email or username
              </span>
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
              className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          {info ? (
            <p className="text-sm text-brand" role="status">
              {info}
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Sign up'}
          </button>

          <p className="text-center text-sm text-ink-muted">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-brand hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-brand hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      )}

      <p className="text-center text-sm">
        <Link to="/" className="text-brand hover:underline">
          ← Back to course path
        </Link>
      </p>
    </div>
  )
}
