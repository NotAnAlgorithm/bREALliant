import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { displayUsername } from '../../lib/auth/profile'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { loadStreak } from '../../services/progress'
import { ThemeToggle } from './ThemeToggle'

export function AppLayout() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    if (!user || !supabase) return

    loadStreak(supabase, user.id)
      .then(setStreak)
      .catch(() => setStreak(null))
  }, [user])

  const username = displayUsername(profile, user)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight text-ink">
            bREALliant
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <ThemeToggle />
            {loading ? (
              <span className="text-ink-muted">…</span>
            ) : user ? (
              <>
                {streak !== null && streak > 0 ? (
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                    {streak} day streak
                  </span>
                ) : null}
                <Link
                  to="/account"
                  className="font-medium text-ink transition-colors hover:text-brand"
                >
                  {username ?? 'Account'}
                </Link>
              </>
            ) : (
              <Link
                to="/auth"
                className="text-ink-muted transition-colors hover:text-brand"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
        {!isSupabaseConfigured && (
          <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
            Supabase not configured — copy{' '}
            <code className="rounded bg-amber-100 px-1">.env.example</code> to{' '}
            <code className="rounded bg-amber-100 px-1">.env</code> when ready
          </p>
        )}
        {!loading && isSupabaseConfigured && !user && (
          <p className="bg-brand/5 px-4 py-1.5 text-center text-xs text-brand">
            Sign in to save progress and track your streak
          </p>
        )}
      </header>
      <main
        key={location.pathname}
        className="animate-page-in mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6"
      >
        <Outlet />
      </main>
    </div>
  )
}
