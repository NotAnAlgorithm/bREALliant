import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { LearningMetrics } from '../components/metrics/LearningMetrics'
import { useAuth } from '../hooks/useAuth'
import { displayUsername } from '../lib/auth/profile'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function Account() {
  const { user, profile, loading, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading account…</p>
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: '/account' }} />
  }

  const username = displayUsername(profile, user)
  const email = profile?.email ?? user.email ?? '—'
  const memberSince = profile?.created_at ?? user.created_at

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-ink">Account</h1>
        <p className="text-sm text-ink-muted">
          Your progress and reviews are tied to this account.
        </p>
      </div>

      <LearningMetrics />

      <dl className="divide-y divide-border rounded-xl border border-border bg-surface-elevated shadow-sm">
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-ink-muted">Username</dt>
          <dd className="text-sm text-ink sm:col-span-2">{username ?? '—'}</dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-ink-muted">Email</dt>
          <dd className="text-sm text-ink sm:col-span-2">{email}</dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-ink-muted">Member since</dt>
          <dd className="text-sm text-ink sm:col-span-2">
            {formatDate(memberSince)}
          </dd>
        </div>
      </dl>

      {!profile ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Progress saving requires the database tables from{' '}
          <code className="rounded bg-amber-100 px-1">
            supabase/migrations/001_initial.sql
          </code>
          . Run that migration in the Supabase SQL editor if you have not yet.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-surface-elevated px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          Back to course
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
