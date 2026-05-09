import { useAuth } from '../hooks/useAuth'
import { isOidcConfigured } from '../services/authService'

export default function AuthStatus() {
  const { isAuthenticated, user, login, logout, loading } = useAuth()

  if (!isOidcConfigured()) {
    return null
  }

  if (loading) {
    return (
      <span className="text-sm text-text-muted">Wird geladen...</span>
    )
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        className="rounded-lg bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-95"
      >
        Anmelden
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {user && (
        <span className="text-sm text-text-muted">{user.name}</span>
      )}
      <button
        onClick={logout}
        className="rounded-lg bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-alt hover:text-text active:scale-95"
      >
        Abmelden
      </button>
    </div>
  )
}
