import 'dotenv/config';

/**
 * Environment-driven configuration for the signature backend.
 *
 * All values are read once at process start. Tests construct the app via the
 * `createApp(deps)` factory and inject their own DB / JWKS, so they do not
 * depend on these globals.
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

export interface ServerConfig {
  /** TCP port the HTTP server listens on. */
  port: number;
  /** OIDC issuer URL (PocketID). Used to validate the `iss` claim. */
  oidcIssuer: string;
  /** JWKS endpoint of the OIDC issuer. Defaults to `${issuer}/.well-known/jwks.json`. */
  oidcJwksUrl: string;
  /** OIDC userinfo endpoint. Defaults to `${issuer}/api/oidc/userinfo`. */
  oidcUserinfoUrl: string;
  /** Expected `aud` claim of the access token (the API audience / client id). */
  oidcAudience: string;
  /** Group name that grants admin access (archive listing/download). */
  adminGroup: string;
  /** Filesystem path to the persisted SQLite database. */
  dbPath: string;
  /** Filesystem path to the Ed25519 signing key (PKCS#8 PEM). Generated if absent. */
  signingKeyPath: string;
  /** Directory in which archived PDFs are stored on disk. */
  archiveDir: string;
  /** Allowed CORS origin for the SPA (e.g. https://app.example.com). */
  corsOrigin: string;
}

export function loadConfig(): ServerConfig {
  const oidcIssuer = required('OIDC_ISSUER');
  const issuerNoSlash = oidcIssuer.replace(/\/$/, '');
  const defaultJwks = `${issuerNoSlash}/.well-known/jwks.json`;
  const defaultUserinfo = `${issuerNoSlash}/api/oidc/userinfo`;
  return {
    port: Number(optional('PORT', '8787')),
    oidcIssuer,
    oidcJwksUrl: optional('OIDC_JWKS_URL', defaultJwks),
    oidcUserinfoUrl: optional('OIDC_USERINFO_URL', defaultUserinfo),
    oidcAudience: required('OIDC_AUDIENCE'),
    adminGroup: optional('ADMIN_GROUP', 'uav-admins'),
    dbPath: optional('DB_PATH', './data/signatures.db'),
    signingKeyPath: optional('SIGNING_KEY_PATH', './data/signing-key.pem'),
    archiveDir: optional('ARCHIVE_DIR', './data/archive'),
    corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
  };
}
