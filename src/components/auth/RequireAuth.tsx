import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'

type RequireAuthProps = {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <p className="text-center text-sm text-ink-muted">Loading session…</p>
    )
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }

  return children
}
