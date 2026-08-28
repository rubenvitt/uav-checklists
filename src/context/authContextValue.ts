import { createContext } from 'react'
import type { User } from 'oidc-client-ts'

export interface AuthState {
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
  /**
   * Whether the current user is an admin. Sourced from the backend `GET /me`
   * (authoritative) once logged in; falls back to the OIDC `groups` claim when
   * `/me` is unavailable. `false` when logged out or unconfigured.
   */
  isAdmin: boolean
  login: () => void
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
