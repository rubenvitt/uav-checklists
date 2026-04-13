import { createContext, useContext } from 'react'

export interface AuthState {
  isAuthenticated: boolean
  user: { name: string; email: string } | null
  accessToken: string | undefined
  login: () => void
  logout: () => void
  loading: boolean
}

const noop = () => {}

export const devAuthState: AuthState = {
  isAuthenticated: true,
  user: { name: 'Dev User', email: 'dev@localhost' },
  accessToken: undefined,
  login: noop,
  logout: noop,
  loading: false,
}

export const AuthStateContext = createContext<AuthState>(devAuthState)

export function useAuth(): AuthState {
  return useContext(AuthStateContext)
}
