/**
 * OIDC (PocketID) auth wiring — Authorization Code + PKCE, public client
 * (no client secret in the browser), via `oidc-client-ts`.
 *
 * Login is OPTIONAL and only meaningful when the signature backend is
 * configured (`VITE_SIGN_API_URL`). The OIDC vars (`VITE_OIDC_AUTHORITY`,
 * `VITE_OIDC_CLIENT_ID`) gate whether a {@link UserManager} can be built at
 * all; absent vars simply mean "login unavailable" — never a crash.
 *
 * Framework-free: no React import here.
 */
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'
import { isSignApiConfigured } from './signApi'

const AUTHORITY = import.meta.env.VITE_OIDC_AUTHORITY as string | undefined
const CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined

/**
 * Group whose members are treated as admins. Used only for the client-side
 * fallback when the backend `GET /me` is unavailable; the backend remains the
 * source of truth. Mirrors the backend default (`ADMIN_GROUP=uav-admins`).
 */
const ADMIN_GROUP =
  (import.meta.env.VITE_OIDC_ADMIN_GROUP as string | undefined)?.trim() || 'uav-admins'

/** Redirect path the OIDC provider returns to (registered in the router). */
export const OIDC_CALLBACK_PATH = '/auth/callback'

/**
 * Login is only offered when the backend is configured AND the OIDC client
 * settings are present. Missing OIDC vars => login simply unavailable.
 */
export function isAuthConfigured(): boolean {
  return (
    isSignApiConfigured() &&
    !!AUTHORITY &&
    AUTHORITY.trim() !== '' &&
    !!CLIENT_ID &&
    CLIENT_ID.trim() !== ''
  )
}

let manager: UserManager | null = null

/** Lazily builds the singleton UserManager, or `null` when unconfigured. */
export function getUserManager(): UserManager | null {
  if (!isAuthConfigured()) return null
  if (manager) return manager
  manager = new UserManager({
    authority: AUTHORITY!.trim(),
    client_id: CLIENT_ID!.trim(),
    redirect_uri: `${window.location.origin}${OIDC_CALLBACK_PATH}`,
    post_logout_redirect_uri: window.location.origin,
    response_type: 'code',
    scope: 'openid profile email groups',
    // PKCE is the default for a public client; no client secret involved.
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  })
  return manager
}

/** Display name for a logged-in user (German-friendly fallbacks). */
export function userDisplayName(user: User | null): string {
  if (!user) return ''
  const p = user.profile
  return (
    (p?.name as string | undefined) ??
    (p?.preferred_username as string | undefined) ??
    (p?.email as string | undefined) ??
    (p?.sub as string | undefined) ??
    'Angemeldet'
  )
}

/**
 * Client-side admin check from the OIDC profile's `groups` claim. Used as a
 * fallback when the backend `GET /me` is unavailable (the backend is the
 * source of truth). Tolerates `groups` being absent or a single string.
 */
export function isAdminFromProfile(user: User | null): boolean {
  if (!user) return false
  const raw = (user.profile as { groups?: unknown } | undefined)?.groups
  const groups = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  return groups.includes(ADMIN_GROUP)
}

/** Starts the redirect login flow. No-op when unconfigured. */
export async function login(): Promise<void> {
  await getUserManager()?.signinRedirect()
}

/** Completes the redirect login (called on the callback route). */
export async function completeLogin(): Promise<User | null> {
  const mgr = getUserManager()
  if (!mgr) return null
  return mgr.signinRedirectCallback()
}

/** Logs out (redirect) and clears local state. */
export async function logout(): Promise<void> {
  const mgr = getUserManager()
  if (!mgr) return
  try {
    await mgr.signoutRedirect()
  } catch {
    // Provider may not support RP-initiated logout — fall back to local clear.
    await mgr.removeUser()
    window.location.replace('/')
  }
}
