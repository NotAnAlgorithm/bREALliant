import { Link, Outlet } from 'react-router-dom'

import { isSupabaseConfigured } from '../../lib/supabase'

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-surface-elevated">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight text-ink">
            bREALliant
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              to="/auth"
              className="text-ink-muted transition-colors hover:text-brand"
            >
              Sign in
            </Link>
          </nav>
        </div>
        {!isSupabaseConfigured && (
          <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
            Supabase not configured — copy{' '}
            <code className="rounded bg-amber-100 px-1">.env.example</code> to{' '}
            <code className="rounded bg-amber-100 px-1">.env</code> when ready
          </p>
        )}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
