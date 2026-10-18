/**
 * Gemeinsamer Zugriff auf das OIDC-Zugriffstoken für die framework-freien
 * Clients (Signatur-Backend, Suchlage). Der AuthProvider registriert den
 * Lieferanten; ohne Anmeldung liefert er `null`.
 */
let accessTokenProvider: (() => string | null) | null = null

export function setAccessTokenProvider(provider: (() => string | null) | null): void {
  accessTokenProvider = provider
}

export function getAccessToken(): string | null {
  return accessTokenProvider?.() ?? null
}
