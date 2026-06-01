import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { completeLogin, isAuthConfigured } from '../services/auth'

/**
 * OIDC redirect target. Completes the Authorization-Code+PKCE exchange and
 * returns the user to the overview. When auth is not configured (e.g. the
 * route is hit without env vars), it simply redirects home.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  // One-shot guard: the OIDC code/state can only be redeemed once. Under
  // React StrictMode the effect double-invokes in dev; without this guard the
  // second call fails and briefly flashes the German error even on success.
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!isAuthConfigured()) {
      navigate('/', { replace: true })
      return
    }
    completeLogin()
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('Die Anmeldung konnte nicht abgeschlossen werden.'))
  }, [navigate])

  return (
    <div className="min-h-screen bg-base text-text">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 p-4 text-center">
        {error ? (
          <>
            <p className="text-sm text-warning">{error}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="rounded-lg bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
            >
              Zur Übersicht
            </button>
          </>
        ) : (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-alt border-t-text" />
            <p className="text-sm text-text-muted">Anmeldung wird abgeschlossen…</p>
          </>
        )}
      </div>
    </div>
  )
}
