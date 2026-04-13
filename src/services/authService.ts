const ISSUER_KEY = 'uav-oidc:issuer'
const CLIENT_ID_KEY = 'uav-oidc:client_id'

export interface OidcSettings {
  issuer: string
  clientId: string
}

export function getOidcSettings(): OidcSettings | null {
  const issuer = localStorage.getItem(ISSUER_KEY)
  const clientId = localStorage.getItem(CLIENT_ID_KEY)
  if (!issuer || !clientId) return null
  return { issuer, clientId }
}

export function setOidcSettings(issuer: string, clientId: string): void {
  localStorage.setItem(ISSUER_KEY, issuer)
  localStorage.setItem(CLIENT_ID_KEY, clientId)
}

export function clearOidcSettings(): void {
  localStorage.removeItem(ISSUER_KEY)
  localStorage.removeItem(CLIENT_ID_KEY)
}

export function isOidcConfigured(): boolean {
  const issuer = localStorage.getItem(ISSUER_KEY)
  return !!issuer && issuer.trim().length > 0
}
