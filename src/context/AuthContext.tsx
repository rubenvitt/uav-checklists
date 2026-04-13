import { useEffect } from 'react'
import { AuthProvider as OidcAuthProvider, useAuth as useOidcAuth } from 'react-oidc-context'
import type { ReactNode } from 'react'
import { getOidcSettings, isOidcConfigured } from '../services/authService'
import { AuthStateContext, devAuthState } from '../hooks/useAuth'
import type { AuthState } from '../hooks/useAuth'

function OidcAuthBridge({ children }: { children: ReactNode }) {
  const oidc = useOidcAuth()

  useEffect(() => {
    if (oidc.isLoading) return
    // Clear URL params after the OIDC callback redirect is handled
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [oidc.isLoading])

  const authState: AuthState = {
    isAuthenticated: oidc.isAuthenticated,
    user: oidc.user
      ? {
          name: oidc.user.profile.name ?? oidc.user.profile.preferred_username ?? '',
          email: oidc.user.profile.email ?? '',
        }
      : null,
    accessToken: oidc.user?.access_token,
    login: () => oidc.signinRedirect(),
    logout: () => oidc.signoutRedirect(),
    loading: oidc.isLoading,
  }

  return (
    <AuthStateContext value={authState}>
      {children}
    </AuthStateContext>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isOidcConfigured()) {
    return (
      <AuthStateContext value={devAuthState}>
        {children}
      </AuthStateContext>
    )
  }

  const settings = getOidcSettings()!

  const oidcConfig = {
    authority: settings.issuer,
    client_id: settings.clientId,
    redirect_uri: window.location.origin,
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
  }

  return (
    <OidcAuthProvider {...oidcConfig}>
      <OidcAuthBridge>{children}</OidcAuthBridge>
    </OidcAuthProvider>
  )
}
