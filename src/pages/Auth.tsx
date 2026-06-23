import { isSupabaseConfigured } from '../lib/supabase'

export function Auth() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
        <p className="text-sm text-ink-muted">
          Email + username auth ships in Phase 5.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-sm">
        {!isSupabaseConfigured ? (
          <p className="text-sm text-ink-muted">
            Add <code className="rounded bg-surface px-1">VITE_SUPABASE_URL</code>{' '}
            and{' '}
            <code className="rounded bg-surface px-1">
              VITE_SUPABASE_PUBLISHABLE_KEY
            </code>{' '}
            to a <code className="rounded bg-surface px-1">.env</code> file to
            connect Supabase.
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            Supabase is connected. Auth forms coming in Phase 5.
          </p>
        )}
      </div>
    </div>
  )
}
