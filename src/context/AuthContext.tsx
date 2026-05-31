import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from 'oidc-client-ts'
import {
  getUserManager,
  isAuthConfigured,
  login as startLogin,
  logout as startLogout,
  userDisplayName,
} from '../services/auth'
import { pingHealth, setAccessTokenProvider } from '../services/signApi'

interface AuthState {
  /**
   * Whether login is offered at all: backend + OIDC vars configured AND the
   * backend `/health` ping succeeded. A configured-but-unreachable backend
   * keeps the login UI hidden (spec: "leer oder unerreichbar → UI erscheint
   * nicht").
   */
  configured: boolean
  user: User | null
  isAuthenticated: boolean
  displayName: string
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authConfigured = isAuthConfigured()
  const [user, setUser] = useState<User | null>(null)
  // Hidden until /health confirms the backend is reachable. Unreachable or
  // unconfigured => login UI never appears; the core app is unaffected.
  const [backendAvailable, setBackendAvailable] = useState(false)

  // Probe backend availability once. No-op (stays hidden) when unconfigured.
  useEffect(() => {
    if (!authConfigured) return
    const ctrl = new AbortController()
    pingHealth(ctrl.signal).then((health) => {
      setBackendAvailable(health !== null)
    })
    return () => ctrl.abort()
  }, [authConfigured])

  const configured = authConfigured && backendAvailable

  // Load the persisted user once and subscribe to oidc-client-ts events.
  // When unconfigured this effect does nothing — no manager, no requests.
  useEffect(() => {
    const mgr = getUserManager()
    if (!mgr) return

    let active = true
    mgr.getUser().then((u) => {
      if (active) setUser(u && !u.expired ? u : null)
    })

    const onLoaded = (u: User) => setUser(u)
    const onUnloaded = () => setUser(null)
    const onExpired = () => setUser(null)

    mgr.events.addUserLoaded(onLoaded)
    mgr.events.addUserUnloaded(onUnloaded)
    mgr.events.addAccessTokenExpired(onExpired)

    return () => {
      active = false
      mgr.events.removeUserLoaded(onLoaded)
      mgr.events.removeUserUnloaded(onUnloaded)
      mgr.events.removeAccessTokenExpired(onExpired)
    }
  }, [])

  // Expose the current access token to the framework-free signApi.
  useEffect(() => {
    setAccessTokenProvider(() => user?.access_token ?? null)
    return () => setAccessTokenProvider(null)
  }, [user])

  const value: AuthState = {
    configured,
    user,
    isAuthenticated: !!user && !user.expired,
    displayName: userDisplayName(user),
    login: () => {
      void startLogin()
    },
    logout: () => {
      void startLogout()
    },
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    // Safe default so consumers never crash when the provider is absent.
    return {
      configured: false,
      user: null,
      isAuthenticated: false,
      displayName: '',
      login: () => {},
      logout: () => {},
    }
  }
  return ctx
}
