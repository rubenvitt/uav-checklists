import { useContext } from 'react'
import { AuthContext, type AuthState } from './authContextValue'

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    // Safe default so consumers never crash when the provider is absent.
    return {
      configured: false,
      user: null,
      isAuthenticated: false,
      displayName: '',
      isAdmin: false,
      login: () => {},
      logout: () => {},
    }
  }
  return ctx
}
