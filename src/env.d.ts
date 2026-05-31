/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the optional signature backend. Empty/undefined disables all
   *  e-signature and login features (graceful degradation). */
  readonly VITE_SIGN_API_URL?: string
  /** PocketID OIDC issuer/authority URL (login only available when set). */
  readonly VITE_OIDC_AUTHORITY?: string
  /** PocketID public client id (Authorization Code + PKCE). */
  readonly VITE_OIDC_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
